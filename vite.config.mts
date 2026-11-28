import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { kvDataAdapter } from "@vinext/cloudflare/cache/kv-data-adapter";

process.env.KAMPUSKITA_VINEXT = "1";

export default defineConfig({
  envDir: false,
  plugins: [
    vinext({ cache: { data: kvDataAdapter() } }),
    cloudflare({
      configPath: "wrangler.vinext.jsonc",
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
