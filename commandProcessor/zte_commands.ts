// import { CommandExecutor, ZTECommandProcessor } from "./radashi_strategy.ts";
import {
	CommandExecutor,
	NetworkCommandProcessor,
} from "./radashi_strategy_1.ts";
import type { CommandTemplate, Variables } from "./type.ts";

// Command template untuk ZTE
const zteCommands: CommandTemplate[] = [
	{
		name: "ont-basic",
		type: "CREATE",
		description: "Command to create new ONT with basic VLAN",
		template:
			"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{unused_index}}\nname {{name}}\ndescription {{desc}}\ntcont 1 name internet_vlan-Translate profile {{profile}}\ngemport 1 name Internet_Vlan-Translate tcont 1\nservice-port 1 vport 1 user-vlan {{vlan}} vlan {{vlan}}\n\npon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{unused_index}}\nservice Internet_Vlan-Translate gemport 1 vlan {{vlan}}{{eth_ports}}",
		variableLogic: {
			eth_ports: {
				type: "switch",
				variable: "port_mode",
				cases: {
					tag: "\nvlan port eth_0/1 mode tag vlan {{vlan}}\nvlan port eth_0/2 mode tag vlan {{vlan}}\nvlan port eth_0/3 mode tag vlan {{vlan}}\nvlan port eth_0/4 mode tag vlan {{vlan}}",
					trunk:
						"\nvlan port eth_0/1 mode trunk\nvlan port eth_0/2 mode trunk\nvlan port eth_0/3 mode trunk\nvlan port eth_0/4 mode trunk",
					default: "\nvlan port eth_0/1 mode tag vlan {{vlan}}",
				},
			},
		},
	},
	{
		name: "ont-vman",
		type: "CREATE",
		description: "Command to create ONT with VMAN CVID",
		template:
			"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{unused_index}}\nname {{name}}\ndescription {{desc}}\ntcont 1 name internet_vlan-Translate profile {{profile}}\ngemport 1 name Internet_Vlan-Translate tcont 1\nservice-port 1 vport 1 user-vlan {{vlan}} vlan {{vlan}} svlan {{svlan}}{{eth_config}}",
		variableLogic: {
			eth_config: {
				type: "conditional",
				condition: "configureEth",
				trueValue:
					"\n\npon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{unused_index}}\nservice Internet_Vlan-Translate gemport 1 vlan {{vlan}}\nvlan port eth_0/1 mode tag vlan {{vlan}}\nvlan port eth_0/2 mode tag vlan {{vlan}}\nvlan port eth_0/3 mode tag vlan {{vlan}}\nvlan port eth_0/4 mode tag vlan {{vlan}}",
				falseValue: "",
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

// Contoh penggunaan untuk ZTE basic VLAN
const zteBasicVlanVariables: Variables = {
	f: "1",
	s: "1",
	p: "4",
	unused_index: "1",
	name: "FMI-123",
	desc: "FMI-123",
	profile: "200M",
	vlan: "1440",
	port_mode: "tag",
};

// Contoh penggunaan untuk ZTE VMAN CVID
const zteVmanVariables: Variables = {
	f: "1",
	s: "1",
	p: "4",
	unused_index: "1",
	name: "FMI-123",
	desc: "FMI-123",
	profile: "300M",
	vlan: "860",
	svlan: "3170",
	configureEth: true,
};

// Eksekusi commands
console.log("ZTE Basic VLAN Command:");
console.log(zteExecutor.executeCommand("ont-basic", zteBasicVlanVariables));

console.log("\nZTE VMAN CVID Command:");
console.log(zteExecutor.executeCommand("ont-vman", zteVmanVariables));
