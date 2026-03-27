const fs = require("fs");
const path = require("path");

const root = process.cwd();
const htmlFiles = [];
const failures = [];
const warnings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "docs") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      htmlFiles.push(full);
    }
  }
}

function rel(file) {
  return path.relative(root, file).replaceAll("\\", "/");
}

function has(content, pattern) {
  return pattern.test(content);
}

function fileExistsForHref(file, href) {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("#")
  ) {
    return true;
  }

  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return true;

  const baseDir = path.dirname(file);
  let resolved = clean.startsWith("/")
    ? path.join(root, clean.replace(/^\/+/, ""))
    : path.resolve(baseDir, clean);

  if (clean.endsWith("/")) {
    resolved = path.join(resolved, "index.html");
  }

  if (!path.extname(resolved)) {
    if (fs.existsSync(`${resolved}.html`)) return true;
    resolved = path.join(resolved, "index.html");
  }

  return fs.existsSync(resolved);
}

walk(root);

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, "utf8");
  const label = rel(file);

  if (!has(content, /<title>[^<]+<\/title>/i)) {
    failures.push(`${label}: missing <title>`);
  }
  if (!has(content, /<meta\s+name="description"/i)) {
    failures.push(`${label}: missing meta description`);
  }
  if (!has(content, /<link\s+rel="canonical"/i)) {
    failures.push(`${label}: missing canonical`);
  }
  if (!has(content, /<h1>[^<]+<\/h1>/i)) {
    failures.push(`${label}: missing h1`);
  }
  if (!has(content, /<meta\s+property="og:title"/i)) {
    warnings.push(`${label}: missing og:title`);
  }
  if (!has(content, /<meta\s+name="twitter:card"/i)) {
    warnings.push(`${label}: missing twitter:card`);
  }

  const hrefs = [...content.matchAll(/href="([^"]+)"/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!fileExistsForHref(file, href)) {
      failures.push(`${label}: broken href -> ${href}`);
    }
  }
}

if (!fs.existsSync(path.join(root, "robots.txt"))) {
  failures.push("robots.txt: missing");
}

if (!fs.existsSync(path.join(root, "sitemap.xml"))) {
  failures.push("sitemap.xml: missing");
}

console.log(`Checked ${htmlFiles.length} HTML files`);

if (failures.length) {
  console.log("\nFailures:");
  for (const item of failures) console.log(`- ${item}`);
}

if (warnings.length) {
  console.log("\nWarnings:");
  for (const item of warnings) console.log(`- ${item}`);
}

if (failures.length) {
  process.exitCode = 1;
}
