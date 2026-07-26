import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../public/", import.meta.url)));
const port = Number(process.env.PORT || 4173);

// 로컬 서버가 운영 CSP를 그대로 붙인다. 붙이지 않으면 script-src 'self'(=unsafe-eval
// 없음)에서만 터지는 부팅 실패가 로컬과 로컬 픽스처를 모두 통과하고 preview에서야
// 드러난다. 실제로 두 게임이 같은 방식으로 preview 게이트에서 멈췄다. 값은
// vercel.json에서 읽어 두 곳이 어긋나지 않게 한다.
function productionContentSecurityPolicy() {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  for (const rule of config.headers ?? []) {
    const header = (rule.headers ?? []).find((entry) => entry.key === "Content-Security-Policy");
    if (header?.value) return header.value;
  }
  return null;
}

const contentSecurityPolicy = productionContentSecurityPolicy();

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
  if (pathname === "/history" || pathname === "/history/") return "/history.html";
  if (pathname === "/making" || pathname === "/making/") return "/making.html";
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

  // 게임 자산은 blob 도메인에서 오므로 CSP를 받지 않는다. 포털과 러너 문서에만 붙인다.
  if (contentSecurityPolicy && !url.pathname.startsWith("/__game-assets/")) {
    headers["Content-Security-Policy"] = contentSecurityPolicy;
  }

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
