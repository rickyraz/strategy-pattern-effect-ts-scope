import { Effect, Console } from "effect";

// Define an interface for a resource
interface MyResource {
	readonly contents: string;
	readonly close: () => Promise<void>;
}

// Simulate resource acquisition
const getMyResource = (): Promise<MyResource> =>
	Promise.resolve({
		contents: "lorem ipsum",
		close: () =>
			new Promise((resolve) => {
				console.log("Resource released");
				resolve();
			}),
	});

// Define how the resource is acquired
const acquire = Effect.tryPromise({
	try: () =>
		getMyResource().then((res) => {
			console.log("Resource acquired");
			return res;
		}),
	catch: () => new Error("getMyResourceError"),
});

// Define how the resource is released
const release = (res: MyResource) => Effect.promise(() => res.close());

const use = (res: MyResource) => Console.log(`content is ${res.contents}`);

//      ┌─── Effect<void, Error, never>
//      ▼
const program = Effect.acquireUseRelease(acquire, use, release);

Effect.runPromise(program);
/*
Output:
Resource acquired
content is lorem ipsum
Resource released
*/
