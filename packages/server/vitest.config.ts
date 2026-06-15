import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // node:sqlite is an experimental builtin Vite doesn't know to externalize yet.
    server: { deps: { external: ["node:sqlite", /node:sqlite/] } },
  },
  ssr: { external: ["node:sqlite"] },
});
