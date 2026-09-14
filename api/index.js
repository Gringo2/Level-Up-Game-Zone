/**
 * api/index.js — Vercel Serverless Function entry point
 *
 * Imports the compiled Express application instance and exposes it
 * as the default export for Vercel's Node.js runtime.
 */
import app from "../packages/server/dist/app.js";

export default app;
