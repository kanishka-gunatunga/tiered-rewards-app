import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequestHandler } from "@react-router/express";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientBuildDir = path.join(__dirname, "build", "client");
const privacyHtmlPath = path.join(clientBuildDir, "privacy.html");

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      );

const serverBuild = viteDevServer
  ? undefined
  : await import("./build/server/index.js");

function withAllowedActionOrigins(build) {
  let appHost = "shopify.ktcloud365.com";
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

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
    : withAllowedActionOrigins(serverBuild),
});

const app = express();

/** App Store requires a public privacy URL — serve it as static HTML (reliable). */
app.get(["/privacy", "/privacy/"], (req, res, next) => {
  if (!fs.existsSync(privacyHtmlPath)) return next();
  res.sendFile(privacyHtmlPath);
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

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Express server listening at http://localhost:${port}`),
);
