import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { accountApiPlugin } from "./server/accountBook";

export default defineConfig({
  // GitHub Pages 项目页：https://<user>.github.io/FasherLife/
  base: process.env.GITHUB_PAGES === "1" ? "/FasherLife/" : "/",
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
