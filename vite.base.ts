import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

/**
 * Shared Vite configuration used by both vite.config.ts and vitest.browser.config.ts
 * Contains common plugins and settings for development and testing
 */
export const baseConfig = defineConfig({
    plugins: [
        // Path aliases (@/* -> ./src/*)
        viteTsConfigPaths({
            projects: ["./tsconfig.json"],
        }),
        tailwindcss(),
        tanstackStart(),
        viteReact(),
    ],
});
