import { Effect, pipe, Schedule, type Scope } from "effect";
import { Telnet, type ConnectOptions } from "telnet-client";

// Type definitions
type Platform = {
	name: string;
	shellPrompt: RegExp;
	enableCommand: string;
	configCommand: string;
	loginPrompt: string;
	passwordPrompt: string;
	morePrompt: string;
	quitPrompt: string;
};

type PlatformMap = {
	[key: string]: Platform;
};

type ConnectionConfig = {
	host: string;
	username: string;
	password: string;
	port?: number;
	platform?: string;
};

// Platform configurations
const PLATFORMS: PlatformMap = {
	HUAWEI: {
		name: "HUAWEI",
		shellPrompt: /#$/,
		enableCommand: "enable",
		configCommand: "config",
		loginPrompt: "User name:",
		passwordPrompt: "User password:",
		morePrompt: "---- More ( Press 'Q' to break ) ----",
		quitPrompt: "Are you sure to log out? (y/n)[n]:",
	},
};

// const CONNECTION_RETRY_POLICY = {
// 	times: 2,
// 	delay: "1 seconds" as const,
// 	until: (error: ConnectionError) =>
// 		error.message.includes("handshake") ||
// 		error.message.includes("account is locked"),
// };

const CONNECTION_RETRY_POLICY = pipe(
	Schedule.exponential("1 seconds"),
	Schedule.whileInput(
		(error: ConnectionError) =>
			!error.message.includes("handshake") &&
			!error.message.includes("account is locked"),
	),
	Schedule.compose(Schedule.recurs(2)), // Maksimum 2 retry
	Schedule.either(Schedule.spaced("1 seconds")), // Backup dengan fixed interval
);

// Error types
class ConnectionError {
	readonly _tag = "ConnectionError";
	constructor(readonly message: string) {}
}

class CommandError {
	readonly _tag = "CommandError";
	constructor(readonly message: string) {}
}

// Create connection with platform-specific settings
// const createAuthenticatedConnection = (
// 	config: ConnectionConfig,
// ): Effect.Effect<Telnet, ConnectionError> =>
// 	Effect.tryPromise({
// 		try: () => {
// 			const connection = new Telnet();
// 			const platform = PLATFORMS[config.platform || "HUAWEI"];

// 			const params: ConnectOptions = {
// 				host: config.host,
// 				port: config.port || 23,
// 				negotiationMandatory: false,
// 				timeout: 30000,
// 				// Platform-specific settings
// 				shellPrompt: platform.shellPrompt,
// 				loginPrompt: platform.loginPrompt,
// 				passwordPrompt: platform.passwordPrompt,
// 				// Authentication
// 				username: config.username,
// 				password: config.password,
// 				failedLoginMatch:
// 					/Username or password invalid|Reenter times have reached|User account is locked/,
// 				// Additional settings
// 				debug: false,
// 				stripShellPrompt: true,
// 				echoLines: 0,
// 			};

// 			return connection.connect(params);
// 		},
// 		catch: (error) => new ConnectionError(`Connection failed: ${error}`),
// 	});

// const createAuthenticatedConnection = (
// 	config: ConnectionConfig,
// ): Effect.Effect<Telnet, ConnectionError> =>
// 	Effect.tryPromise({
// 		try: async () => {
// 			const connection = new Telnet();
// 			const platform = PLATFORMS[config.platform || "HUAWEI"];

// 			const params: ConnectOptions = {
// 				host: config.host,
// 				port: config.port || 23,
// 				negotiationMandatory: false,
// 				timeout: 30000,
// 				shellPrompt: platform.shellPrompt,
// 				loginPrompt: platform.loginPrompt,
// 				passwordPrompt: platform.passwordPrompt,
// 				username: config.username,
// 				password: config.password,
// 				failedLoginMatch:
// 					/Username or password invalid|Reenter times have reached|User account is locked/,
// 				debug: false,
// 				stripShellPrompt: true,
// 				echoLines: 0,
// 			};

// 			await connection.connect(params);
// 			return connection; // Return the connection object
// 		},
// 		catch: (error) => new ConnectionError(`Connection failed: ${error}`),
// 	});

const createAuthenticatedConnection = (
	config: ConnectionConfig,
): Effect.Effect<Telnet, ConnectionError> =>
	Effect.retry(
		Effect.tryPromise({
			try: async () => {
				const connection = new Telnet();
				const platform = PLATFORMS[config.platform || "HUAWEI"];

				const params: ConnectOptions = {
					host: config.host,
					port: config.port || 23,
					negotiationMandatory: false,
					timeout: 30000,
					shellPrompt: platform.shellPrompt,
					loginPrompt: platform.loginPrompt,
					passwordPrompt: platform.passwordPrompt,
					username: config.username,
					password: config.password,
					failedLoginMatch:
						/Username or password invalid|Reenter times have reached|User account is locked/,
					debug: false,
					stripShellPrompt: true,
					echoLines: 0,
				};

				await connection.connect(params);
				return connection;
			},
			catch: (error) => new ConnectionError(`Connection failed: ${error}`),
		}),
		CONNECTION_RETRY_POLICY,
	);

// const executeCommand = (
// 	connection: Telnet,
// 	command: string,
// 	platform: Platform,
// ): Effect.Effect<string, CommandError> =>
// 	Effect.tryPromise({
// 		try: async () => {
// 			let output = "";
// 			const result = await connection.write(`${command}\n`);
// 			output += result;

// 			while (output.includes(platform.morePrompt)) {
// 				const moreResult = await connection.write(" ");
// 				output += moreResult.replace(platform.morePrompt, "");
// 			}
// 			return output;
// 		},
// 		catch: (error) => new CommandError(`Command execution failed: ${error}`),
// 	});

const executeCommand = (
	connection: Telnet,
	command: string,
	platform: Platform,
): Effect.Effect<string, CommandError> =>
	Effect.gen(function* () {
		// Send command
		const result = yield* Effect.tryPromise(() =>
			connection.write(`${command}\n`),
		);

		let output = result;

		// Handle "More" prompts
		while (output.includes(platform.morePrompt)) {
			yield* Effect.sleep("50 millis"); // Small delay between spaces
			const moreResult = yield* Effect.tryPromise(() => connection.write(" "));
			output += moreResult.replace(platform.morePrompt, "");
		}

		return output;
	}).pipe(
		Effect.catchAll((error) =>
			Effect.fail(new CommandError(`Command execution failed: ${error}`)),
		),
	);

const createManagedConnection = (
	config: ConnectionConfig,
): Effect.Effect<Telnet, ConnectionError, Scope.Scope> =>
	Effect.acquireRelease(
		pipe(
			createAuthenticatedConnection(config),
			Effect.retry(CONNECTION_RETRY_POLICY),
		),
		// Acquire
		// createAuthenticatedConnection(config),

		// Release
		// (connection) =>
		// 	Effect.promise(() =>
		// 		connection
		// 			.write("quit\n")
		// 			.then(() => new Promise((resolve) => setTimeout(resolve, 100)))
		// 			.then(() => connection.write("y\n"))
		// 			.then(() => connection.end()),
		// 	).pipe(Effect.orDie), // Just convert errors to defects
		(connection) =>
			Effect.gen(function* () {
				// Quit sequence
				yield* Effect.tryPromise(() => connection.write("quit\n"));
				yield* Effect.sleep("100 millis");
				yield* Effect.tryPromise(() => connection.write("y\n"));
				yield* Effect.tryPromise(() => connection.end());
			}).pipe(Effect.orDie), // Just convert errors to defects,
	);

const runTelnetCommand = (
	config: ConnectionConfig,
	commands: string[],
): Effect.Effect<string, ConnectionError | CommandError> =>
	pipe(
		Effect.gen(function* (_) {
			const platform = PLATFORMS[config.platform || "HUAWEI"];

			// Use managed connection
			const connection = yield* createManagedConnection(config);

			// Execute commands
			let output = "";
			for (const command of commands) {
				const result = yield* executeCommand(connection, command, platform);
				output += result;
			}

			return output;
		}),
		Effect.scoped, // Ensure proper resource cleanup
	);

// Public API
export const runOLTCommandsTelnet = (
	config: ConnectionConfig,
	commands: string[],
): Promise<string> =>
	Effect.runPromise(
		pipe(
			runTelnetCommand(config, commands),
			Effect.tap((output) =>
				Effect.sync(() => console.log("Command output:", output)),
			),
			Effect.catchAll((error) =>
				Effect.fail(`Command execution failed: ${error.message}`),
			),
		),
	);
