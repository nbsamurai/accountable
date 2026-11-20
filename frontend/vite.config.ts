import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The backend the dev server passes /api to. The end-to-end tests point it at their own backend.
const api = process.env.ACCOUNTABLE_API ?? "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: api },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/setupTests.ts"],
  },
});
