// deno-lint-ignore-file
import { CommandExecutor, NetworkCommandProcessor } from "./_processor.ts";
import type { CommandTemplate, ServicePort, Variables } from "./type.ts";

export interface ONTBaseConfig {
	f: string;
	s: string;
	p: string;
	ont_id: string;
	desc: string;
	tcont_gemport_index: string; // Combined index for both tcont and gemport
	service_name: string; // This will be used for tcont_name, gemport_name and service_name
	bandwidth_profile: string;
	service_ports?: Array<ServicePort>;
	eth_count?: number;
	vlan?: string;
	port_mode?: string;
}

export interface ONTVlanConfig extends ONTBaseConfig {
	port_mode?: string;
}

export const zteTemplate: CommandTemplate = {
	name: "ont-zte-config",
	type: "CREATE",
	description: "Command to create complete ONT configuration ZTE",
	template:
		"interface gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nname {{desc}}\ndescription {{desc}}\ntcont {{tcont_gemport_index}} name {{service_name}} profile {{bandwidth_profile}}\ngemport {{tcont_gemport_index}} name {{service_name}} tcont {{tcont_gemport_index}}\n{{service_ports_config}}\nexit\n\n{{service_config}}",
	variableLogic: {
		service_ports_config: {
			type: "switch",
			variable: "service_type",
			cases: {
				pppoe: "{{pppoe_service_ports}}",
				qinq: "{{pppoe_service_ports}}",
				vman: "{{pppoe_service_ports}}",
				default: "{{pppoe_service_ports}}",
			},
		},
		service_config: {
			type: "switch",
			variable: "service_type",
			cases: {
				pppoe:
					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nflow mode 1 tag-filter vlan-filter untag-filter discard\n{{pppoe_service_ports_flow}}\ngemport {{tcont_gemport_index}} flow 1",
				qinq: "pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice qinq gemport {{tcont_gemport_index}} iphost 1\nvlan port eth_0/1 vlan all",
				vman: "pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice {{service_name}} gemport {{tcont_gemport_index}} vlan {{vlan}}{{generated_ports}}",
				default:
					"pon-onu-mng gpon-onu_{{f}}/{{s}}/{{p}}:{{ont_id}}\nservice {{service_name}} gemport {{tcont_gemport_index}} vlan {{vlan}}{{generated_ports}}",
			},
		},
	},
};

export class ZTEONTConfigCommand {
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
		const portConfigs = [];
		const modeConfig =
			port_mode === "trunk" ? "trunk" : `${port_mode} vlan ${vlan}`;

		for (let i = 1; i <= count; i++) {
			portConfigs.push(`vlan port eth_0/${i} mode ${modeConfig}`);
		}

		return `\n${portConfigs.join("\n")}`;
	}

	private generateServicePorts(
		config: ONTBaseConfig & { service_ports?: ServicePort[] },
	): string {
		if (!config.service_ports?.length) {
			return "";
		}

		const generatePortConfig = (port: ServicePort, index: number): string => {
			const portIndex = index + 1;

			// Determine port type and generate appropriate config
			if (port.tls_vlan) {
				return `service-port ${portIndex} vport ${portIndex} other-all tls-vlan ${port.tls_vlan}`;
			}
			if (port.vlan && port.svlan && !port.user_vlan) {
				return `service-port ${portIndex} vport ${portIndex} vlan ${port.vlan} svlan ${port.svlan}`;
			}
			if (port.vlan && port.user_vlan && port.svlan) {
				return `service-port ${portIndex} vport ${portIndex} user-vlan ${port.user_vlan} vlan ${port.vlan} svlan ${port.svlan}`;
			}
			if (port.vlan && port.user_vlan) {
				return `service-port ${portIndex} vport ${portIndex} user-vlan ${port.user_vlan} vlan ${port.vlan}`;
			}

			throw new Error(`Invalid port configuration for index ${index}`);
		};

		return config.service_ports
			.map((port, index) => generatePortConfig(port, index))
			.join("\n");
	}

	private generatePPPoEFlows(
		config: ONTBaseConfig & { service_ports?: ServicePort[] },
	): string {
		if (!config.service_ports?.length) {
			return "";
		}

		return config.service_ports
			.map((port, index) => {
				if (!port.vlan) {
					throw new Error(
						`PPPOE port at index ${index} must have vlan defined`,
					);
				}
				return `flow 1 pri ${index + 1} vlan ${port.vlan}`;
			})
			.join("\n");
	}

	private determineServiceType(service_ports?: ServicePort[]): string {
		if (!service_ports?.length) {
			return "regular";
		}

		const firstPort = service_ports[0];

		if (firstPort.tls_vlan) {
			return "qinq";
		}
		if (firstPort.vlan && firstPort.svlan && !firstPort.user_vlan) {
			return "pppoe";
		}
		if (firstPort.vlan && firstPort.user_vlan && firstPort.svlan) {
			return "vman";
		}
		if (firstPort.vlan && firstPort.user_vlan) {
			return "regular";
		}

		throw new Error("Cannot determine service type from port configuration");
	}

	private prepareVariables(
		config: ONTBaseConfig & Partial<ONTVlanConfig>,
	): Variables {
		const service_type = this.determineServiceType(config.service_ports);

		// Get the VLAN from service ports if available
		const vlanFromServicePort =
			config.service_ports?.[0]?.vlan || config.service_ports?.[0]?.user_vlan;

		const effectiveVlan = config.vlan || vlanFromServicePort;

		// Process service ports if they exist
		const processedConfig = { ...config };
		if (config.service_ports?.length) {
			const processedPorts = config.service_ports.map((port) => ({
				vlan: port.vlan ? String(port.vlan) : undefined,
				user_vlan: port.user_vlan ? String(port.user_vlan) : undefined,
				svlan: port.svlan ? String(port.svlan) : undefined,
				tls_vlan: port.tls_vlan ? String(port.tls_vlan) : undefined,
			}));
			processedConfig.service_ports = processedPorts;
		}

		return {
			...processedConfig,
			service_type,
			vlan: effectiveVlan, // Use the effective VLAN
			generated_ports: this.generatePorts(
				config.eth_count || 4,
				config.port_mode || "tag",
				String(effectiveVlan || ""),
			),
			pppoe_service_ports: this.generateServicePorts(config),
			pppoe_service_ports_flow:
				service_type === "pppoe" ? this.generatePPPoEFlows(config) : "",
		} as Variables;
	}

	public generateConfig(config: ONTBaseConfig): string {
		const variables = this.prepareVariables(config);
		return this.executor.executeCommand(
			"ont-zte-config",
			variables as Variables,
		);
	}
}

const ontService = new ZTEONTConfigCommand();

// Regular VLAN dengan service ports
const regularConfig: ONTBaseConfig = {
	f: "1",
	s: "1",
	p: "4",
	ont_id: "1",
	desc: "FMI-123",
	service_name: "Internet_Vlan-Translate", // Single input for all names // This will be used for tcont_name, gemport_name and service_name
	bandwidth_profile: "200M",
	tcont_gemport_index: "1",
	port_mode: "tag",
	eth_count: 2,
	service_ports: [
		{
			vlan: "1440",
			user_vlan: "1440",
			svlan: "3000", // PPPoE (vman)
			tls_vlan: "",
		},
		{
			vlan: "400",
			user_vlan: "1440",
			svlan: "3000", // PPPoE (vman)
			tls_vlan: "",
		},
	],
};

// // VMAN dengan service ports
// const vmanConfig: ONTBaseConfig = {
// 	f: "1",
// 	s: "1",
// 	p: "4",
// 	ont_id: "1",
// 	desc: "FMI-123", // name pengguna
// 	service_name: "Internet_Vlan-Translate",// system kalau milih QINQ
// 	bandwidth_profile: "200M",  // milih
// 	tcont_gemport_index: "1",
// 	port_mode: "trunk",  // milih
// 	eth_count: 2,
// 	service_ports: [ // milih
// 		{
// 			vlan: "1440",
// 			user_vlan: "1440",
// 			svlan: "3170",
// 		},
// 	],
// };

// // QINQ Config dengan service ports
// const qinqConfig: ONTBaseConfig = {
// 	f: "1",
// 	s: "1",
// 	p: "4",
// 	ont_id: "1",
// 	desc: "FMI-123", // name pengguna
// 	tcont_gemport_index: "1", // system pasti 1

// 	bandwidth_profile: "200M", // milih

// 	service_name: "QINQ-Service", // system kalau milih QINQ
// 	service_ports: [
// 		{
// 			tls_vlan: "3000", // milih
// 		},
// 	],
// };

// // PPPOE Config dengan service ports
// const pppoeConfig: ONTBaseConfig = {
// 	f: "1",
// 	s: "1",
// 	p: "4",
// 	ont_id: "1",
// 	desc: "FMI-123",
// 	tcont_gemport_index: "1",

// 	bandwidth_profile: "200M",
// 	service_name: "PPPOE-Service",
// 	service_ports: [
// 		{
// 			vlan: "400",
// 			svlan: "3000",
// 		},
// 		{
// 			vlan: "499",
// 			svlan: "3000",
// 		},
// 		{
// 			vlan: "9090",
// 			svlan: "3000",
// 		},
// 	],
// };

// Test semua konfigurasi
const regularResult = ontService.generateConfig(regularConfig);
// const vmanResult = ontService.generateConfig(vmanConfig);
// const qinqResult = ontService.generateConfig(qinqConfig);
// const pppoeResult = ontService.generateConfig(pppoeConfig);

// Print results
console.log("=== Config ===");
console.log(regularResult);
// console.log("\n=== ACCESS VMAN Config ===");
// console.log(vmanResult);
// console.log("\n=== QINQ Config ===");
// console.log(qinqResult);
// console.log("\n=== PPPOE Config ===");
// console.log(pppoeResult);
