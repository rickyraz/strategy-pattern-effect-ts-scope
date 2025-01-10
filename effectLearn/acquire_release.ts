import { Effect, type Scope } from "effect";

// Type definitions
type DBPlatform = "MYSQL" | "POSTGRES";

type QueryResult = {
	rows: Array<{
		id: number;
		name: string;
	}>;
};

type DBConnection = {
	query: (sql: string) => Promise<QueryResult>;
	close: () => Promise<void>;
};

type DBConfig = {
	platform: DBPlatform;
	host: string;
	username: string;
	password: string;
};

const PLATFORMS = {
	MYSQL: {
		name: "MYSQL",
		connectString: "mysql://",
		errorPatterns: ["ER_", "ERROR 1"] as const,
	},
	POSTGRES: {
		name: "POSTGRES",
		connectString: "postgresql://",
		errorPatterns: ["ERROR:", "FATAL:"] as const,
	},
} as const;

class ConnectionError {
	readonly _tag = "ConnectionError";
	constructor(readonly message: string) {}
}

class QueryError {
	readonly _tag = "QueryError";
	constructor(readonly message: string) {}
}

const createAuthenticatedConnection = (
	config: DBConfig,
): Effect.Effect<DBConnection, ConnectionError> =>
	Effect.tryPromise({
		try: () => {
			const platform = PLATFORMS[config.platform];
			console.log(`Connecting to ${platform.connectString}${config.host}...`);

			return Promise.resolve({
				query: (sql: string): Promise<QueryResult> => {
					console.log(`Executing: ${sql}`);
					return Promise.resolve({
						rows: [{ id: 1, name: "test" }],
					});
				},
				close: (): Promise<void> => {
					console.log("Closing connection...");
					return Promise.resolve();
				},
			});
		},
		catch: (error) => new ConnectionError(`Failed to connect: ${error}`),
	});

const executeQuery = (
	connection: DBConnection,
	sql: string,
	_platform: (typeof PLATFORMS)[DBPlatform],
	errorPatterns: Array<string> = [],
): Effect.Effect<QueryResult, QueryError> =>
	Effect.tryPromise({
		try: async () => {
			const result = await connection.query(sql);
			if (
				errorPatterns.some((pattern) =>
					JSON.stringify(result).includes(pattern),
				)
			) {
				throw new Error("Query matched error pattern");
			}
			return result;
		},
		catch: (error) => new QueryError(`Query failed: ${error}`),
	});

const createManagedConnection = (
	config: DBConfig,
): Effect.Effect<DBConnection, ConnectionError, Scope.Scope> =>
	// Use Scope.Scope
	Effect.acquireRelease(createAuthenticatedConnection(config), (connection) =>
		Effect.promise(() => connection.close()).pipe(Effect.orDie),
	);

export const runQueries = (
	config: DBConfig,
	queries: Array<string>,
): Effect.Effect<Array<QueryResult>, ConnectionError | QueryError, never> =>
	// specify never for R
	Effect.scoped(
		//  menggunakan koneksi untuk menjalankan tiap command // Loop berjalan untuk setiap query dalam array --> Hasil query dikumpulkan dalam array output
		Effect.flatMap(createManagedConnection(config), (connection) =>
			Effect.gen(function* () {
				const platform = PLATFORMS[config.platform];
				const output: Array<QueryResult> = [];

				for (const sql of queries) {
					const result = yield* executeQuery(
						connection,
						sql,
						platform,
						Array.from(platform.errorPatterns),
					);
					output.push(result);
				}
				return output;
			}),
		),
	);

// Example usage:
// Simpan dalam file terpisah atau gunakan IIFE untuk contoh penggunaan

const main = async () => {
	const config: DBConfig = {
		platform: "MYSQL",
		host: "localhost",
		username: "root",
		password: "password",
	};

	const queries = ["SELECT * FROM users", "SELECT * FROM products"];

	try {
		const results = await Effect.runPromise(
			Effect.tap(runQueries(config, queries), (results) =>
				Effect.sync(() => console.log("Results:", results)),
			),
		);
		console.log("Success:", results);
	} catch (error) {
		console.error("Error:", error);
	}
};

// Run the example if not imported as module
if (import.meta.main) {
	main();
}

/**
 * Telnet                        // Database
 *
 * Acquire:
 * connect to telnet     <==>    connect to database
 *
 * Execute:
 * run telnet commands   <==>    run SQL queries
 *
 * Release:
 * quit & close telnet   <==>    close db connection
 *
 */
