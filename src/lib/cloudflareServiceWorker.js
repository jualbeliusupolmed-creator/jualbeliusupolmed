export function addLinuskuServiceWorkerScope(request, response) {
  if (new URL(request.url).pathname !== "/linusku/sw.js" || !response.ok) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("Service-Worker-Allowed", "/linusku");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function handleLinuskuServiceWorker(request, env) {
  if (new URL(request.url).pathname !== "/linusku/sw.js" || !env?.ASSETS) {
    return null;
  }

  const assetResponse = await env.ASSETS.fetch(request);
  return addLinuskuServiceWorkerScope(request, assetResponse);
}
