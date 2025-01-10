// Types
type CommandType = "CREATE" | "UPDATE" | "DELETE";

type VariableCondition = {
	type: "conditional";
	condition: string;
	trueValue: string;
	falseValue: string;
};

type SwitchCase = string | VariableCondition;

type VariableSwitch = {
	type: "switch";
	variable: string;
	cases: Record<string, SwitchCase>;
};

type VariableLogic = VariableCondition | VariableSwitch;

type CommandTemplate = {
	name: string;
	type: CommandType;
	description: string;
	template: string;
	variableLogic: Record<string, VariableLogic>;
};

type Variables = Record<string, string | number | boolean>;

// Strategy Interface
interface CommandProcessor {
	processTemplate(template: string, variables: Variables): string;
	processVariableLogic(
		logic: Record<string, VariableLogic>,
		variables: Variables,
	): Record<string, string>;
}

// Concrete Strategy
class HuaweiCommandProcessor implements CommandProcessor {
	processTemplate(template: string, variables: Variables): string {
		let result = template;
		for (const [key, value] of Object.entries(variables)) {
			const regex = new RegExp(`{${key}}`, "g");
			result = result.replace(regex, String(value));
		}
		return result;
	}

	// private processConditional(
	// 	logic: VariableCondition,
	// 	variables: Variables,
	// ): string {
	// 	return variables[logic.condition] ? logic.trueValue : logic.falseValue;
	// }

	private processConditional(
		logic: VariableCondition,
		variables: Variables,
	): string {
		const value = variables[logic.condition]
			? this.processTemplate(logic.trueValue, variables)
			: this.processTemplate(logic.falseValue, variables);
		return value;
	}

	private processSwitch(logic: VariableSwitch, variables: Variables): string {
		const value = String(variables[logic.variable]);
		let caseValue: SwitchCase;

		// Using type-safe key access
		if (Object.prototype.hasOwnProperty.call(logic.cases, value)) {
			caseValue = logic.cases[value];
		} else {
			caseValue = logic.cases.default;
		}

		if (typeof caseValue === "string") {
			return this.processTemplate(caseValue, variables);
		}
		return this.processConditional(caseValue, variables);
	}

	processVariableLogic(
		logic: Record<string, VariableLogic>,
		variables: Variables,
	): Record<string, string> {
		const result: Record<string, string> = {};

		for (const [key, value] of Object.entries(logic)) {
			if (value.type === "conditional") {
				result[key] = this.processConditional(value, variables);
			} else if (value.type === "switch") {
				result[key] = this.processSwitch(value, variables);
			}
		}

		return result;
	}
}

// Context class
class CommandExecutor {
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
}

// Example usage with proper typing
const processor = new HuaweiCommandProcessor();
const executor = new CommandExecutor(processor);

const ontClientCommand: CommandTemplate = {
	name: "ont-client",
	type: "CREATE",
	description: "Command to create a new ONT client",
	template:
		'enable\nconfig\nundo smart\ninterface gpon {f}/{s}\nont add {p} {{unused_index}} sn-auth "{ont_sn}" omci ont-lineprofile-id {ont_lineprofile} ont-srvprofile-id {ont_srvprofile} desc "{desc}"{native_vlan1}',
	variableLogic: {
		native_vlan1: {
			type: "conditional",
			condition: "hasNativeVlan1",
			trueValue:
				"\nont port native-vlan {p} {{unused_index}} eth 1 vlan {native_vlan1} priority 0",
			falseValue: "",
		},
	},
};

executor.addCommand(ontClientCommand);

const variables: Variables = {
	f: "0",
	s: "1",
	p: "1",
	unused_index: "1",
	ont_sn: "ABCD12345678",
	ont_lineprofile: "1",
	ont_srvprofile: "1",
	desc: "Test ONT",
	hasNativeVlan1: false,
	native_vlan1: "100",
};

const result = executor.executeCommand("ont-client", variables);
console.log(result);
