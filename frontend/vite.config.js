import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, fileURLToPath(new URL("../backend", import.meta.url)), "");
  const target = `http://${env.HOST || "127.0.0.1"}:${env.PORT || 3003}`;
  return {
    root: fileURLToPath(new URL(".", import.meta.url)),
    server: {
      host: "127.0.0.1",
      port: 5174,
      strictPort: true,
      proxy: {
        "/api": { target },
        "/robots.txt": { target },
        "/sitemap.xml": { target },
      },
    },
    build: { outDir: "dist", emptyOutDir: true },
  };
});
