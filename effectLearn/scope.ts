import { Scope, Effect, Console, Exit } from "effect";

const program =
	// create a new scope
	Scope.make().pipe(
		// add finalizer 1
		Effect.tap((scope) =>
			Scope.addFinalizer(scope, Console.log("finalizer 1")),
		),
		// add finalizer 2
		Effect.tap((scope) =>
			Scope.addFinalizer(scope, Console.log("finalizer 2")),
		),
		// close the scope
		Effect.andThen((scope) =>
			Scope.close(scope, Exit.succeed("scope closed successfully")),
		),
	);

Effect.runPromise(program);
/*
Output:
finalizer 2 <-- finalizers are closed in reverse order
finalizer 1
*/

// ------- // Managing scopes directly with Scope is possible, it’s more common to use
// :: higher-level functions like Effect.addFinalizer or Effect.acquireUseRelease, which handle much of the complexity for you.

//      ┌─── Effect<string, never, Scope>
//      ▼
const program2 = Effect.addFinalizer((exit) =>
	Console.log(`Finalizer executed. Exit status: ${exit._tag}`),
).pipe(Effect.andThen(Effect.succeed("some result")));

// Wrapping the effect in a scope
//
//      ┌─── Effect<string, never, never>
//      ▼
const runnable = Effect.scoped(program2);
Effect.runPromiseExit(runnable).then(console.log);

/*
  Output:
  Finalizer executed. Exit status: Success
  { _id: 'Exit', _tag: 'Success', value: 'some result' }
*/
