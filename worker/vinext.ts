import handler from "vinext/server/fetch-handler";
import { addLinuskuServiceWorkerScope } from "../src/lib/cloudflareServiceWorker.js";

export default {
  async fetch(request, env, ctx) {
    const response = await handler.fetch(request, env, ctx);
    return addLinuskuServiceWorkerScope(request, response);
  },
};
