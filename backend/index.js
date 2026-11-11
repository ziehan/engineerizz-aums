const env = require("./src/config/env.config");
const app = require("./src/app");
const prisma = require("./src/config/prisma.config");

let server;

/**
 * Starts the HTTP server listener for AUMS backend API.
 *
 * @description
 * Attempts to bind to the configured host and port. If the port is in use or inaccessible (EADDRINUSE/EACCES),
 * automatically retries on an available dynamic port on 127.0.0.1.
 *
 * @param {number} port - Target TCP port number.
 * @param {string} host - Host interface name or IP.
 * @param {boolean} [isFallback=false] - True if binding on a dynamic fallback port.
 * @returns {import("http").Server} Node.js HTTP server instance.
 */
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

/**
 * Performs graceful shutdown of the HTTP server and Prisma database connection.
 *
 * @description
 * Intercepts SIGTERM and SIGINT OS signals, stops accepting new HTTP connections,
 * disconnects PrismaClient cleanly, and exits process with code 0 or 1.
 *
 * @param {string} signal - Received OS process signal (SIGTERM or SIGINT).
 * @returns {void}
 */
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
