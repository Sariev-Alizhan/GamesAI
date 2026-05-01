// Vercel serverless entry point. Re-exports the Express app so Vercel can
// route requests through it (both API endpoints and static asset serving).
export { default } from '../src/web/server.js';
