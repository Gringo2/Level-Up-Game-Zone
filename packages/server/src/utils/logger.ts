import pino from "pino";

// TD-024: single structured logger for the Express Backend.
// JSON-lines output, LOG_LEVEL override, sensitive-key redaction.

const REDACT_PATHS = [
	"authorization",
	"idToken",
	"refreshToken",
	"password",
	"token",
	"req.headers.authorization",
];

export function createLogger(
	env: NodeJS.ProcessEnv = process.env,
	stream?: NodeJS.WritableStream,
) {
	return pino(
		{
			level: env.LOG_LEVEL ?? "info",
			redact: { paths: REDACT_PATHS, censor: "[REDACTED]" },
			base: undefined,
		},
		stream,
	);
}

export const logger = createLogger();
