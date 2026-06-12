/** Shared test sleep — was copy-pasted into sixteen browser test files. */
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
