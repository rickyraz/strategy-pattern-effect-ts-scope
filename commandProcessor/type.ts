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
export interface ServicePort {
	vlan?: string | number;
	user_vlan?: string | number;
	svlan?: string | number;
	tls_vlan?: string | number;
}

// export type Variables = Record<
// 	string,
// 	string | number | boolean | string[] | ServicePort[]
// >;

type VariableValue = string | number | boolean | string[] | ServicePort[];
export type Variables = Record<string, VariableValue>;
