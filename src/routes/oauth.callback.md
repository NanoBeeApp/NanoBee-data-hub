# OAuth Callback Route

## Requirements
- Change the frontend OAuth callback route from `/oauth/demo/callback` to `/oauth/callback`.
- Keep the core authorization-code-for-token exchange flow unchanged.
- Ensure the callback URL in the local example configuration matches the new route.

## Implementation Details
- Renamed the route file: `oauth.demo.callback.tsx` -> `oauth.callback.tsx`.
- Updated the `createFileRoute` path to `/oauth/callback`.
- Updated the default `redirectUri` fallback value to `${window.location.origin}/oauth/callback`.
- Synchronised `VITE_AUTH_REDIRECT_URI` and `AUTH_REDIRECT_URI` in `.env.example`.

## Verification Plan
1. Start the development server and confirm the project compiles and starts normally.
2. Visit `/oauth/callback?code=test` and confirm the callback handling logic is triggered and redirects back to the home page.
3. Visit the old address `/oauth/demo/callback` directly and confirm it no longer matches any callback page.
4. Check `.env.example` and confirm the callback URL has been updated to the new path.

## Verification Results
- Development server started (`npm run dev -- --host 127.0.0.1 --port 5173`); project starts normally.
- Playwright headless visit to `http://127.0.0.1:5173/oauth/callback?code=test` ended at path `/`, confirming the new callback route is active and the callback logic fires.
- Playwright headless visit to `http://127.0.0.1:5173/oauth/demo/callback` showed page text `Not Found`, confirming the old callback route is no longer active.
- Checked `.env.example` via command; both entries are now on the new path:
  - `VITE_AUTH_REDIRECT_URI=http://localhost:5173/oauth/callback`
  - `AUTH_REDIRECT_URI=http://localhost:5173/oauth/callback`
- `npm run build` passed; the build output contains the `oauth.callback` build artifact.
