export type VariableCondition = {
	type: "conditional";
	condition: string;
	trueValue: string;
	falseValue: string;
};

export type SwitchCase = string | VariableCondition;

export type VariableSwitch = {
	type: "switch";
	variable: string;
	cases: Record<string, SwitchCase>;
};

export type VariableLogic = VariableCondition | VariableSwitch;

// --------

export type CommandType = "CREATE" | "UPDATE" | "DELETE";

export type CommandTemplate = {
	name: string;
	type: CommandType;
	description: string;
	template: string;
	variableLogic: Record<string, VariableLogic>;
};

export interface CommandProcessor {
	processTemplate(template: string, variables: Record<string, unknown>): string;
	processVariableLogic(
		logic: Record<string, VariableLogic>,
		variables: Record<string, unknown>,
	): Record<string, string>;
}

export type Variables = Record<string, string | number | boolean>;
