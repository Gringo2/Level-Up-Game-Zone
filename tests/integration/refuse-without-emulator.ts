// M-134 / ACP-042: run only by playwright.integration.config.ts when the Firebase
// emulators are NOT present, so a stray `playwright test --config ...` can never
// start servers or touch a real project.
export default function refuse(): never {
	throw new Error(
		"Integration browser tests only run against the Firebase emulators with a demo- project. Use `npm run test:integration`.",
	);
}
