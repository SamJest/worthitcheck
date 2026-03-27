const http = require("http");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const mime = {
  ".html": "text/html; charset=UTF-8",
  ".css": "text/css; charset=UTF-8",
  ".js": "application/javascript; charset=UTF-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=UTF-8",
  ".txt": "text/plain; charset=UTF-8",
  ".json": "application/json; charset=UTF-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function resolvePath(urlPath) {
  let reqPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  if (reqPath === "/") reqPath = "/index.html";

  let filePath = path.join(root, reqPath.replace(/^\/+/, ""));

  if (reqPath.endsWith("/")) {
    filePath = path.join(root, reqPath.replace(/^\/+/, ""), "index.html");
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  }

  return filePath;
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");

  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  res.setHeader(
    "Content-Type",
    mime[path.extname(filePath).toLowerCase()] || "application/octet-stream"
  );

  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`WorthItCheck launch server listening on http://127.0.0.1:${port}`);
});
