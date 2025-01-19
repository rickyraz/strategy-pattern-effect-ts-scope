// deno-lint-ignore-file
import { CommandExecutor, NetworkCommandProcessor } from "../_processor.ts";
import type { CommandTemplate } from "../type.ts";

// Buat type untuk nilai yang valid dalam Variables
type VariableValue = string | number | boolean | string[] | ServicePort[];

// Kemudian definisikan Variables
export type Variables = Record<string, VariableValue>;

export interface ServicePort {
	vlan: string | number;
	svlan: string | number | null;
}

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
	// service_port_index: string;
	// vport_index: string;
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
	// vlan1: string | number;
	// vlan2: string | number;
	// svlan?: string; // Tambahkan svlan opsional
	service_ports?: Array<ServicePort>;
}

export interface ONTQinqConfig extends ONTBaseConfig {
	tls_vlan: string;
}

export const zteTemplate: CommandTemplate = {
	name: "ont-zte-config",
	type: "CREATE",
	description: "Command to create complete ONT configuration ZTE",
	template:
		"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nname {{desc}}\ndescription {{desc}}\ntcont {{tcont_index}} name {{tcont_name}} profile {{bandwidth_profile}}\ngemport {{gemport_index}} name {{gemport_name}} tcont {{tcont_index}}\n{{service_ports_config}}\nexit\n\n{{service_config}}",
	variableLogic: {
		service_ports_config: {
			type: "switch",
			variable: "service_type",
			cases: {
				pppoe: "{{pppoe_service_ports}}",
				qinq: "service-port {{service_port_index}} vport {{vport_index}} other-all tls-vlan {{tls_vlan}}",
				vman: "service-port {{service_port_index}} vport {{vport_index}} user-vlan {{user_vlan}} vlan {{vlan}} svlan {{svlan}}",
				default:
					"service-port {{service_port_index}} vport {{vport_index}} user-vlan {{user_vlan}} vlan {{vlan}}",
			},
		},
		service_config: {
			type: "switch",
			variable: "service_type",
			cases: {
				// pppoe: "pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nflow mode 1 tag-filter vlan-filter untag-filter discard\nflow 1 pri 1 vlan {{vlan1}}\nflow 1 pri 2 vlan {{vlan2}}\ngemport {{gemport_index}} flow 1",
				pppoe:
					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nflow mode 1 tag-filter vlan-filter untag-filter discard\n{{pppoe_service_ports_flow}}",
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
			result += `\nvlan port eth_0/${i} mode ${port_mode === "trunk" ? "trunk" : `${port_mode} vlan ${vlan}`}`; // Langsung gunakan nilai
		}
		return result;
	}

	private generatePPPoEServicePorts(config: ONTPppoeConfig): string {
		if (!config.service_ports) {
			return "";
		}

		return config.service_ports
			.map(
				(port, index) =>
					`service-port ${index + 1} vport ${index + 1} vlan ${port.vlan} svlan ${port.svlan || ""}`,
			)
			.join("\n");
	}

	private generatePPPoEServicePortsFlows(config: ONTPppoeConfig): string {
		if (!config.service_ports) {
			return "";
		}

		return config.service_ports
			.map((port, index) => `flow 1 pri ${index + 1} vlan ${port.vlan}`)
			.join("\n");
	}

	private prepareVariables(
		config: ONTBaseConfig &
			Partial<ONTVlanConfig & ONTVmanConfig & ONTPppoeConfig & ONTQinqConfig>,
	): Variables {
		// Tambahkan tipe return
		let service_type = "regular";
		// if ("vlan1" in config && "vlan2" in config) service_type = "pppoe";
		if ("service_ports" in config) service_type = "pppoe";
		if ("tls_vlan" in config) service_type = "qinq";
		if ("svlan" in config && !("vlan1" in config)) service_type = "vman";

		// Jika ada service_ports, konversi ke format yang sesuai
		const processedConfig = { ...config };
		if ("service_ports" in processedConfig) {
			const processedPorts = processedConfig.service_ports?.map((port) => ({
				vlan: port.vlan ? String(port.vlan) : "N/A",
				svlan: port.svlan ? String(port.svlan) : "N/A",
			}));
			processedConfig.service_ports = processedPorts;
		}

		return {
			...processedConfig,
			service_type,
			generated_ports: this.generatePorts(
				config.eth_count || 4,
				config.port_mode || "",
				config.vlan || "",
			),
			pppoe_service_ports:
				service_type === "pppoe"
					? this.generatePPPoEServicePorts(config as ONTPppoeConfig)
					: "",
			pppoe_service_ports_flow:
				service_type === "pppoe"
					? this.generatePPPoEServicePortsFlows(config as ONTPppoeConfig)
					: "",
		} as Variables;
	}

	public generateConfig(
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
	// service_port_index: "1",
	// vport_index: "1",
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
	// service_port_index: "1",
	// vport_index: "1",
	tls_vlan: "3000", // Spesifik untuk QINQ
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
	// service_port_index: "1", // Default service port jika tidak ada multiple
	// vport_index: "1", // Default vport jika tidak ada multiple
	// vlan1: "611",
	// vlan2: "601",
	// svlan: "3000", // SVLAN untuk semua service ports
	service_ports: [
		// Multiple service ports
		{
			vlan: "400",
			svlan: "3000",
		},
		{
			vlan: "499",
			svlan: "3000",
		},
		{
			vlan: "9090",
			svlan: "3000",
		},
	],
};

const regularResult = ontService.generateConfig(regularConfig);
const vmanResult = ontService.generateConfig(vmanConfig);
const qinqResult = ontService.generateConfig(qinqConfig);
const pppoeResult = ontService.generateConfig(pppoeConfig);

console.log("=== Regular VLAN Config ===");
console.log(regularResult);
// console.log("=== Regular VLAN + VMAN Config ===");
// console.log(vmanResult);
// console.log("\n=== QINQ Config ===");
// console.log(qinqResult);
// console.log("\n=== PPPOE Config ===");
// console.log(pppoeResult);
