import { Effect, pipe, Schedule, type Scope } from "effect";
import { Telnet, type ConnectOptions } from "telnet-client";

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

const CONNECTION_RETRY_POLICY = pipe(
	Schedule.exponential("1 seconds"), // Membuat jadwal retry dengan delay exponential
	Schedule.whileInput(
		// Filter retry berdasarkan jenis error
		(error: ConnectionError) =>
			!error.message.includes("handshake") &&
			!error.message.includes("account is locked"),
	),
	Schedule.compose(Schedule.recurs(2)), // Batasi retry maksimal 2 kali
	Schedule.either(Schedule.spaced("1 seconds")), // Fallback ke fixed delay jika exponential gagal
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

// 2. Membuat koneksi dengan authentikasi
const createAuthenticatedConnection = (
	config: ConnectionConfig,
): Effect.Effect<Telnet, ConnectionError> =>
	Effect.retry(
		Effect.tryPromise({
			// Wrap async operation (Telnet connection) dalam Effect
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
			catch: (error) => new ConnectionError(`Connection failed: ${error}`), // Transform error ke ConnectionError
		}),
		CONNECTION_RETRY_POLICY, // Terapkan retry policy
	);

const executeCommand = (
	connection: Telnet,
	command: string,
	platform: Platform,
	errorPatterns: string[] = [], // Default empty array jika tidak diberikan
): Effect.Effect<string, CommandError> =>
	Effect.gen(function* () {
		const result = yield* Effect.tryPromise(() =>
			connection.write(`${command}\n`),
		);

		let output = result;

		// Check custom error patterns
		if (
			errorPatterns.length > 0 &&
			errorPatterns.some((pattern) => output.includes(pattern))
		) {
			return yield* Effect.fail(
				new CommandError(
					`Command failed: ${command}, matched error pattern in output: ${output}`,
				),
			);
		}

		// Handle More prompts
		while (output.includes(platform.morePrompt)) {
			yield* Effect.sleep("50 millis");
			const moreResult = yield* Effect.tryPromise(() => connection.write(" "));
			output += moreResult.replace(platform.morePrompt, "");

			// Check error patterns again after more output
			if (
				errorPatterns.length > 0 &&
				errorPatterns.some((pattern) => output.includes(pattern))
			) {
				return yield* Effect.fail(
					new CommandError(
						`Command failed after more prompt: ${command}, matched error pattern in output: ${output}`,
					),
				);
			}
		}

		return output;
	}).pipe(
		// Transform semua error ke CommandError
		Effect.catchAll((error) =>
			Effect.fail(new CommandError(`Command execution failed: ${error}`)),
		),
	);

// 4. Resource management dengan acquireRelease
const createManagedConnection = (
	config: ConnectionConfig,
): Effect.Effect<Telnet, ConnectionError, Scope.Scope> =>
	Effect.acquireRelease(
		// Acquire connection
		pipe(
			createAuthenticatedConnection(config),
			Effect.retry(CONNECTION_RETRY_POLICY),
		),
		// Release connection
		(connection) =>
			Effect.gen(function* () {
				// Cleanup sequence dengan Effect
				yield* Effect.tryPromise(() => connection.write("quit\n"));
				yield* Effect.sleep("100 millis");
				yield* Effect.tryPromise(() => connection.write("y\n"));
				yield* Effect.tryPromise(() => connection.end());
			}).pipe(Effect.orDie), // Convert cleanup errors ke defects
	);

// 5. Main program flow
const runTelnetCommand = (
	config: ConnectionConfig,
	commands: string[],
	errorPatterns: string[] | [],
): Effect.Effect<string, ConnectionError | CommandError> =>
	pipe(
		Effect.gen(function* (_) {
			const platform = PLATFORMS[config.platform || "HUAWEI"];

			// Generator untuk main flow
			const connection = yield* createManagedConnection(config);

			// Execute commands
			let output = "";

			// Execute commands sequentially
			for (const command of commands) {
				const result = yield* executeCommand(
					connection,
					command,
					platform,
					errorPatterns,
				);
				output += result;
			}

			return output;
		}),
		Effect.scoped, // Ensure resource cleanup via Scope
	);

// 6. Public API dengan Promise interface
export const runOLTCommandsTelnet = (
	config: ConnectionConfig,
	commands: string[],
	errorPatterns: string[] | [],
): Promise<string> =>
	Effect.runPromise(
		pipe(
			runTelnetCommand(config, commands, errorPatterns),
			Effect.tap((output) =>
				Effect.sync(() => console.log("Command output:", output)),
			),
			Effect.catchAll((error) =>
				Effect.fail(`Command execution failed: ${error.message}`),
			),
		),
	);
