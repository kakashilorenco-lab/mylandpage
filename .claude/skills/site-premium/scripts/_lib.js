// Funções compartilhadas pelos scripts da skill (Node + Playwright).
const http = require("http");
const fs = require("fs");
const path = require("path");

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".mjs": "application/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon" };

// Sobe um servidor estático para uma pasta. Retorna { url, close }.
function serve(dir) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const f = path.join(dir, p);
      if (!f.startsWith(path.resolve(dir)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end("404"); }
      res.writeHead(200, { "Content-Type": MIME[path.extname(f).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(f).pipe(res);
    }).listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() }));
  });
}

// Se a CDN estiver bloqueada no ambiente, serve gsap/lenis a partir de um node_modules local
// (rode antes: npm i gsap@3.12.5 lenis@1.1.13 numa pasta de rascunho e passe --vendor <pasta>/node_modules).
async function routeVendors(page, vendorDir) {
  if (!vendorDir) return;
  await page.route(/cdn\.jsdelivr\.net\/npm\/(gsap|lenis)@|cdnjs\.cloudflare\.com\/ajax\/libs\/gsap\//, (route) => {
    const u = route.request().url();
    const pkg = u.includes("lenis") ? "lenis" : "gsap";
    const file = path.join(vendorDir, pkg, "dist", u.split("/").pop().split("?")[0]);
    if (fs.existsSync(file)) route.fulfill({ contentType: "application/javascript", body: fs.readFileSync(file) });
    else route.continue();
  });
}

// Monta uma "folha de contato" (grade de prints) usando o próprio navegador.
async function contactSheet(browser, files, out, { cols = 3, w = 480 } = {}) {
  if (!files.length) return;
  const imgs = files.map((f) => `<img src="data:image/png;base64,${fs.readFileSync(f).toString("base64")}"><span>${path.basename(f)}</span>`);
  const html = `<html><body style="margin:0;background:#fff;font:11px monospace"><div style="display:grid;grid-template-columns:repeat(${cols},${w}px)">${imgs.map((i) => `<div style="position:relative">${i.replace("<img", `<img style="width:${w}px;display:block"`).replace("<span>", '<span style="position:absolute;left:4px;top:4px;background:#000;color:#fff;padding:2px 4px">')}</div>`).join("")}</div></body></html>`;
  const p = await browser.newPage({ viewport: { width: cols * w, height: 400 } });
  await p.setContent(html); await p.waitForTimeout(300);
  await p.screenshot({ path: out, fullPage: true }); await p.close();
}

function arg(name, def) { const i = process.argv.indexOf("--" + name); return i > -1 ? process.argv[i + 1] : def; }

module.exports = { serve, routeVendors, contactSheet, arg };
