import { QueryClient } from "@tanstack/react-query";

// Create the TanStack Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // do not refetch automatically on window focus
      retry: 1, // retry once on failure
    },
  },
});
