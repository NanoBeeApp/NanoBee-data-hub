import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from 'vite-tsconfig-paths';
import path from "path";
import type { Plugin } from 'vite';

// Hono API middleware plugin (dev only — for HMR info logging)
// Actual API requests are handled through ssr.tsx
function honoApiPlugin(): Plugin {
	return {
		name: 'hono-api-info',
		configureServer() {
			console.log('[Hono] API endpoints will be handled via the SSR entry');
			console.log('[Hono] /api/* and /health requests will be routed to the Hono Worker');
		},
	};
}

export default defineConfig({
	// Fixed, known dev port so NanoBee's DATA_HUB_URL (http://127.0.0.1:3344)
	// always reaches the hub. Bind IPv4 loopback explicitly: Vite's default
	// `localhost` host resolves to ::1 (IPv6) on macOS, which a literal
	// 127.0.0.1 fetch from NanoBee's worker cannot reach. strictPort fails loud
	// instead of silently drifting to another port and breaking the contract.
	server: {
		port: 3344,
		strictPort: true,
		host: "127.0.0.1",
	},
	plugins: [
		honoApiPlugin(), // must be first to ensure API requests are handled with priority
		devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
});
