import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const port = Number(process.env.PORT || 4173);

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webp": "image/webp"
};

function rewrittenPath(pathname) {
  const game = pathname.match(/^\/games\/([a-z0-9-]+)\/?$/);
  if (game) return "/game.html";
  const play = pathname.match(/^\/play\/([a-z0-9-]+)\/?$/);
  if (play) return "/play.html";
  if (pathname === "/") return "/index.html";
  return pathname;
}

function safeFilePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalized = normalize(decoded).replace(/^([.][.][/\\])+/, "");
  const candidate = join(root, normalized);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) return null;
  return candidate;
}

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", "http://localhost");
  const pathname = rewrittenPath(url.pathname);
  let filePath = safeFilePath(pathname);

  if (filePath && existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const headers = {
    "Content-Type": types[extname(filePath).toLowerCase()] || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin"
  };

  if (url.pathname.startsWith("/__game-assets/")) {
    headers["Access-Control-Allow-Origin"] = "*";
    headers["Cross-Origin-Resource-Policy"] = "cross-origin";
    headers["Cache-Control"] = "public, max-age=31536000, immutable";
  } else if (url.pathname.startsWith("/catalog/")) {
    headers["Cache-Control"] = "no-cache";
  }

  response.writeHead(200, headers);
  if (request.method === "HEAD") response.end();
  else createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`Arcade: http://127.0.0.1:${port}\n`);
});

