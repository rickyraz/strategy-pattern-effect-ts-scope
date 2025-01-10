// HUAWEI

import type { CommandTemplate, Variables } from "./type.ts";
// import { HuaweiCommandProcessor, CommandExecutor } from "./radashi_strategy.ts";
import {
	CommandExecutor,
	NetworkCommandProcessor,
} from "./radashi_strategy_1.ts";

// Inisialisasi processor dan executor
const huaweiProcessor = new NetworkCommandProcessor();
const huaweiExecutor = new CommandExecutor(huaweiProcessor);

// Command template untuk Huawei yang Anda punya
const huaweiCommands: CommandTemplate[] = [
	{
		name: "ont-client",
		type: "CREATE",
		description: "Command to create a new ONT client",
		template:
			'enable\nconfig\nundo smart\ninterface gpon {{f}}/{{s}}\nont add {{p}} {{unused_index}} sn-auth "{{ont_sn}}" omci ont-lineprofile-id {{ont_lineprofile}} ont-srvprofile-id {{ont_srvprofile}} desc "{{desc}}"{{native_vlan1}}{{native_vlan2}}{{native_vlan3}}{{native_vlan4}}',
		variableLogic: {
			native_vlan1: {
				type: "conditional",
				condition: "hasNativeVlan1",
				trueValue:
					"\nont port native-vlan {{p}} {{unused_index}} eth 1 vlan {{native_vlan1}} priority 0",
				falseValue: "",
			},
			native_vlan2: {
				type: "conditional",
				condition: "hasNativeVlan2",
				trueValue:
					"\nont port native-vlan {{p}} {{unused_index}} eth 2 vlan {{native_vlan2}} priority 0",
				falseValue: "",
			},
			native_vlan3: {
				type: "conditional",
				condition: "hasNativeVlan3",
				trueValue:
					"\nont port native-vlan {{p}} {{unused_index}} eth 3 vlan {{native_vlan3}} priority 0",
				falseValue: "",
			},
			native_vlan4: {
				type: "conditional",
				condition: "hasNativeVlan4",
				trueValue:
					"\nont port native-vlan {{p}} {{unused_index}} eth 4 vlan {{native_vlan4}} priority 0",
				falseValue: "",
			},
		},
	},
	{
		name: "service-port-ont",
		type: "CREATE",
		description: "Command to create a service port for ONT",
		template:
			"enable\nconfig\nundo smart\nservice-port {{service_port_id}} vlan {{vlan}} gpon {{f}}/{{s}}/{{p}} ont {{unused_index}} gemport {{gemport}} multi-service {{tag_transform_command}}{{traffic_priority_command}}",
		variableLogic: {
			tag_transform_command: {
				type: "switch",
				variable: "tag_transform",
				cases: {
					translate: "user-vlan {{user_vlan}} tag-transform translate",
					translate_and_add:
						"user-vlan {{user_vlan}} tag-transform translate-and-add inner-vlan {{inner_vlan}}",
					default: "user-vlan other-all tag-transform default",
				},
			},
			traffic_priority_command: {
				type: "switch",
				variable: "tag_transform",
				cases: {
					translate: {
						type: "conditional",
						condition: "hasTrafficTable",
						trueValue:
							" inbound traffic-table index {{traffic_table}} outbound traffic-table index {{traffic_table}}",
						falseValue: "",
					},
					default: {
						type: "conditional",
						condition: "hasTrafficTable",
						trueValue:
							" inbound traffic-table index {{traffic_table}} outbound traffic-table index {{traffic_table}}",
						falseValue: "",
					},
					translate_and_add: {
						type: "conditional",
						condition: "hasTrafficTable",
						trueValue:
							" inbound traffic-table index {{traffic_table}} outbound traffic-table index {{traffic_table}}",
						falseValue: " inner-priority 0",
					},
				},
			},
		},
	},
];

// Menambahkan commands ke executor
for (const cmd of huaweiCommands) {
	huaweiExecutor.addCommand(cmd);
}

// Contoh penggunaan untuk membuat ONT dengan 2 VLAN
const huaweiVariables: Variables = {
	f: "0",
	s: "1",
	p: "1",
	unused_index: "1",
	ont_sn: "ABCD12345678",
	ont_lineprofile: "1",
	ont_srvprofile: "1",
	desc: "Test ONT",
	hasNativeVlan1: true,
	hasNativeVlan2: true,
	hasNativeVlan3: false,
	hasNativeVlan4: false,
	native_vlan1: "100",
	native_vlan2: "200",
};

// Contoh penggunaan untuk service port
const servicePortVariables: Variables = {
	f: "0",
	s: "1",
	p: "1",
	unused_index: "1",
	service_port_id: "1",
	vlan: "100",
	gemport: "1",
	tag_transform: "translate",
	user_vlan: "200",
	hasTrafficTable: true,
	traffic_table: "5",
};

// Eksekusi command service port
// console.log("\nHuawei Service Port Command:");

const start = performance.now(); // Catat waktu sebelum perintah
console.log(
	huaweiExecutor.executeCommand("service-port-ont", servicePortVariables),
);
const end = performance.now(); // Catat waktu setelah perintah selesai

console.log(`Waktu eksekusi: ${end - start} ms`); // Hitung selisih waktu

const start2 = performance.now(); // Catat waktu sebelum perintah

// Eksekusi command
console.log(huaweiExecutor.executeCommand("ont-client", huaweiVariables));
const end2 = performance.now(); // Catat waktu setelah perintah selesai
console.log(`Waktu eksekusi2: ${end2 - start2} ms`); // Hitung selisih waktu
