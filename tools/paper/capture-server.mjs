// Tiny capture sink for the Paper extractor. Run alongside `npm run dev`:
//
//   node tools/paper/capture-server.mjs tools/paper/captures
//
// The extractor's window.__jfSave(name) POSTs the current screen's Paper-ready
// HTML here and it lands in <dir>/<name>.html, so a capture never has to pass
// through the chat transcript. Push a file into Paper later with write_html.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] || "tools/paper/captures");
const port = Number(process.argv[3] || 5199);
fs.mkdirSync(dir, { recursive: true });

http
  .createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    if (req.method === "OPTIONS") return res.end();
    const url = new URL(req.url, "http://localhost");
    if (req.method === "POST" && url.pathname === "/save") {
      const name = (url.searchParams.get("name") || "capture").replace(/[\/\\:*?"<>|]/g, "_").trim();
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const file = path.join(dir, `${name}.html`);
        fs.writeFileSync(file, body);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ saved: file, bytes: body.length }));
        console.log(`saved ${file} (${body.length} bytes)`);
      });
      return;
    }
    if (req.method === "GET" && url.pathname === "/list") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(fs.readdirSync(dir)));
    }
    res.end("jackflash paper capture server");
  })
  .listen(port, () => console.log(`capture server on http://localhost:${port} → ${dir}`));
