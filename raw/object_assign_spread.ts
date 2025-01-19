// Contoh dengan data
const variables = { a: 1, b: 2 };
const processedVariables = { c: 3, b: 4 };

// Menggunakan spread
const resultSpread = {
	...variables, // { a: 1, b: 2 }
	...processedVariables, // { c: 3, b: 4 }
};
// resultSpread = { a: 1, b: 4, c: 3 }

// Menggunakan Object.assign
const resultAssign = Object.assign(
	{}, // target kosong
	variables, // { a: 1, b: 2 }
	processedVariables, // { c: 3, b: 4 }
);
// resultAssign = { a: 1, b: 4, c: 3 }

console.log(resultSpread);
console.log(resultAssign);
