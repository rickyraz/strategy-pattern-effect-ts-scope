import { CommandExecutor, NetworkCommandProcessor } from "../_processor.ts";
import type { CommandTemplate } from "../type.ts";

const zteCommands: CommandTemplate[] = [
	{
		name: "ont-zte-config",
		type: "CREATE",
		description: "Command to create complete ONT configuration ZTE",
		template:
			"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nname {{desc}}\ndescription {{desc}}\ntcont {{tcont_index}} name {{tcont_name}} profile {{bandwidth_profile}}\ngemport {{gemport_index}} name {{gemport_name}} tcont {{tcont_index}}\nservice-port {{service_port_index}} vport {{vport_index}} {{vlan_config}}\nexit\n\n{{service_config}}",
		variableLogic: {
			vlan_config: {
				type: "conditional",
				condition: "hasVlanConfig",
				trueValue: "{{vlan_mode_config}}",
				falseValue: "other-all tls-vlan {{tls_vlan}}",
			},
			vlan_mode_config: {
				type: "conditional",
				condition: "hasVman",
				trueValue: "user-vlan {{user_vlan}} vlan {{vlan}} svlan {{svlan}}",
				falseValue: "user-vlan {{user_vlan}} vlan {{vlan}}",
			},
			service_config: {
				type: "conditional",
				condition: "hasPppoe",
				trueValue:
					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nflow mode 1 tag-filter vlan-filter untag-filter discard\nflow 1 pri 1 vlan {{vlan1}}\nflow 1 pri 2 vlan {{vlan2}}\ngemport {{gemport_index}} flow 1",
				falseValue: "{{normal_service_config}}",
			},
			normal_service_config: {
				type: "conditional",
				condition: "hasQinq",
				trueValue:
					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice qinq gemport {{gemport_index}} iphost 1\nvlan port eth_0/1 vlan all",
				falseValue:
					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice {{service_name}} gemport {{gemport_index}} vlan {{vlan}}\nvlan port eth_0/1 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/2 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/3 mode {{port_mode}} vlan {{vlan}}\nvlan port eth_0/4 mode {{port_mode}} vlan {{vlan}}",
			},
		},
	},
];
// Inisialisasi untuk ZTE
const zteProcessor = new NetworkCommandProcessor();
const zteExecutor = new CommandExecutor(zteProcessor);

// Menambahkan commands ke executors
for (const cmd of zteCommands) {
	zteExecutor.addCommand(cmd);
}

// Regular VLAN
const regularVariables = {
	f: "1",
	s: "1",
	p: "4",
	svlan: "3000",
	ont_id: "1",
	desc: "FMI-123",
	tcont_index: "1",
	tcont_name: "internet_vlan-Translate",
	bandwidth_profile: "200M",
	gemport_index: "1",
	gemport_name: "Internet_Vlan-Translate",
	service_port_index: "1",
	vport_index: "1",
	tls_vlan: "200",
	hasVlanConfig: false,
	hasVman: false,
	hasPppoe: false,
	vlan1: 611,
	vlan2: 610,
	hasQinq: false,
	user_vlan: "1440",
	vlan: "1440",
	port_mode: "tag",
	service_name: "Internet_Vlan-Translate",
};

// // VMAN
// const vmanVariables = {
// 	...regularVariables,
// 	hasVman: true,
// 	svlan: "3170",
// };

// // PPPOE
// const pppoeVariables = {
// 	...regularVariables,
// 	hasPppoe: true,
// 	vlan1: "611",
// 	vlan2: "601",
// };

// // QINQ
// const qinqVariables = {
// 	...regularVariables,
// 	hasVlanConfig: false,
// 	hasQinq: true,
// 	tls_vlan: "3000",
// };
// Get result as string
const result = zteExecutor.executeCommand("ont-zte-config", regularVariables);
// // Untuk VMAN
// const resultVMAN = zteExecutor.executeCommand("ont-zte-config", vmanVariables);
// // Untuk PPPOE
// const pppoeResult = zteExecutor.executeCommand(
// 	"ont-zte-config",
// 	pppoeVariables,
// );
// // Untuk QINQ
// const qinqResult = zteExecutor.executeCommand("ont-zte-config", qinqVariables);

console.log(result);
// console.log(resultVMAN);
// console.log(pppoeResult);
// console.log(qinqResult);
