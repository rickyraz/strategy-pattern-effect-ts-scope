import { pipe, Effect } from "effect";

// -- PIPE

// Define simple arithmetic operations
const increment = (x: number) => x + 1;
const double = (x: number) => x * 2;
const subtractTen = (x: number) => x - 10;

// Sequentially apply these operations using `pipe`
const result = pipe(90, increment, double, subtractTen);
console.log(result);

// -- MAP

// Function to add a small service charge to a transaction amount
const addServiceCharge = (amount: number) => amount + 1;
// Simulated asynchronous task to fetch a transaction amount from database
const fetchTransactionAmount = Effect.promise(() => Promise.resolve(100));
// Apply service charge to the transaction amount
const finalAmount = pipe(fetchTransactionAmount, Effect.map(addServiceCharge));
Effect.runPromise(finalAmount).then(console.log); // Output: 101

// -- AS

// Replace the value 5 with the constant "new value"
const program = pipe(Effect.succeed(5), Effect.as("new value"));
Effect.runPromise(program).then(console.log); // Output: "new value"

// -- FLAT-MAP

// Function to apply a discount safely to a transaction amount
const applyDiscount = (
	total: number,
	discountRate: number,
): Effect.Effect<number, Error> =>
	discountRate === 0 || discountRate < 0
		? Effect.fail(new Error("Discount rate cannot be zero or least then zero"))
		: Effect.succeed(total - (total * discountRate) / 100);

// Using Effect.flatMap

const result1 = pipe(
	fetchTransactionAmount,
	Effect.map((amount) => amount * 2),
	Effect.flatMap((amount) => applyDiscount(amount, 5)),
);

Effect.runPromise(result1).then(console.log); // Output: 190

// Using Effect.andThen

const result2 = pipe(
	fetchTransactionAmount,
	Effect.andThen((amount) => amount * 2),
	Effect.andThen((amount) => applyDiscount(amount, 5)),
);

Effect.runPromise(result2).then(console.log); // Output: 190
