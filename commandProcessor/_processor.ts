// deno-lint-ignore-file
// import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { Effect } from "effect";
import { template, get, isNullish, isEmpty } from "@radashi-org/radashi";

const VariableConditionSchema = z.object({
	type: z.literal("conditional"),
	condition: z.string(),
	trueValue: z.string(),
	falseValue: z.string(),
}) satisfies z.ZodType<VariableCondition>;

const VariableLogicSchema: z.ZodType<VariableLogic> = z.discriminatedUnion(
	"type",
	[
		VariableConditionSchema,
		z.object({
			type: z.literal("switch"),
			variable: z.string(),
			cases: z.record(
				z.string(),
				z.union([z.string(), VariableConditionSchema]),
			),
		}),
	],
);

const ServicePortSchema = z.object({
	vlan: z.string().optional(),
	user_vlan: z.string().optional(),
	svlan: z.string().optional(),
	tls_vlan: z.string().optional(),
});

const VariablesSchema = z.record(
	z.string(),
	z
		.union([
			z.string().optional(),
			z.number().optional(),
			z.boolean().optional(),
			z.array(ServicePortSchema).optional(),
			z
				.record(z.string(), z.union([z.string(), z.number(), z.undefined()]))
				.optional(),
		])
		.optional(),
);

const CommandTemplateSchema = z.object({
	name: z.string(),
	template: z.string(),
	variableLogic: z.record(z.string(), VariableLogicSchema),
});

interface VariableCondition {
	type: "conditional";
	condition: string;
	trueValue: string;
	falseValue: string;
}
type SwitchCase = string | VariableCondition;
type VariableSwitch = {
	type: "switch";
	variable: string;
	cases: Record<string, SwitchCase>;
};
type VariableLogic = VariableCondition | VariableSwitch;

type CommandTemplate = z.infer<typeof CommandTemplateSchema>;
type Variables = z.infer<typeof VariablesSchema>;

interface CommandProcessor {
	processTemplate(template: string, variables: Record<string, unknown>): string;
	processVariableLogic(
		logic: Record<string, VariableLogic>,
		variables: Record<string, unknown>,
	): Record<string, string>;
}

// ---

// deno-lint-ignore no-explicit-any
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type Commands = any;

export class CommandExecutor {
	private processor: CommandProcessor;
	private commands: Map<string, CommandTemplate>;

	constructor(processor: CommandProcessor) {
		this.processor = processor;
		this.commands = new Map();
	}

	private parseTemplateString(template: unknown): string {
		if (typeof template === "string") {
			try {
				// Remove outer quotes and parse escaped characters
				const parsed = JSON.parse(template);
				return typeof parsed === "string" ? parsed : template;
			} catch {
				return template;
			}
		}
		if (template && typeof template === "object") {
			// Handle template objects/arrays
			if (Array.isArray(template)) {
				return template
					.map((item) => this.parseTemplateString(item))
					.join("\n");
			}

			return JSON.stringify(template);
		}

		return String(template ?? "");
	}

	private convertPrismaCommand(command: Commands): CommandTemplate {
		try {
			// Parse template string properly
			const templateStr = this.parseTemplateString(command.template);

			// Convert variableLogic safely
			const variableLogic =
				typeof command.variableLogic === "string"
					? JSON.parse(command.variableLogic)
					: command.variableLogic;

			const convertedCommand = {
				name: command.name,
				template: templateStr,
				variableLogic: variableLogic as Record<string, VariableLogic>,
			};

			return CommandTemplateSchema.parse(convertedCommand);
		} catch (error) {
			throw new Error(
				`Failed to convert Prisma command: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	addCommand(command: Commands): void {
		try {
			const validCommand = this.convertPrismaCommand(command);
			this.commands.set(validCommand.name, validCommand);
		} catch (error) {
			throw new Error(
				`Invalid command format: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	executeCommand(commandName: string, variablesInput: unknown): string {
		const variables = VariablesSchema.parse(variablesInput);

		const command = this.commands.get(commandName);
		if (!command) {
			throw new Error(`Command ${commandName} not found`);
		}

		const processedVariables = this.processor.processVariableLogic(
			command.variableLogic,
			variables,
		);

		const finalVariables = { ...variables, ...processedVariables };
		return this.processor.processTemplate(command.template, finalVariables);
	}

	executeCommandAsArray(commandName: string, variables: Variables): string[] {
		const output = this.executeCommand(commandName, variables);
		return output
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
	}
}

export class NetworkCommandProcessor implements CommandProcessor {
	// Helper methods
	private extractRequiredVariables(template: string): string[] {
		const matches = template.match(/{{([^}]+)}}/g) || [];
		return matches.map((match) => match.slice(2, -2));
	}

	private isConditional(value: VariableLogic): value is VariableCondition {
		return value.type === "conditional";
	}

	private processSwitch = (
		value: VariableSwitch,
		variables: Record<string, unknown>,
		_key: string,
	): string => {
		const switchValue = String(get(variables, value.variable, ""));
		const caseValue = value.cases[switchValue] || value.cases.default;

		if (typeof caseValue === "string") {
			return template(caseValue, variables);
		}

		const nestedCondition = get(variables, caseValue.condition, false);
		return template(
			nestedCondition ? caseValue.trueValue : caseValue.falseValue,
			variables,
		);
	};

	// Effect untuk validasi template
	private validateTemplate = (
		templateStr: string,
		variables: Record<string, unknown>,
	): Effect.Effect<string, Error> => {
		const requiredVars = this.extractRequiredVariables(templateStr);

		return Effect.gen(function* (_) {
			const missingVars = requiredVars.filter((varName: string) =>
				isNullish(get(variables, varName)),
			);

			if (missingVars.length > 0) {
				yield* Effect.fail(
					new Error(`Missing required variables: ${missingVars.join(", ")}`),
				);
			}

			return yield* Effect.sync(() => template(templateStr, variables));
		});
	};

	// Process template dengan Effect
	processTemplate(
		templateStr: string,
		variables: Record<string, unknown>,
	): string {
		if (isNullish(templateStr) || isEmpty(variables)) {
			throw new Error("Invalid template or variables");
		}

		const program = this.validateTemplate(templateStr, variables);

		return Effect.runSync(
			Effect.catchAll(program, (error) => {
				console.error("Template validation failed:", error);
				// return Effect.succeed(template(templateStr, variables));
				return Effect.succeed(""); // Return string kosong saat error
			}),
		);
	}

	processVariableLogic(
		logic: Record<string, VariableLogic>,
		variables: Record<string, unknown>,
	): Record<string, string> {
		const processedVariables: Record<string, string> = {};

		// Proses configs dalam urutan yang tepat
		for (const key of Object.keys(logic)) {
			const value = logic[key];

			// Skip jika value undefined
			if (!value) continue;

			if (this.isConditional(value)) {
				const condition = get(variables, value.condition, false);
				const templateStr = condition ? value.trueValue : value.falseValue;
				const processed = template(templateStr, {
					...variables,
					...processedVariables,
				});
				processedVariables[key] = processed;
			} else if (value.type === "switch") {
				const result = this.processSwitch(
					value,
					{
						...variables,
						...processedVariables,
					},
					key,
				);
				processedVariables[key] = result;
			}
		}

		return processedVariables;
	}
}
