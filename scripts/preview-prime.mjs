// Local visual QA only. Never forwards API calls, credentials, or mutations.
// Run the app on port 3000, then: node scripts/preview-prime.mjs
import http from "node:http";

const stages = [
  ["submitted", "Submitted", 0],
  ["finance_verification", "Finance verification", 2],
  ["completed", "Completed", 5],
  ["revision_requested", "Revision requested", 0],
];
const fixtures = stages.map(([currentStage, stageLabel, stageIndex], i) => ({
  taskId: `QA-00${i + 1}`, taskName: `Sample request ${i + 1}`, taskUrl: "",
  formType: ["rfp", "po", "pcv", "rfp"][i],
  payee: ["Sample Office Supplies", "Sample Technology Vendor", "Sample Transport", "Sample Event Services"][i],
  department: "ISD", totalAmount: [24600, 89500, 1250, 18000][i], dateNeeded: "2026-09-20",
  urgency: i === 3 ? "urgent" : "normal", purpose: "Synthetic request for visual review only.",
  requestedBy: "PRIME Reviewer", requestedByEmail: "review@example.test",
  currentStage, stageLabel, stageIndex, isRevisionRequested: i === 3,
  revisionReason: i === 3 ? "Please attach the updated quotation." : undefined,
  dateCreated: "2026-09-14T08:00:00.000Z", attachments: [],
}));

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost:3101");
  const json = (data, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    response.end(JSON.stringify(data));
  };
  if (url.pathname.startsWith("/api/")) {
    if (request.method !== "GET") {
      if (url.pathname === "/api/rfp/submit") return json({ success: true, taskId: "QA-PREVIEW", taskUrl: "", message: "Preview request generated.", isMock: true });
      return json({ success: false, message: "Live actions are disabled in visual QA." }, 403);
    }
    if (url.pathname === "/api/auth/clickup/session") return json({ user: { id: "qa-preview", username: "PRIME Reviewer", email: "review@example.test" } });
    if (url.pathname === "/api/admin/settings") return json({ portalGuideEnabled: true, rfpAutofillEnabled: true });
    if (url.pathname === "/api/rfp/track") {
      const query = (url.searchParams.get("query") || url.searchParams.get("id") || "").toLowerCase();
      if (query === "__error__") return json({ success: false, message: "Preview service unavailable. Please try again." }, 503);
      return json({ success: true, requests: fixtures.filter(item => JSON.stringify(item).toLowerCase().includes(query)) });
    }
    return json({ success: false, message: "Endpoint disabled in visual QA." }, 404);
  }
  if (!["GET", "HEAD"].includes(request.method)) return json({ error: "Blocked" }, 405);
  const headers = { ...request.headers, host: "localhost:3000" };
  delete headers.cookie;
  delete headers.authorization;
  const upstream = http.request({ hostname: "127.0.0.1", port: 3000, path: request.url, method: request.method, headers }, incoming => {
    const forwardedHeaders = { ...incoming.headers };
    delete forwardedHeaders["set-cookie"];
    response.writeHead(incoming.statusCode || 502, forwardedHeaders);
    incoming.pipe(response);
  });
  upstream.on("error", () => json({ error: "Start the app on port 3000 first." }, 502));
  upstream.end();
});
server.on("upgrade", (request, socket, head) => {
  if (!request.url.startsWith("/_next/")) return socket.destroy();
  const headers = { ...request.headers, host: "localhost:3000" };
  delete headers.cookie;
  delete headers.authorization;
  const upstream = http.request({ hostname: "127.0.0.1", port: 3000, path: request.url, headers });
  upstream.on("upgrade", (response, upstreamSocket, upstreamHead) => {
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${Object.entries(response.headers).map(([k,v]) => `${k}: ${v}`).join("\r\n")}\r\n\r\n`);
    if (head.length) upstreamSocket.write(head);
    if (upstreamHead.length) socket.write(upstreamHead);
    socket.pipe(upstreamSocket).pipe(socket);
    socket.on("error", () => upstreamSocket.destroy());
    upstreamSocket.on("error", () => socket.destroy());
  });
  upstream.on("error", () => socket.destroy());
  upstream.end();
});
server.listen(3101, "127.0.0.1", () => process.stdout.write("PRIME VISUAL QA ONLY: http://localhost:3101 — synthetic data, all API calls isolated.\n"));
