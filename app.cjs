const express = require("express");
const { createRequestHandler } = require("@react-router/express");

const app = express();
const basePath = "";

app.use(
  "/assets",
  express.static("build/client/assets", { immutable: true, maxAge: "1y" })
);
app.use(
  `${basePath}/assets`,
  express.static("build/client/assets", { immutable: true, maxAge: "1y" })
);
app.use(express.static("build/client", { maxAge: "1h" }));
app.use(basePath, express.static("build/client", { maxAge: "1h" }));

// cPanel/Passenger may forward requests including the subpath (/rewards).
// Strip it before handing off to React Router server build.
app.use((req, _res, next) => {
  if (req.url === basePath) {
    req.url = "/";
  } else if (req.url.startsWith(`${basePath}/`)) {
    req.url = req.url.slice(basePath.length);
  }
  next();
});

const handlerPromise = import("./build/server/index.js").then((mod) =>
  createRequestHandler({ build: mod.default ?? mod })
);

app.use(async (req, res, next) => {
  try {
    const handler = await handlerPromise;
    return handler(req, res, next);
  } catch (error) {
    return next(error);
  }
});

module.exports = app;
