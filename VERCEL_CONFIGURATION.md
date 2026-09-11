# Vercel Configuration

## Problem

Deploying this Express app to Vercel produced two errors:

1. `500 FUNCTION_INVOCATION_FAILED` — "This Serverless Function has crashed."
2. `401 Protected deployment` (Vercel Authentication / SSO) when hit from Postman.

## Causes

1. No `vercel.json` / entry point existed for Vercel to build the Express app as a
   serverless function, and `index.js` only called `app.listen()`, which doesn't
   work in a serverless environment.
2. `db/db.js` called `process.exit(1)` when MongoDB failed to connect. On Vercel,
   `process.exit()` kills the entire serverless function process, so every
   request crashed instead of returning an error response. This was triggered by
   `MONGO_URL` / `JWT_SECRET` not being set as Environment Variables in the Vercel
   project (`.env` is gitignored, so those secrets never reached Vercel).
3. The `401 Protected deployment` response is unrelated to the code — it's
   Vercel's **Deployment Protection** (Vercel Authentication/SSO), which is
   enabled by default on preview/git-branch URLs (`*-git-main-*.vercel.app`) on
   Pro/Team plans.

## Code changes

- **`db/db.js`** — `connectDB()` no longer calls `process.exit(1)`. It caches the
  connection promise and rejects on failure so callers can handle the error
  instead of the process dying.
- **`index.js`**
  - Added middleware that `await`s `connectDB()` before routes run and returns a
    `500 { message }` JSON response on failure instead of crashing.
  - `app.listen()` only runs when **not** on Vercel (checked via the
    `process.env.VERCEL` flag Vercel sets automatically) — locally it still
    behaves like a normal Node server.
  - Fixed `cookie-parser` middleware being registered *after* the routes (it
    now runs before, so `req.cookies` is populated for the route handlers).
  - `export default app;` so Vercel's `@vercel/node` builder can use the
    Express app as the serverless request handler.
- **`vercel.json`** (new) — builds `index.js` with `@vercel/node` and routes all
  paths to it:

  ```json
  {
    "version": 2,
    "builds": [{ "src": "index.js", "use": "@vercel/node" }],
    "routes": [{ "src": "/(.*)", "dest": "index.js" }]
  }
  ```

## Required Vercel dashboard setup

These steps must be done manually in the Vercel dashboard — they can't be set
from code:

1. **Environment Variables** — Project → Settings → Environment Variables → add:
   - `MONGO_URL`
   - `JWT_SECRET`

   Set them for all environments you test (Production/Preview/Development), then
   redeploy.

2. **Deployment Protection** — Project → Settings → Deployment Protection:
   - Disable "Vercel Authentication" for the environment you're testing, **or**
   - Test against the production domain instead of the `-git-main-` preview
     alias, **or**
   - Generate a Protection Bypass token if you want protection to stay on.

## CORS error calling the API from the frontend

Calling `https://<your-production-domain>/api/user/signup` (or `/login`) from a
browser-based frontend (localhost during dev, or a deployed frontend on a
different domain) failed with a CORS error. Express had no CORS middleware at
all, so the browser blocked the cross-origin response.

### Fix

- Added the `cors` package and registered it in `index.js` **before** other
  middleware, with `credentials: true` (required because `/login` and
  `/signup` set an auth cookie) and `origin` restricted to an allowlist (a
  wildcard `origin: "*"` is rejected by browsers whenever `credentials: true`
  is set).
- The allowlist comes from `CLIENT_URL` (comma-separated), falling back to
  `http://localhost:3000,http://localhost:5173` for local dev.
- The auth cookie now sets `secure: true` and `sameSite: "none"` when running
  on Vercel (needed for the cookie to survive a cross-site request — the
  frontend and `trackly-be.vercel.app` are different origins) and
  `sameSite: "lax"` with `secure: false` for local HTTP dev.

### Required Vercel dashboard setup

Add `CLIENT_URL` as an Environment Variable (Project → Settings →
Environment Variables) with your deployed frontend's origin, e.g.:

```
CLIENT_URL=https://your-frontend.vercel.app
```

Use a comma-separated list if you need more than one allowed origin (e.g. a
deployed frontend plus a local dev URL). Redeploy after setting it. On the
frontend, requests must be made with credentials included
(`fetch(url, { credentials: "include" })` or `axios` with
`withCredentials: true`), or the auth cookie will never be sent/stored.

## Verifying

After setting env vars and redeploying:

```
POST https://<your-production-domain>/api/user/signup
Content-Type: application/json

{ "name": "...", "email": "...", "password": "..." }
```

Should return a normal JSON response instead of a crash.
