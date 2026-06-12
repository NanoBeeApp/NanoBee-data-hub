# Root Route

## Background

- Pre-fetch the session during the root route's load phase so that child routes such as the home page can read the user's login state directly from the route context.

## Current Progress
- Overall: 100%
- Completed:
  - Call `getSession` inside `beforeLoad`.
  - Inject `session` into the root route context so child routes can access it.
- Remaining:
  - None

## Implementation Details
1. Add `beforeLoad` to `createRootRoute`.
2. Retrieve the session for the current request via `getSession`.
3. Return `{ session }` as the route context.

## Verification Plan
1. Run `npm run build` to confirm the root route and its context types compile correctly.
2. Start the development server and visit the home page to confirm the page renders normally.
3. Use Playwright in headless mode to verify that visiting the OAuth callback URL redirects back to the home page, confirming that the root route context and rendering pipeline work correctly.

## Verification Record
- Verified: 2026-02-22
- Results:
  - `npm run build` passed.
  - Playwright headless verification passed; the home page renders correctly.
