// Cursor hook bridge: reads the hook JSON from stdin and forwards it to Pixel Office.
// This script is intentionally non-blocking: a missing dashboard never blocks Cursor.
const http = require("node:http");

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => raw += chunk);
process.stdin.on("end", () => {
  let payload = {};
  try { payload = raw.trim() ? JSON.parse(raw) : {}; } catch {
    payload = { parseError: true, rawPreview: raw.slice(0, 500) };
  }

  const event = {
    source: "cursor-hook",
    hook: process.argv[2] || "unknown",
    receivedAt: new Date().toISOString(),
    projectDir: process.env.CURSOR_PROJECT_DIR || null,
    cursorVersion: process.env.CURSOR_VERSION || null,
    payload
  };

  const body = Buffer.from(JSON.stringify(event));
  const req = http.request({
    hostname: "127.0.0.1",
    port: Number(process.env.PIXEL_OFFICE_PORT || 4317),
    path: "/event",
    method: "POST",
    timeout: 700,
    headers: {
      "content-type": "application/json",
      "content-length": body.length
    }
  }, res => res.resume());

  req.on("error", () => {});
  req.on("timeout", () => req.destroy());
  req.end(body);
});
