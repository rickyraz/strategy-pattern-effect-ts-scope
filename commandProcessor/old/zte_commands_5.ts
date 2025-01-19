import { CommandExecutor, NetworkCommandProcessor } from "../_processor.ts";
import type { CommandTemplate } from "../type.ts";

// types.ts
export interface ONTBaseConfig {
	f: string;
	s: string;
	p: string;
	ont_id: string;
	desc: string;
	tcont_index: string;
	tcont_name: string;
	bandwidth_profile: string;
	gemport_index: string;
	gemport_name: string;
	service_port_index: string;
	vport_index: string;
}

export interface ONTVlanConfig extends ONTBaseConfig {
	user_vlan: string;
	vlan: string;
	port_mode: string;
	service_name: string;
	eth_count?: number;
}

export interface ONTVmanConfig extends ONTVlanConfig {
	svlan: string;
}

export interface ONTPppoeConfig extends ONTBaseConfig {
	vlan1: string | number;
	vlan2: string | number;
}

export interface ONTQinqConfig extends ONTBaseConfig {
	tls_vlan: string;
}

// export const zteTemplate: CommandTemplate = {
// 	name: "ont-zte-config",
// 	type: "CREATE",
// 	description: "Command to create complete ONT configuration ZTE",
// 	template:
// 		"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nname {{desc}}\ndescription {{desc}}\ntcont {{tcont_index}} name {{tcont_name}} profile {{bandwidth_profile}}\ngemport {{gemport_index}} name {{gemport_name}} tcont {{tcont_index}}\nservice-port {{service_port_index}} vport {{vport_index}} {{port_config}}\nexit\n\n{{service_config}}",
// 	variableLogic: {
// 		port_config: {
// 			type: "switch",
// 			variable: "service_type",
// 			cases: {
// 				qinq: "other-all tls-vlan {{tls_vlan}}",
// 				vman: "user-vlan {{user_vlan}} vlan {{vlan}} svlan {{svlan}}",
// 				default: "user-vlan {{user_vlan}} vlan {{vlan}}",
// 			},
// 		},
// 		service_config: {
// 			type: "switch",
// 			variable: "service_type",
// 			cases: {
// 				pppoe:
// 					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nflow mode 1 tag-filter vlan-filter untag-filter discard\nflow 1 pri 1 vlan {{vlan1}}\nflow 1 pri 2 vlan {{vlan2}}\ngemport {{gemport_index}} flow 1",
// 				qinq: "pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice qinq gemport {{gemport_index}} iphost 1\nvlan port eth_0/1 vlan all",
// 				vman: "pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice {{service_name}} gemport {{gemport_index}} vlan {{vlan}}{{generated_ports}}",
// 				default:
// 					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice {{service_name}} gemport {{gemport_index}} vlan {{vlan}}{{generated_ports}}",
// 			},
// 		},
// 	},
// };

export const zteTemplate: CommandTemplate = {
	name: "ont-zte-config",
	type: "CREATE",
	description: "Command to create complete ONT configuration ZTE",
	template:
		"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nname {{desc}}\ndescription {{desc}}\ntcont {{tcont_index}} name {{tcont_name}} profile {{bandwidth_profile}}\ngemport {{gemport_index}} name {{gemport_name}} tcont {{tcont_index}}\nservice-port {{service_port_index}} vport {{vport_index}} {{port_config}}\nexit\n\n{{service_config}}",
	variableLogic: {
		port_config: {
			type: "switch",
			variable: "service_type",
			cases: {
				qinq: "other-all tls-vlan {{tls_vlan}}",
				vman: "user-vlan {{user_vlan}} vlan {{vlan}} svlan {{svlan}}",
				pppoe: "vlan {{vlan1}}", // Khusus untuk PPPOE
				default: "user-vlan {{user_vlan}} vlan {{vlan}}",
			},
		},
		service_config: {
			type: "switch",
			variable: "service_type",
			cases: {
				pppoe:
					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nflow mode 1 tag-filter vlan-filter untag-filter discard\nflow 1 pri 1 vlan {{vlan1}}\nflow 1 pri 2 vlan {{vlan2}}\ngemport {{gemport_index}} flow 1",
				qinq: "pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice qinq gemport {{gemport_index}} iphost 1\nvlan port eth_0/1 vlan all",
				vman: "pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice {{service_name}} gemport {{gemport_index}} vlan {{vlan}}{{generated_ports}}",
				default:
					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice {{service_name}} gemport {{gemport_index}} vlan {{vlan}}{{generated_ports}}",
			},
		},
	},
};

export class ONTService {
	private processor: NetworkCommandProcessor;
	private executor: CommandExecutor;

	constructor() {
		this.processor = new NetworkCommandProcessor();
		this.executor = new CommandExecutor(this.processor);
		this.executor.addCommand(zteTemplate);
	}

	private generatePorts(
		count: number,
		port_mode: string,
		vlan: string,
	): string {
		let result = "";
		for (let i = 1; i <= count; i++) {
			result += `\nvlan port eth_0/${i} mode ${port_mode} vlan ${vlan}`; // Langsung gunakan nilai
		}
		return result;
	}

	private prepareVariables(
		config: ONTBaseConfig &
			Partial<ONTVlanConfig & ONTVmanConfig & ONTPppoeConfig & ONTQinqConfig>,
	) {
		let service_type = "regular";
		if ("vlan1" in config && "vlan2" in config) service_type = "pppoe";
		if ("tls_vlan" in config) service_type = "qinq";
		if ("svlan" in config) service_type = "vman";

		// Generate ports dengan nilai aktual
		const generated_ports = this.generatePorts(
			config.eth_count || 4,
			config.port_mode || "tag",
			config.vlan || "",
		);

		return {
			...config,
			service_type,
			generated_ports,
		};
	}

	generateConfig(
		config: ONTBaseConfig &
			Partial<ONTVlanConfig & ONTVmanConfig & ONTPppoeConfig & ONTQinqConfig>,
	): string {
		const variables = this.prepareVariables(config);
		return this.executor.executeCommand("ont-zte-config", variables);
	}
}

const ontService = new ONTService();

const regularConfig: ONTVlanConfig = {
	f: "1",
	s: "1",
	p: "4",
	ont_id: "1",
	desc: "FMI-123",
	tcont_index: "1",
	tcont_name: "internet_vlan-Translate",
	bandwidth_profile: "200M",
	gemport_index: "1",
	gemport_name: "Internet_Vlan-Translate",
	service_port_index: "1",
	vport_index: "1",
	user_vlan: "1440",
	vlan: "1440",
	port_mode: "tag",
	service_name: "Internet_Vlan-Translate",
	eth_count: 2,
};

// VMAN
const vmanConfig: ONTVmanConfig = {
	...regularConfig,
	svlan: "3170",
};

// PPPOE Config
const pppoeConfig: ONTPppoeConfig = {
	f: "1",
	s: "1",
	p: "4",
	ont_id: "1",
	desc: "FMI-123",
	tcont_index: "1",
	tcont_name: "pppoe_service",
	bandwidth_profile: "200M",
	gemport_index: "1",
	gemport_name: "PPPOE-Service",
	service_port_index: "1",
	vport_index: "1",
	vlan1: "611", // Spesifik untuk PPPOE
	vlan2: "601", // Spesifik untuk PPPOE
};

// QINQ Config
const qinqConfig: ONTQinqConfig = {
	f: "1",
	s: "1",
	p: "4",
	ont_id: "1",
	desc: "FMI-123",
	tcont_index: "1",
	tcont_name: "qinq_service",
	bandwidth_profile: "200M",
	gemport_index: "1",
	gemport_name: "QINQ-Service",
	service_port_index: "1",
	vport_index: "1",
	tls_vlan: "3000", // Spesifik untuk QINQ
};

const regularResult = ontService.generateConfig(regularConfig);
const qinqResult = ontService.generateConfig(qinqConfig);
const pppoeResult = ontService.generateConfig(pppoeConfig);

console.log("=== Regular VLAN Config ===");
console.log(regularResult);
console.log("\n=== QINQ Config ===");
console.log(qinqResult);
console.log("\n=== PPPOE Config ===");
console.log(pppoeResult);
