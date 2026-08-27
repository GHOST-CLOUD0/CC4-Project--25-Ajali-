import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [react()],
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    define: {
      "process.env.VITE_API_URL": JSON.stringify(env.VITE_API_URL ?? ""),
      "process.env.VITE_GOOGLE_MAPS_KEY": JSON.stringify(env.VITE_GOOGLE_MAPS_KEY ?? ""),
      "process.env.VITE_GOOGLE_MAPS_MAP_ID": JSON.stringify(env.VITE_GOOGLE_MAPS_MAP_ID ?? ""),
    },
  };
});
