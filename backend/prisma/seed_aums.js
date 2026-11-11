require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma.config");

/**
 * 5 SKPD DKI Jakarta municipal agency departments.
 */
const DEPARTMENTS = [
  "Dinas Sumber Daya Air",
  "Dinas Bina Marga",
  "Dinas Lingkungan Hidup",
  "Dinas Perhubungan",
  "Dinas Pertamanan dan Hutan Kota",
];

/**
 * Seed database with initial departments, core role users, and benchmark incident reports.
 *
 * @returns {Promise<void>}
 */
async function main() {
  console.log("[AUMS Seeder] Starting database seeding...");

  // 1. Seed 5 SKPD DKI Jakarta Departments
  console.log("[AUMS Seeder] Seeding 5 SKPD DKI Jakarta departments...");
  const departmentMap = {};
  for (const name of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    departmentMap[name] = dept;
    console.log(`  - Department: ${name} (${dept.id})`);
  }

  // 2. Seed Core Users (Admin, CRM Officer, Field Officer, Citizen)
  console.log("[AUMS Seeder] Seeding core role users...");
  const defaultPassword = "PasswordAUMS2026!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const usersData = [
    {
      email: "admin@aums.jakarta.go.id",
      name: "Administrator AUMS",
      role: "ADMIN",
      password: passwordHash,
      nip: "197801012000031001",
      unit: "Dinas Komunikasi, Informatika dan Statistik DKI",
      phone: "+628110000001",
    },
    {
      email: "crm@aums.jakarta.go.id",
      name: "Petugas CRM Jakarta",
      role: "CRM_OFFICER",
      password: passwordHash,
      nip: "198205152006042003",
      unit: "Citizen Relationship Management DKI Jakarta",
      phone: "+628110000002",
    },
    {
      email: "petugas.binamarga@aums.jakarta.go.id",
      name: "Budi Santoso",
      role: "FIELD_OFFICER",
      password: passwordHash,
      departmentId: departmentMap["Dinas Bina Marga"]?.id,
      nip: "198504122010011005",
      unit: "Seksi Pemeliharaan Jalan & Jembatan",
      phone: "+628110000003",
    },
    {
      email: "warga@aums.jakarta.go.id",
      name: "Warga Jakarta",
      role: "CITIZEN",
      password: passwordHash,
      nik: "3171012304900001",
      phone: "+628120000004",
    },
  ];

  const userMap = {};
  for (const user of usersData) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        departmentId: user.departmentId || null,
        nip: user.nip || null,
        unit: user.unit || null,
        phone: user.phone || null,
        nik: user.nik || null,
      },
      create: user,
    });
    userMap[user.email] = createdUser;
    console.log(`  - User: ${user.name} (${user.role} - ${user.email})`);
  }

  const citizenUser = userMap["warga@aums.jakarta.go.id"];
  const fieldOfficer = userMap["petugas.binamarga@aums.jakarta.go.id"];

  // 3. Seed 3 Sample Reports
  console.log("[AUMS Seeder] Seeding 3 benchmark incident reports...");
  const sampleReports = [
    {
      title: "Jalan Berlubang di Sudirman",
      description:
        "Lubang jalan cukup dalam berdiameter 60cm di lajur kiri membahayakan pengendara motor dan mobil.",
      category: "Jalan Rusak",
      status: "Pending",
      priority: "High",
      locationAddress:
        "Jl. Jenderal Sudirman No. Kav 21, RT.10/RW.1, Karet Tengsin, Tanah Abang, Jakarta Pusat",
      latitude: -6.2088,
      longitude: 106.8227,
      photoUrl: "https://mock.storage.local/reports/pothole-sudirman.jpg",
      reporterId: citizenUser?.id,
      departmentId: departmentMap["Dinas Bina Marga"]?.id,
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
    },
    {
      title: "Saluran Air Tersumbat Sampah",
      description:
        "Saluran drainase perkotaan dipenuhi tumpukan sampah plastik, berpotensi memicu luapan air saat hujan deras.",
      category: "Banjir & Genangan",
      status: "In_Progress",
      priority: "Medium",
      locationAddress:
        "Jl. Kyai Tapa No. 1, Tomang, Grogol Petamburan, Jakarta Barat",
      latitude: -6.1683,
      longitude: 106.7892,
      photoUrl: "https://mock.storage.local/reports/drainage-blocked.jpg",
      reporterId: citizenUser?.id,
      departmentId: departmentMap["Dinas Sumber Daya Air"]?.id,
      assignedToId: fieldOfficer?.id,
      assignedOfficerName: fieldOfficer?.name || "Budi Santoso",
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
      actionPlan: {
        targetAgency: "Dinas Sumber Daya Air",
        confidenceScore: 0.94,
        estimatedDays: 2,
        actionSteps: [
          "Pengerahan regu satgas SDA untuk inspeksi sedimentasi",
          "Pengangkatan sampah padat dari mulut saluran",
          "Penyedotan lumpur endapan menggunakan truk tangki",
          "Uji kelancaran debit aliran air",
        ],
        confidenceMetadata: {
          agencyConfidence: 0.95,
          planConfidence: 0.93,
          dispatchReason:
            "Sesuai tupoksi pengendalian banjir dan drainase mikro SDA DKI",
        },
        approvedBy: "Petugas CRM Jakarta",
        approvedAt: new Date(),
      },
    },
    {
      title: "Lampu Lalu Lintas Padam",
      description:
        "Traffic light di persimpangan utama padam total mengakibatkan kemacetan parah dan risiko benturan antar kendaraan.",
      category: "Fasilitas Publik",
      status: "Resolved",
      priority: "High",
      locationAddress:
        "Jl. Panglima Polim Raya, Melawai, Kebayoran Baru, Jakarta Selatan",
      latitude: -6.2443,
      longitude: 106.8006,
      photoUrl: "https://mock.storage.local/reports/traffic-light-broken.jpg",
      officerPhotoUrl:
        "https://mock.storage.local/verifications/traffic-light-repaired.jpg",
      officerNotes:
        "Pergantian sekring pengendali dan modul suplai daya selesai. Lampu lalu lintas kembali beroperasi normal.",
      assignedOfficerName: "Petugas Lapangan Dishub",
      resolvedAt: new Date(),
      reporterId: citizenUser?.id,
      departmentId: departmentMap["Dinas Perhubungan"]?.id,
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
    },
  ];

  for (const reportData of sampleReports) {
    const { actionPlan, ...reportFields } = reportData;

    // Check if report with same title exists to prevent infinite duplicates on repeated seed
    const existing = await prisma.report.findFirst({
      where: { title: reportFields.title },
    });

    let report;
    if (existing) {
      report = await prisma.report.update({
        where: { id: existing.id },
        data: reportFields,
      });
      console.log(`  - Updated report: ${report.title} (${report.id})`);
    } else {
      report = await prisma.report.create({
        data: reportFields,
      });
      console.log(`  - Created report: ${report.title} (${report.id})`);
    }

    // Upsert ActionPlan if specified
    if (actionPlan) {
      await prisma.actionPlan.upsert({
        where: { reportId: report.id },
        update: actionPlan,
        create: {
          reportId: report.id,
          ...actionPlan,
        },
      });
      console.log(`    * Action plan upserted for: ${report.title}`);
    }

    // 4. Synchronize PostGIS geography location column (SRID 4326)
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Report"
         SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         WHERE id = $3::uuid`,
        Number(report.longitude),
        Number(report.latitude),
        report.id,
      );
      console.log(
        `    * PostGIS location synced for ${report.title}: Point(${report.longitude}, ${report.latitude})`,
      );
    } catch (spatialErr) {
      console.warn(
        `    ! PostGIS spatial update skipped (PostGIS extension may be inactive): ${spatialErr.message}`,
      );
    }
  }

  console.log("[AUMS Seeder] Database seeding completed successfully!");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("[AUMS Seeder] Seed execution failed:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = main;
