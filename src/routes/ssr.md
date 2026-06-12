# SSR Example Page

## Requirements
Demonstrate the core SSR (Server-Side Rendering) capabilities of TanStack Start, including route loader data pre-fetching and client-side hydration.

## Implementation Details
- Uses a route `loader` to pre-fetch data on the server (serverInfo + articles)
- Retrieves pre-fetched data inside components via `Route.useLoaderData()`
- Compares the server render time with the client hydration time to visually demonstrate the SSR effect
- Includes an explanation of how SSR works

## Component Breakdown
- `SSRPage`: main page container
- `SSRPageHeader`: page title
- `ServerInfoCard`: server information display
- `InfoRow`: individual information row
- `ArticleListCard`: article list
- `ArticleItem`: single article entry
- `SSRExplanation`: SSR principles explanation
- `BackToHomeLink`: back-to-home navigation link

## Verification Steps
1. Visit the `/ssr` page and verify the page renders correctly
2. Confirm that the server info and article list are displayed immediately (no loading state)
3. View the page source and confirm that the data is embedded in the HTML
4. Verify that the server render time and client hydration time differ
5. Click the "Back to Home" button and verify navigation works
6. Click the SSR example link from the home page and verify navigation works
