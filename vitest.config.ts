import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const setupFile = new URL("./vitest.setup.ts", import.meta.url).pathname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [setupFile],
  },
});
