import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/meal-prep-budget-system/",
  // Fix: configure jsdom environment so @testing-library/react works out of the box
  test: {
    environment: "jsdom",
    globals: true,
  },
});
