const env = require("./src/config/env.config");
const app = require("./src/app");
const prisma = require("./src/config/prisma.config");

let server;

function listen(port, host, isFallback = false) {
  const candidate = app.listen(port, host);
  server = candidate;

  candidate.once("listening", () => {
    const address = candidate.address();
    const boundPort =
      typeof address === "object" && address ? address.port : port;
    const suffix = isFallback ? " (fallback)" : "";
    console.log(`AUMS backend listening on ${host}:${boundPort}${suffix}`);
  });

  candidate.once("error", (error) => {
    if (
      !isFallback &&
      (error.code === "EACCES" || error.code === "EADDRINUSE")
    ) {
      console.warn(
        `Unable to bind ${host}:${port} (${error.code}). ` +
          "Retrying on an available localhost port.",
      );
      candidate.close(() => listen(0, "127.0.0.1", true));
      return;
    }

    console.error(`Unable to start AUMS backend on ${host}:${port}:`, error);
    process.exitCode = 1;
  });

  return candidate;
}

listen(env.port, env.host);

function shutdown(signal) {
  console.log(`${signal} received; shutting down`);
  const closeServer = server
    ? new Promise((resolve) => server.close(resolve))
    : Promise.resolve();
  closeServer
    .then(() => prisma.$disconnect())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Graceful shutdown failed:", error);
      process.exitCode = 1;
      return prisma.$disconnect().finally(() => process.exit(1));
    });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
