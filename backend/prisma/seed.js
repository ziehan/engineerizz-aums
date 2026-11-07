require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = [
    {
      email: "officer1@jakarta.go.id",
      name: "Budi Petugas Lapangan",
      password: "OfficerPassword123!",
      role: "FIELD_OFFICER",
    },
    {
      email: "admin@jakarta.go.id",
      name: "Admin CRM Jakarta",
      password: "AdminPassword123!",
      role: "ADMIN",
    },
    {
      email: "warga1@jakarta.go.id",
      name: "Warga Contoh",
      password: "WargaPassword123!",
      role: "CITIZEN",
    },
  ];

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 12);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: hashedPassword,
        role: user.role,
      },
      create: {
        email: user.email,
        name: user.name,
        password: hashedPassword,
        role: user.role,
      },
    });
  }

  const reports = [
    {
      title: "Large pothole on Jalan Senopati",
      description:
        "A deep pothole is affecting motorcycles and cars near the intersection.",
      category: "Road Infrastructure",
      priority: "High",
      locationAddress:
        "Jalan Senopati, Kecamatan Kebayoran Baru, Jakarta Selatan",
      latitude: -6.2297,
      longitude: 106.808,
      status: "Pending",
    },
    {
      title: "Overflowing waste container",
      description:
        "The public waste container has been overflowing for two days.",
      category: "Waste Management",
      priority: "Medium",
      locationAddress: "Jalan Tebet Raya, Kecamatan Tebet, Jakarta Selatan",
      latitude: -6.2316,
      longitude: 106.852,
      status: "Approved",
    },
  ];

  for (const report of reports) {
    await prisma.report.create({ data: report });
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
