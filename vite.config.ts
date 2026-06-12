import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from 'vite-tsconfig-paths';
import path from "path";
import type { Plugin } from 'vite';

// Hono API 中间件插件（仅开发环境用于热更新）
// 实际 API 请求通过 ssr.tsx 处理
function honoApiPlugin(): Plugin {
	return {
		name: 'hono-api-info',
		configureServer() {
			console.log('[Hono] API 端点将通过 SSR 入口处理');
			console.log('[Hono] /api/* 和 /health 请求会被路由到 Hono Worker');
		},
	};
}

export default defineConfig({
	plugins: [
		honoApiPlugin(), // 必须在最前面，确保优先处理 API 请求
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
