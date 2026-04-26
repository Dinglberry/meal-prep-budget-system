import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/meal-prep-budget-system/",
  server: {
    host: true,
    allowedHosts: "all"
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
});