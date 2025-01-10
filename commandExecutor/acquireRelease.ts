import { Effect } from "effect";

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

// Create the resource management workflow
//
//      ┌─── Effect<MyResource, Error, Scope>
//      ▼
const resource = Effect.acquireRelease(acquire, release);

console.log(resource);
