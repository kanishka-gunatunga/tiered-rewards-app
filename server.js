import { createRequestHandler } from "@react-router/express";
import express from "express";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
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

if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
}

app.use(express.static("build/client", { maxAge: "1h" }));
app.use(remixHandler);

const port = process.env.PORT || 3000;
app.listen(port, () =>
  console.log(`Express server listening at http://localhost:${port}`)
);
