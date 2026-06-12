import { defineConfig } from "@tanstack/react-start/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    preset: "cloudflare-pages",
    // 自定义服务器入口
    entry: "./src/server-entry.ts",
  },
});
