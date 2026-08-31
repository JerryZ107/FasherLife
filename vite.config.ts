import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { accountApiPlugin } from "./server/accountBook";

export default defineConfig({
  plugins: [react(), accountApiPlugin()],
  server: {
    host: true,
    port: 5177,
    strictPort: true,
    watch: {
      ignored: ["**/public/art/**", "**/data/**"],
    },
  },
  preview: {
    host: true,
    port: 5177,
    strictPort: true,
  },
});
