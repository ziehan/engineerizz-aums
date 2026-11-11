const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

/**
 * Prisma 7 CLI configuration for migrations, CLI commands, and schema management.
 *
 * @description
 * Defines datasource connection URL and schema location for Prisma CLI operations
 * such as `prisma migrate deploy`, `prisma migrate dev`, and `prisma db seed`.
 *
 * @see https://pris.ly/d/config-datasource
 * @see https://pris.ly/d/prisma7-client-config
 */
module.exports = {
  schema: path.join(__dirname, "prisma/schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
