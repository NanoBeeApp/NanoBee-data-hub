# API Client

## Requirements

- Create a type-safe Hono RPC client
- Automatically resolve the correct API base URL (development / production)
- Provide a clean and concise API call interface
- Full TypeScript type inference throughout

## Implementation Details

### Core Features
- Uses the `hc` function from `hono/client` to create the client
- Imports the backend `AppType` to achieve end-to-end type safety
- Automatically uses the current domain as the API base URL

### Usage

#### GET Requests
```typescript
import { apiClient } from '@/lib/api-client';

// With query parameters
const result = await apiClient.api.hello.$get({
  query: { name: 'John' }
});
const data = await result.json();

// Without parameters
const result = await apiClient.api.users.$get();
const data = await result.json();
```

#### POST Requests
```typescript
// With JSON body
const result = await apiClient.api.hello.$post({
  json: { name: 'John' }
});
const data = await result.json();

// Create a user
const result = await apiClient.api.users.$post({
  json: {
    name: 'Jane',
    email: 'jane@example.com'
  }
});
const newUser = await result.json();
```

### Type Safety
All request parameters and response data have full type inference:
- Request parameter type checking
- Response data type inference
- Compile-time error detection

## Verification

### Verification Plan
1. Import and use the client inside a React component
2. Test various API calls
3. Verify type safety
4. Check error handling

### Verification Method
Inspect the following in the browser console:
- Whether requests are sent successfully
- Whether the response data format is correct
- Whether TypeScript type hints are accurate
- How errors are handled

## Current Status
✅ Client creation complete
⏳ Pending: usage inside components
⏳ Pending: error handling
