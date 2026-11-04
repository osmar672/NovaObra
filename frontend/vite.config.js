import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const backend = loadEnv(mode, fileURLToPath(new URL("../backend", import.meta.url)), "");
  return {
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        "/api": {
          target: `http://${backend.HOST || "127.0.0.1"}:${backend.PORT || "3001"}`,
          changeOrigin: true,
        },
      },
    },
  };
});
