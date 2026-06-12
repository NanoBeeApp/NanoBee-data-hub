import { createServerFn } from "@tanstack/react-start";

// Replaces the original /api/hello
export const getHello = createServerFn({ method: "GET" })
  .inputValidator((input: { name?: string }) => input)
  .handler(async ({ data }) => {
    const name = data?.name || "World";
    return { message: `Hello, ${name}!` as const };
  });

// Replaces the original /api/health
export const getHealth = createServerFn({ method: "GET" }).handler(async () => {
  return { ok: true, timestamp: new Date().toISOString() };
});
