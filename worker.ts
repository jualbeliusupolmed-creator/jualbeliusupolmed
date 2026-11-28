import openNextWorker, { DOQueueHandler } from "./.open-next/worker.js";
import { dispatchCloudflareCron } from "./src/lib/cloudflareCronWorker.js";
import {
  addLinuskuServiceWorkerScope,
  handleLinuskuServiceWorker,
} from "./src/lib/cloudflareServiceWorker.js";

export { DOQueueHandler };

export default {
  async fetch(request, env, ctx) {
    const swResponse = await handleLinuskuServiceWorker(request, env);
    if (swResponse) {
      return swResponse;
    }

    const response = await openNextWorker.fetch(request, env, ctx);
    return addLinuskuServiceWorkerScope(request, response);
  },
  scheduled(controller, env) {
    return dispatchCloudflareCron(controller, env);
  },
};
