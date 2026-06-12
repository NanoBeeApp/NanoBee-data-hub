# SSR Server Functions

## Requirements
Provide server-side data-fetching functions for the SSR example page, demonstrating how TanStack Start Server Functions are used in an SSR context.

## Implementation Details
- `getServerInfo`: retrieves the server time and runtime environment information, used to display the SSR render time
- `getArticles`: simulates fetching an article list, including a 100 ms delay to simulate a database query

## Verification
1. Call these functions from the route loader inside the SSR page
2. Verify that the initial HTML contains server-side data (inspect page source)
3. Verify that the page interacts correctly after client-side hydration
