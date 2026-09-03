# Level-Up Game Zone

Level-Up Game Zone is a TypeScript monorepo for managing game sales, keno, store credits, expenses, users, and shifts.

## Prerequisites

- Node.js and npm
- A Firebase project configured for the application
- A Firebase Admin service-account key for the server

## Setup

Install all workspace dependencies from the repository root:

```bash
npm install
```

Save the Firebase Admin service-account JSON file as:

```text
packages/server/serviceAccountKey.json
```

This file is gitignored and must not be committed. The client Firebase configuration lives in `packages/client/.env.local` as `VITE_FIREBASE_*` variables (see `.env.example`; untracked since M-82/TD-016). The server optionally takes `FIRESTORE_DATABASE_ID` in `packages/server/.env`.

### Server Security Configuration

The Express API ships with helmet security headers, per-IP rate limiting, and a CORS allowlist (TD-010/011/012). All three are configurable via environment variables in `packages/server/.env` — see the root `.env.example`:

- `CORS_ORIGINS` — comma-separated browser origins allowed to call the API. Unset defaults to loopback dev origins (`localhost:3000`, `localhost:3002`, `localhost:5173`). Requests without an `Origin` header (curl, server-to-server) are always permitted. In production, set this to your deployed client origin(s).
- `RATE_LIMIT_WINDOW_MS` — rate-limit sliding window in ms (default 900000 = 15 min).
- `API_RATE_LIMIT_MAX` — max requests per IP per window on `/api` (default 300).
- `MUTATION_RATE_LIMIT_MAX` — stricter budget for POST/PUT/PATCH/DELETE within the same window (default 60).

## Serve The Full Project

Start both the Express API and the Vite client from the repository root:

```bash
npm run dev
```

Open the client at [http://localhost:3002](http://localhost:3002). The API runs at [http://localhost:4001](http://localhost:4001), and its health check is available at [http://localhost:4001/api/health](http://localhost:4001/api/health).

The combined command is equivalent to running these in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

## Build And Run

Build the shared package, client, and server:

```bash
npm run build
```

After building, run the compiled server from the repository root with:

```bash
npm start
```

To preview the production client build:

```bash
npm run preview --workspace=@level-up/client
```

## Verification

Run the client typecheck and repository tests:

```bash
npx tsc -p packages/client/tsconfig.json --noEmit
npx vitest run
```
