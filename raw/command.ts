// export class HuaweiCommandProcessor implements CommandProcessor {
// 	private createVariableGuard =
// 		(requiredVars: string[], context: string) =>
// 		(variables: Record<string, unknown>) => {
// 			try {
// 				const missingVars = requiredVars.filter((varName) =>
// 					isNullish(get(variables, varName)),
// 				);

// 				if (missingVars.length > 0) {
// 					throw new Error(
// 						`Required variables are missing for "${context}": ${missingVars.join(", ")}`,
// 					);
// 				}
// 				return variables;
// 			} catch (_err) {
// 				return undefined;
// 			}
// 		};

// 	// Perbaikan signature guard untuk conditional
// 	private createConditionalGuard =
// 		(logic: VariableCondition, key: string) =>
// 		(variables: Record<string, unknown>) => {
// 			try {
// 				const condition = get(variables, logic.condition, false);
// 				if (condition) {
// 					const requiredVars = this.extractRequiredVariables(logic.trueValue);
// 					const missingVars = requiredVars.filter((varName) =>
// 						isNullish(get(variables, varName)),
// 					);
// 					if (missingVars.length > 0) {
// 						throw new Error(
// 							`Condition "${logic.condition}" is true but required variables are missing for "${key}": ${missingVars.join(", ")}`,
// 						);
// 					}
// 				}
// 				return variables;
// 			} catch (_err) {
// 				return undefined;
// 			}
// 		};

// 	// processTemplate(
// 	// 	templateStr: string,
// 	// 	variables: Record<string, unknown>,
// 	// ): string {
// 	// 	if (isNullish(templateStr) || isEmpty(variables)) {
// 	// 		throw new Error("Invalid template or variables");
// 	// 	}
// 	// 	return template(templateStr, variables);
// 	// }

// 	processTemplate(
// 		templateStr: string,
// 		variables: Record<string, unknown>,
// 	): string {
// 		if (isNullish(templateStr) || isEmpty(variables)) {
// 			throw new Error("Invalid template or variables");
// 		}

// 		// Extract required variables dari template
// 		const requiredVars = this.extractRequiredVariables(templateStr);

// 		try {
// 			const missingVars = requiredVars.filter((varName) =>
// 				isNullish(get(variables, varName)),
// 			);

// 			if (missingVars.length > 0) {
// 				throw new Error(
// 					`Missing required variables in template: ${missingVars.join(", ")}`,
// 				);
// 			}

// 			return template(templateStr, variables);
// 		} catch (error) {
// 			// console.error(error);
// 			throw new Error(`Error ${error}`);
// 		}
// 	}

// 	private validateConditionalLogic(
// 		logic: VariableCondition,
// 		variables: Record<string, unknown>,
// 		key: string,
// 	): void {
// 		const condition = get(variables, logic.condition, false);
// 		if (condition) {
// 			// Jika kondisi true, cek apakah variable yang dibutuhkan dalam trueValue ada
// 			const requiredVars = this.extractRequiredVariables(logic.trueValue);
// 			const missingVars = requiredVars.filter((varName) =>
// 				isNullish(get(variables, varName)),
// 			);
// 			if (missingVars.length > 0) {
// 				throw new Error(
// 					`Condition "${logic.condition}" is true but required variables are missing for "${key}": ${missingVars.join(", ")}`,
// 				);
// 			}
// 		}
// 	}

// 	private extractRequiredVariables(template: string): string[] {
// 		const matches = template.match(/{{([^}]+)}}/g) || [];
// 		return matches.map((match) => match.slice(2, -2)); // 2 karena {{ }}
// 	}

// 	private isConditional(value: VariableLogic): value is VariableCondition {
// 		return value.type === "conditional";
// 	}

// 	private processConditional(
// 		value: VariableCondition,
// 		variables: Record<string, unknown>,
// 		key: string,
// 	): string {
// 		this.validateConditionalLogic(value, variables, key);
// 		const condition = get(variables, value.condition, false);
// 		return template(condition ? value.trueValue : value.falseValue, variables);
// 	}

// 	private processSwitch(
// 		value: VariableSwitch,
// 		variables: Record<string, unknown>,
// 		key: string,
// 	): string {
// 		const switchValue = String(get(variables, value.variable, ""));
// 		const caseValue = value.cases[switchValue] || value.cases.default;

// 		if (typeof caseValue === "string") {
// 			return template(caseValue, variables);
// 		}

// 		// Handle nested conditional dalam case
// 		this.validateConditionalLogic(caseValue, variables, key);
// 		const nestedCondition = get(variables, caseValue.condition, false);
// 		return template(
// 			nestedCondition ? caseValue.trueValue : caseValue.falseValue,
// 			variables,
// 		);
// 	}

// 	processVariableLogic(
// 		logic: Record<string, VariableLogic>,
// 		variables: Record<string, unknown>,
// 	): Record<string, string> {
// 		const validateBaseVariables = this.createVariableGuard(
// 			this.extractRequiredVariables(JSON.stringify(logic)),
// 			"base variables",
// 		);

// 		const guardedVars = validateBaseVariables(variables) ?? variables;

// 		return mapValues(logic, (value, key) => {
// 			if (this.isConditional(value)) {
// 				const validateConditional = this.createConditionalGuard(value, key);
// 				const validatedVars = validateConditional(guardedVars) ?? guardedVars;
// 				return this.processConditional(value, validatedVars, key);
// 			}
// 			return this.processSwitch(value, guardedVars, key);
// 		});
// 	}
// }
