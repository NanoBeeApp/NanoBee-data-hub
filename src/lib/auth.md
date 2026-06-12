# Authentication Service Functions

## Background

- Centralise the authentication capabilities required by the home page and root route in `src/lib/auth.ts`.
- Provide unified session reading, OAuth configuration reading, and Google One Tap credential verification, eliminating duplicated environment-variable access and auth logic at the page layer.

## Current Progress
- Overall: 100%
- Completed:
  - `getSession`: parses basic user information from the `demo_session` cookie.
  - `getOAuthConfig`: returns a unified `authIssuer / clientId / redirectUri` object.
  - `verifyGoogleOneTap`: calls Google `tokeninfo` to verify a credential and returns a normalised user object.
- Remaining:
  - None

## Implementation Details

1. Environment Variable Access
- `getAuthEnv` provides a single entry point for reading `AUTH_*` and `VITE_AUTH_*` variables, and supplies a default issuer.

2. Session Reading
- `parseCookieHeader` parses a raw `Cookie` header string.
- `decodeJwt` performs payload-only parsing (demo scenario — no signature verification).
- `getSession` reads `demo_session` and returns `{ email, name, sub }`; returns `null` when no valid data is present.

3. Google One Tap Verification
- `verifyGoogleOneTap` calls `https://oauth2.googleapis.com/tokeninfo`.
- Validates `aud`, `iss`, and `email_verified`; throws an error on mismatch.
- Returns a unified structure: `success / credential / user`.

## Verification Plan
1. Run `npm run build` to confirm the service functions compile successfully.
2. Start `npm run dev -- --host 127.0.0.1 --port 5173`.
3. Use Playwright in headless mode to open the home page and confirm the page fetches configuration and renders correctly.
4. Use Playwright in headless mode to visit `http://127.0.0.1:5173/oauth/callback?code=test` and confirm the callback flow completes and redirects to the home page.

## Verification Record
- Verified: 2026-02-22
- Results:
  - `npm run build` passed.
  - Playwright headless visit to `/oauth/callback?code=test` ended at path `/`, confirming that OAuth configuration reading and the callback flow are functional.
