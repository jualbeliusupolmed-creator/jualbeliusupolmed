const checks = [
  "https://kampuskita.my.id/",
  "https://www.kampuskita.my.id/",
  "https://kampuskita.my.id/linusku",
  "https://www.kampuskita.my.id/linusku",
];
const allowedHosts = new Set(["kampuskita.my.id", "www.kampuskita.my.id"]);

const results = await Promise.all(
  checks.map(async (url) => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    const finalUrl = new URL(response.url);
    await response.body?.cancel();
    return {
      url,
      status: response.status,
      validHost: allowedHosts.has(finalUrl.hostname) && finalUrl.protocol === "https:",
    };
  })
);

for (const result of results) {
  const status = result.status >= 200 && result.status < 300 && result.validHost ? "PASS" : "FAIL";
  console.log(`${status} ${result.url} HTTP ${result.status}`);
}

if (results.some(({ status, validHost }) => status < 200 || status >= 300 || !validHost)) {
  process.exitCode = 1;
}
