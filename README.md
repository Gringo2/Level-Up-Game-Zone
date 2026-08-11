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

This file is gitignored and must not be committed. The client Firebase configuration is stored in `packages/client/firebase-applet-config.json`.

## Serve The Full Project

Start both the Express API and the Vite client from the repository root:

```bash
npm run dev
```

Open the client at [http://localhost:3000](http://localhost:3000). The API runs at [http://localhost:4000](http://localhost:4000), and its health check is available at [http://localhost:4000/api/health](http://localhost:4000/api/health).

The combined command is equivalent to running these in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

## Build And Run

Build each workspace:

```bash
npm run build:server
npm run build:client
```

After building, run the compiled server with:

```bash
npm run start --workspace=@level-up/server
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
