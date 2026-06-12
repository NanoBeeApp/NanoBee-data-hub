import { defineConfig } from "@tanstack/react-start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    preset: "cloudflare-pages",
    // Custom server entry
    entry: "./src/server-entry.ts",
  },
});
