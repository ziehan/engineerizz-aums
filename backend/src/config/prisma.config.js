require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

/**
 * PostgreSQL connection pool configuration for Prisma Client.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

/**
 * Configured Prisma Client instance with pgvector / PostGIS adapter.
 * @type {PrismaClient}
 */
const prisma = new PrismaClient({ adapter });

module.exports = prisma;
