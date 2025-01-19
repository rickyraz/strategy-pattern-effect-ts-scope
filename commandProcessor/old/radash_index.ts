import { Effect } from "effect";
import {
	template,
	get,
	isNullish,
	isEmpty,
	mapValues,
} from "@radashi-org/radashi";
import type {
	CommandTemplate,
	VariableLogic,
	Variables,
	CommandProcessor,
	VariableCondition,
	VariableSwitch,
} from "../type.ts";

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

	// Effect untuk validasi conditional
	private validateConditional = (
		value: VariableCondition,
		variables: Record<string, unknown>,
		key: string,
	): Effect.Effect<string, Error> => {
		const requiredVars = this.extractRequiredVariables(value.trueValue);

		return Effect.gen(function* (_) {
			const condition = get(variables, value.condition, false);

			if (condition) {
				const missingVars = requiredVars.filter((varName: string) =>
					isNullish(get(variables, varName)),
				);

				if (missingVars.length > 0) {
					yield* Effect.fail(
						new Error(
							`Missing variables for "${key}": ${missingVars.join(", ")}`,
						),
					);
				}
			}

			const templateStr = condition ? value.trueValue : value.falseValue;
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

	// Process variable logic dengan Effect
	processVariableLogic(
		logic: Record<string, VariableLogic>,
		variables: Record<string, unknown>,
	): Record<string, string> {
		return mapValues(logic, (value, key) => {
			if (this.isConditional(value)) {
				const program = this.validateConditional(value, variables, key);

				return Effect.runSync(
					Effect.catchAll(program, (error) => {
						console.error("Conditional validation failed:", error);
						return Effect.succeed("");
					}),
				);
			}
			return this.processSwitch(value, variables, key);
		});
	}
}
// Context class tetap sama
export class CommandExecutor {
	private processor: CommandProcessor;
	private commands: Map<string, CommandTemplate>;

	constructor(processor: CommandProcessor) {
		this.processor = processor;
		this.commands = new Map();
	}

	addCommand(command: CommandTemplate): void {
		this.commands.set(command.name, command);
	}

	executeCommand(commandName: string, variables: Variables): string {
		const command = this.commands.get(commandName);
		if (!command) {
			throw new Error(`Command ${commandName} not found`);
		}

		const processedVariables = this.processor.processVariableLogic(
			command.variableLogic,
			variables,
		);

		return this.processor.processTemplate(command.template, {
			...variables,
			...processedVariables,
		});
	}

	executeCommandAsArray(commandName: string, variables: Variables): string[] {
		const output = this.executeCommand(commandName, variables);
		return output
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean); // Remove empty lines
	}
}
