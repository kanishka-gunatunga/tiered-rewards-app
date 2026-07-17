import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequestHandler } from "@react-router/express";
import express from "express";

console.log("[cartquest] booting server.js…");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientBuildDir = path.join(__dirname, "build", "client");
const publicDir = path.join(__dirname, "public");
const serverBuildPath = path.join(__dirname, "build", "server", "index.js");

function firstExisting(...paths) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Inline homepage — works even if React Router build assets are broken. */
const HOME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>CartQuest — Tiered cart rewards</title>
<!-- cartquest-static-home -->
<style>
*{box-sizing:border-box}html,body{margin:0;min-height:100%}body{font-family:Inter,system-ui,sans-serif;background:radial-gradient(circle at top,#f3f4f6 0%,transparent 55%),#fafafa;color:#111827}
.index{align-items:center;display:flex;justify-content:center;min-height:100vh;width:100%;text-align:center;padding:2rem 1.25rem}
.content{display:grid;gap:1.5rem;width:min(100%,52rem);justify-items:center}
.brand{margin:0;font-size:.875rem;font-weight:650;letter-spacing:.08em;text-transform:uppercase;color:#4b5563}
.heading,.text{padding:0;margin:0}
.heading{font-size:clamp(1.75rem,4vw,2.35rem);font-weight:700;line-height:1.2;max-width:36rem;color:#111827}
.text{font-size:1.0625rem;line-height:1.55;color:#4b5563;max-width:34rem;padding-bottom:.5rem}
.installNote{margin:0;max-width:34rem;padding:1.25rem 1.35rem;border:1px solid #e5e7eb;border-radius:.75rem;background:#fff;font-size:.9375rem;line-height:1.55;color:#374151;text-align:left}
.installNote strong{color:#111827}
.form{display:flex;align-items:flex-start;justify-content:center;flex-wrap:wrap;margin:0 auto;gap:.75rem 1rem;width:100%;max-width:32rem;padding:1.25rem;border:1px solid #e5e7eb;border-radius:.75rem;background:#fff}
.label{display:grid;gap:.35rem;flex:1 1 16rem;text-align:left;font-size:.875rem;font-weight:550;color:#111827}
.input{width:100%;padding:.55rem .7rem;border:1px solid #9ca3af;border-radius:.5rem;font:inherit;background:#fff}
.input:focus{outline:none;border-color:#111827;box-shadow:0 0 0 1px #111827}
.fieldHint{font-size:.75rem;font-weight:400;color:#6b7280}
.button{cursor:pointer;margin-top:1.55rem;padding:.55rem 1.1rem;border:1px solid transparent;border-radius:.5rem;background:#111827;color:#fff;font:inherit;font-weight:550;align-self:flex-start;height:fit-content}
.button:hover{background:#1f2937}
.list{list-style:none;padding:1.5rem 0 0;margin:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1.25rem;width:100%}
.list>li{text-align:left;padding:1rem 1.1rem;border:1px solid #e5e7eb;border-radius:.75rem;background:#fff;color:#4b5563;font-size:.9375rem;line-height:1.5}
.list>li strong{display:block;margin-bottom:.35rem;color:#111827;font-size:.9375rem}
.legalLinks{margin:0;font-size:.875rem}
.legalLinks a{color:#4b5563;text-decoration:underline;text-underline-offset:.15em}
.legalLinks a:hover{color:#111827}
@media only screen and (max-width:50rem){.list{grid-template-columns:1fr}.form{align-items:stretch}.button{width:100%;margin-top:0}}
</style>
</head>
<body>
<div class="index"><div class="content">
<p class="brand">CartQuest</p>
<h1 class="heading">Tiered cart rewards that unlock as shoppers spend more</h1>
<p class="text">Set spend goals, apply automatic checkout discounts, and optionally show a progress bar on the cart page — all from Shopify Admin.</p>
<p class="installNote">Install CartQuest from the Shopify App Store or from <strong>Apps</strong> in your Shopify Admin. Merchants open the app from Shopify — no separate login is required.</p>
<ul class="list">
<li><strong>Spend tiers</strong>Configure cart totals and discount amounts in minutes.</li>
<li><strong>Checkout discounts</strong>Rewards apply automatically when shoppers reach each tier.</li>
<li><strong>Cart progress bar</strong>Show shoppers how close they are to the next reward.</li>
</ul>
<p class="legalLinks"><a href="/privacy.html">Privacy policy</a></p>
</div></div>
</body>
</html>`;

function withAllowedActionOrigins(build) {
  let appHost = "cartquest.ktcloud365.com";
  try {
    if (process.env.SHOPIFY_APP_URL) {
      appHost = new URL(process.env.SHOPIFY_APP_URL).host;
    }
  } catch {
    // keep default host
  }

  return {
    ...build,
    allowedActionOrigins: ["admin.shopify.com", appHost],
  };
}

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

let remixHandler = (req, res) => {
  res
    .status(503)
    .type("html")
    .send(
      "<h1>CartQuest app failed to load</h1><p>Check pm2 logs cartquest-error.log</p>",
    );
};

try {
  if (viteDevServer) {
    remixHandler = createRequestHandler({
      build: () =>
        viteDevServer.ssrLoadModule("virtual:react-router/server-build"),
    });
  } else if (!fs.existsSync(serverBuildPath)) {
    console.error("Missing server build:", serverBuildPath);
  } else {
    const serverBuild = await import(pathToFileURL(serverBuildPath).href);
    remixHandler = createRequestHandler({
      build: withAllowedActionOrigins(serverBuild),
    });
    console.log("React Router server build loaded");
  }
} catch (err) {
  console.error("Failed to load React Router server build:", err);
}

const app = express();

app.get(["/", "/index.html"], (req, res, next) => {
  if (req.query.shop) return next();

  const filePath = firstExisting(
    path.join(clientBuildDir, "home.html"),
    path.join(publicDir, "home.html"),
  );

  res.setHeader("Cache-Control", "no-store");
  if (filePath) return res.sendFile(filePath);
  return res.type("html").send(HOME_HTML);
});

app.get(["/privacy", "/privacy/"], (req, res, next) => {
  const filePath = firstExisting(
    path.join(clientBuildDir, "privacy.html"),
    path.join(publicDir, "privacy.html"),
  );
  if (!filePath) return next();
  res.setHeader("Cache-Control", "no-store");
  return res.sendFile(filePath);
});

if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  app.use(
    "/assets",
    express.static(path.join(clientBuildDir, "assets"), {
      immutable: true,
      maxAge: "1y",
    }),
  );
}

app.use(express.static(clientBuildDir, { maxAge: "1h" }));
app.use(remixHandler);

const port = Number(process.env.PORT) || 3000;

process.on("uncaughtException", (err) => {
  console.error("[cartquest] uncaughtException:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[cartquest] unhandledRejection:", reason);
  process.exit(1);
});

const server = app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
  console.log("cartquest-static-home ready");
  console.log(`Node ${process.version} | cwd ${process.cwd()}`);
});

server.on("error", (err) => {
  console.error(`[cartquest] Failed to bind port ${port}:`, err.message);
  if (err.code === "EADDRINUSE") {
    console.error(
      `[cartquest] Port ${port} is already in use. Stop the other process or set PORT in .env`,
    );
  }
  process.exit(1);
});
