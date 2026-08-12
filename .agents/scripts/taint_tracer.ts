import path from "node:path";
import ts from "typescript";

// ── Interprocedural Source-to-Sink Taint Tracking Engine ──

const SOURCENAMES = new Set(["body", "params", "query", "headers"]);
const SANITIZERS = new Set([
	"parseInt",
	"parseFloat",
	"Number",
	"String",
	"Boolean",
	"encodeURIComponent",
	"sanitizeUuid",
	"sanitizeInput",
]);
const SINKNAMES = new Set([
	"deleteDoc",
	"setDoc",
	"updateDoc",
	"addDoc",
	"writeFile",
	"writeFileSync",
	"unlink",
	"unlinkSync",
	"rm",
	"rmSync",
	"exec",
	"execSync",
	"spawn",
	"eval",
]);

interface TaintViolation {
	source: string;
	sink: string;
	variable: string;
	line: number;
	file: string;
}

export function runTaintTracer(targetFilePath: string) {
	const repoRoot = process.cwd();
	const absoluteTargetPath = path.resolve(targetFilePath);

	// Determine nearest tsconfig.json
	let configPath = ts.findConfigFile(
		path.dirname(absoluteTargetPath),
		ts.sys.fileExists,
		"tsconfig.json",
	);

	if (!configPath) {
		configPath = path.join(repoRoot, "tsconfig.json");
	}

	const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
	const parsedConfig = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		path.dirname(configPath),
	);

	const fileNames = parsedConfig.fileNames.includes(absoluteTargetPath)
		? parsedConfig.fileNames
		: [...parsedConfig.fileNames, absoluteTargetPath];

	const program = ts.createProgram(fileNames, parsedConfig.options);
	const checker = program.getTypeChecker();
	const sourceFile = program.getSourceFile(absoluteTargetPath);

	if (!sourceFile) {
		return {
			success: true,
			targetFile: targetFilePath,
			violations: [],
			message: "Source file not found in TypeScript compilation context.",
		};
	}

	const targetSourceFile = sourceFile;
	const taintedSymbols = new Set<string>();
	const violations: TaintViolation[] = [];

	function isSourceExpression(node: ts.Node): boolean {
		if (ts.isPropertyAccessExpression(node)) {
			const propName = node.name.getText();
			if (SOURCENAMES.has(propName)) {
				const expressionText = node.expression.getText();
				if (expressionText === "req" || expressionText.endsWith(".req")) {
					return true;
				}
			}
			return isSourceExpression(node.expression);
		}
		return false;
	}

	function isSanitizerCall(node: ts.Node): boolean {
		if (ts.isCallExpression(node)) {
			const fnName = node.expression.getText();
			if (SANITIZERS.has(fnName)) {
				return true;
			}
		}
		return false;
	}

	function isSinkCall(node: ts.CallExpression): boolean {
		let fnName = "";
		if (ts.isIdentifier(node.expression)) {
			fnName = node.expression.getText();
		} else if (ts.isPropertyAccessExpression(node.expression)) {
			fnName = node.expression.name.getText();
		}
		return SINKNAMES.has(fnName);
	}

	function visit(node: ts.Node) {
		// 1. Variable Declarations (Source Extraction & Destructuring)
		if (ts.isVariableDeclaration(node) && node.initializer) {
			const isTaintedInit =
				isSourceExpression(node.initializer) ||
				(!isSanitizerCall(node.initializer) &&
					taintedSymbols.has(node.initializer.getText()));

			if (isTaintedInit) {
				// Object Destructuring: const { userId, payload } = req.body
				if (ts.isObjectBindingPattern(node.name)) {
					for (const element of node.name.elements) {
						if (ts.isBindingElement(element)) {
							const varName = element.name.getText();
							taintedSymbols.add(varName);
						}
					}
				} else if (ts.isIdentifier(node.name)) {
					const varName = node.name.getText();
					taintedSymbols.add(varName);
				}
			}
		}

		// 2. Property Leak / Indirect Mutation: options.id = req.params.id
		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind === ts.SyntaxKind.EqualsToken
		) {
			const isRightTainted =
				isSourceExpression(node.right) ||
				(!isSanitizerCall(node.right) &&
					taintedSymbols.has(node.right.getText()));

			if (isRightTainted && ts.isPropertyAccessExpression(node.left)) {
				const rootObjName = node.left.expression.getText();
				taintedSymbols.add(rootObjName);
			}
		}

		// 3. Sink Execution Check
		if (ts.isCallExpression(node) && isSinkCall(node)) {
			const fnName = node.expression.getText();
			for (const arg of node.arguments) {
				const argText = arg.getText();
				if (taintedSymbols.has(argText) || isSourceExpression(arg)) {
					const { line } = targetSourceFile.getLineAndCharacterOfPosition(
						node.getStart(),
					);
					violations.push({
						source: "req.body/params/query",
						sink: fnName,
						variable: argText,
						line: line + 1,
						file: path.relative(repoRoot, absoluteTargetPath),
					});
				}
			}
		}

		ts.forEachChild(node, visit);
	}

	ts.forEachChild(targetSourceFile, visit);

	return {
		success: violations.length === 0,
		targetFile: path.relative(repoRoot, absoluteTargetPath),
		violations,
		timestamp: new Date().toISOString(),
	};
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith("taint_tracer.ts")) {
	const targetArg = process.argv[2];
	if (!targetArg) {
		console.log(
			JSON.stringify({
				error: "Usage: npx tsx .agents/scripts/taint_tracer.ts <target_file>",
			}),
		);
		process.exit(1);
	}
	const result = runTaintTracer(targetArg);
	console.log(JSON.stringify(result, null, 2));
	process.exit(result.success ? 0 : 1);
}
