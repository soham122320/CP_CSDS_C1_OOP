import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { graphics: ["three"], react: ["react", "react-dom"] },
      },
    },
  },
  server: { host: "0.0.0.0", allowedHosts: true },
  preview: { host: "0.0.0.0", allowedHosts: true },
});
