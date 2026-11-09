import path from "node:path";
import adapterAuto from "@sveltejs/adapter-auto";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	envPrefix: ["VITE_", "PUBLIC_"],
	resolve: {
		alias: {
			$lib: path.resolve("./src/lib"),
		},
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
			},
			adapter: adapterAuto(),
		}),
	],
});
