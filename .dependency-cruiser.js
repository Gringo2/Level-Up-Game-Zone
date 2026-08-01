/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		{
			name: "no-circular",
			severity: "error",
			comment: "Warns against circular dependencies.",
			from: {},
			to: { circular: true },
		},
		{
			name: "client-cannot-import-server",
			severity: "error",
			comment:
				"Client package must remain a thin client. Do not import server logic.",
			from: { path: "^packages/client/src" },
			to: { path: "^packages/server/src" },
		},
		{
			name: "client-cannot-import-firebase-admin",
			severity: "error",
			comment:
				"Thin client must not bypass the Express backend using firebase-admin.",
			from: { path: "^packages/client/src" },
			to: { path: "firebase-admin" },
		},
		{
			name: "shared-cannot-import-client",
			severity: "error",
			comment:
				"Shared package must remain pure and cannot depend on client UI code.",
			from: { path: "^packages/shared/src" },
			to: { path: "^packages/client/src" },
		},
		{
			name: "shared-cannot-import-server",
			severity: "error",
			comment:
				"Shared package must remain pure and cannot depend on server logic.",
			from: { path: "^packages/shared/src" },
			to: { path: "^packages/server/src" },
		},
	],
	options: {
		doNotFollow: { path: "node_modules" },
		includeOnly: "^packages",
		tsPreCompilationDeps: true,
	},
};
