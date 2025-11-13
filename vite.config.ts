import { defineConfig, mergeConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { baseConfig } from "./vite.base";

/**
 * Vite configuration for development and production builds
 * Extends base config and adds TanStack Start plugin
 */
const config = defineConfig({
  plugins: [],
});

export default mergeConfig(baseConfig, config);
