// import { CommandExecutor, ZTECommandProcessor } from "./radashi_strategy.ts";
// import {
// 	CommandExecutor,
// 	NetworkCommandProcessor,
// } from "./old/radashi_strategy_1.ts";
import { CommandExecutor, NetworkCommandProcessor } from "../_processor.ts";
import type { CommandTemplate } from "../type.ts";

// Command template untuk ZTE
// const zteCommands: CommandTemplate[] = [
// 	{
// 		name: "ont-zte-config",
// 		type: "CREATE",
// 		description: "Command to create complete ONT configuration ZTE",
// 		template:
// 			"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nname {{desc}}\ndescription {{desc}}\ntcont {{tcont_index}} name {{tcont_name}} profile {{bandwidth_profile}}\ngemport {{gemport_index}} name {{gemport_name}} tcont {{tcont_index}}\nservice-port {{service_port_index}} vport {{vport_index}} {{vlan_config}}\n\npon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\n{{service_config}}",
// 		variableLogic: {
// 			vlan_config: {
// 				type: "switch",
// 				variable: "service_type",
// 				cases: {
// 					regular: "user-vlan {{user_vlan}} vlan {{vlan}}",
// 					vman: "user-vlan {{user_vlan}} vlan {{vlan}} svlan {{svlan}}",
// 					qinq: "other-all tls-vlan {{tls_vlan}}",
// 				},
// 			},
// 			service_config: {
// 				type: "conditional",
// 				condition: "hasEthConfig",
// 				trueValue:
// 					"service {{service_name}} gemport {{gemport_index}} vlan {{vlan}}\n{{eth_config}}",
// 				falseValue:
// 					"service {{service_name}} gemport {{gemport_index}} vlan {{vlan}}",
// 			},
// 			eth_config: {
// 				type: "switch",
// 				variable: "port_mode",
// 				cases: {
// 					tag: "vlan port eth_0/1 mode tag vlan {{vlan}}\nvlan port eth_0/2 mode tag vlan {{vlan}}\nvlan port eth_0/3 mode tag vlan {{vlan}}\nvlan port eth_0/4 mode tag vlan {{vlan}}",
// 					trunk:
// 						"vlan port eth_0/1 mode trunk\nvlan port eth_0/2 mode trunk\nvlan port eth_0/3 mode trunk\nvlan port eth_0/4 mode trunk",
// 				},
// 			},
// 		},
// 	},
// ];

// const zteCommands: CommandTemplate[] = [
// 	{
// 		name: "ont-zte-config",
// 		type: "CREATE",
// 		description: "Command to create complete ONT configuration ZTE",
// 		template:
// 			"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nname {{desc}}\ndescription {{desc}}\ntcont {{tcont_index}} name {{tcont_name}} profile {{bandwidth_profile}}\ngemport {{gemport_index}} name {{gemport_name}} tcont {{tcont_index}}\nservice-port {{service_port_index}} vport {{vport_index}} {{vlan_config}}\n\npon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\n{{service_config}}",
// 		variableLogic: {
// 			vlan_config: {
// 				type: "switch",
// 				variable: "service_type",
// 				cases: {
// 					regular: "user-vlan {{user_vlan}} vlan {{vlan}}",
// 					vman: "user-vlan {{user_vlan}} vlan {{vlan}} svlan {{svlan}}",
// 					qinq: "other-all tls-vlan {{tls_vlan}}",
// 				},
// 			},
// 			service_config: {
// 				type: "switch",
// 				variable: "service_type",
// 				cases: {
// 					regular:
// 						"service {{service_name}} gemport {{gemport_index}} vlan {{vlan}}\nvlan port eth_0/1 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/2 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/3 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/4 mode {{port_mode}} vlan {{vlan}}",
// 					vman: "service {{service_name}} gemport {{gemport_index}} vlan {{vlan}}",
// 					qinq: "",
// 					pppoe: "",
// 				},
// 			},
// 		},
// 	},
// ];

const zteCommands2: CommandTemplate[] = [
	{
		name: "ont-zte-config",
		type: "CREATE",
		description: "Command to create complete ONT configuration ZTE",
		template:
			"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nname {{desc}}\ndescription {{desc}}\ntcont {{tcont_index}} name {{tcont_name}} profile {{bandwidth_profile}}\ngemport {{gemport_index}} name {{gemport_name}} tcont {{tcont_index}}\nservice-port {{service_port_index}} vport {{vport_index}} {{vlan_config}}\nexit\n\n{{service_config}}",
		variableLogic: {
			vlan_config: {
				type: "switch",
				variable: "service_type",
				cases: {
					regular: "user-vlan {{user_vlan}} vlan {{vlan}}",
					vman: "user-vlan {{user_vlan}} vlan {{vlan}} svlan {{svlan}}",
					qinq: "other-all tls-vlan {{tls_vlan}}",
				},
			},
			service_config: {
				type: "switch",
				variable: "service_type",
				cases: {
					regular:
						"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice {{service_name}} gemport {{gemport_index}} vlan {{vlan}}\nvlan port eth_0/1 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/2 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/3 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/4 mode {{port_mode}} vlan {{vlan}}",
					vman: "pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice {{service_name}} gemport {{gemport_index}} vlan {{vlan}}\nvlan port eth_0/1 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/2 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/3 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/4 mode {{port_mode}} vlan {{vlan}}",
					pppoe:
						"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nflow mode 1 tag-filter vlan-filter untag-filter discard\nflow 1 pri 1 vlan {{vlan1}}\nflow 1 pri 2 vlan {{vlan2}}\ngemport {{gemport_index}} flow 1",
					qinq: "pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice qinq gemport {{gemport_index}} iphost 1\nvlan port eth_0/1 vlan all",
				},
			},
		},
	},
];

// const pppoeCommands: CommandTemplate = {
// 	name: "pppoe-config",
// 	type: "CREATE",
// 	description: "Command for PPPOE configuration",
// 	template:
// 		"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nflow mode 1 tag-filter vlan-filter untag-filter discard\nflow 1 pri 1 vlan {{vlan1}}\nflow 1 pri 2 vlan {{vlan2}}\ngemport {{gemport_index}} flow 1",
// 	variableLogic: {},
// };

// // Template baru untuk QINQ
// const qinqCommands: CommandTemplate = {
// 	name: "qinq-config",
// 	type: "CREATE",
// 	description: "Command for QINQ configuration",
// 	template:
// 		"service qinq gemport {{gemport_index}} iphost 1\nvlan port eth_0/1 vlan all",
// 	variableLogic: {},
// };

// Inisialisasi untuk ZTE
const zteProcessor = new NetworkCommandProcessor();
const zteExecutor = new CommandExecutor(zteProcessor);

// Menambahkan commands ke executors
for (const cmd of zteCommands2) {
	zteExecutor.addCommand(cmd);
}

// zteExecutor.addCommand(pppoeCommands);
// zteExecutor.addCommand(qinqCommands);

// Contoh penggunaan untuk ZTE basic VLAN
const variables = {
	// Basic ONT Config
	f: "1",
	s: "1",
	p: "4",
	ont_id: "1",
	desc: "FMI-123",

	// TCONT & GEMPORT
	tcont_index: "1",
	tcont_name: "internet_vlan-Translate",
	bandwidth_profile: "200M",
	gemport_index: "1",
	gemport_name: "Internet_Vlan-Translate",

	// Service Port Config (yang sebelumnya hilang)
	service_port_index: "1",
	vport_index: "1",

	// VLAN Config
	service_type: "qinq",
	user_vlan: "1440",
	vlan: "1440",
	port_mode: "tag",
	service_name: "Internet_Vlan-Translate",
	hasEthConfig: true,
};

// // Untuk kasus VMAN, tambahkan:
// const vmanVariables = {
// 	...variables,
// 	service_type: "vman",
// 	svlan: "3170",
// };

// // Untuk kasus PPPOE, tambahkan:
// const pppoeVariables = {
// 	...variables,
// 	service_type: "pppoe",
// 	vlan1: "611",
// 	vlan2: "601",
// };

// // Untuk kasus QINQ, tambahkan:
// const qinqVariables = {
// 	...variables,
// 	service_type: "qinq",
// 	tls_vlan: "3000",
// };
// Get result as string
const result = zteExecutor.executeCommand("ont-zte-config", variables);
// Untuk VMAN
// const resultVMAN = zteExecutor.executeCommand("ont-zte-config", vmanVariables);
// // Untuk PPPOE
// const pppoeResult = zteExecutor.executeCommand("pppoe-config", pppoeVariables);
// // Untuk QINQ
// const qinqResult = zteExecutor.executeCommand("qinq-config", qinqVariables);

// Or get result as array of commands
// const commands = zteExecutor.executeCommandAsArray("ont-zte-config", variables);

console.log(result);
// console.log(resultVMAN);
// console.log(pppoeResult);
// console.log(qinqResult);
