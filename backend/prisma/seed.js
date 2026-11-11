require("dotenv").config();
const bcrypt = require("bcryptjs");
const prisma = require("../src/config/prisma.config");

/**
 * 5 SKPD DKI Jakarta municipal agency departments with deterministic UUIDs.
 */
const DEPARTMENTS = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    name: "Dinas Bina Marga DKI Jakarta",
  },
  {
    id: "d0000000-0000-4000-8000-000000000002",
    name: "Dinas Sumber Daya Air DKI Jakarta",
  },
  {
    id: "d0000000-0000-4000-8000-000000000003",
    name: "Dinas Lingkungan Hidup DKI Jakarta",
  },
  {
    id: "d0000000-0000-4000-8000-000000000004",
    name: "Dinas Pertamanan dan Hutan Kota DKI Jakarta",
  },
  {
    id: "d0000000-0000-4000-8000-000000000005",
    name: "Dinas Perhubungan DKI Jakarta",
  },
];

/**
 * Helper to construct standardized AI agent AuditLog records.
 *
 * @param {string} agentName - INTAKE_AGENT | PLANNING_AGENT | VERIFICATION_AGENT
 * @param {string|Date} timestamp - ISO timestamp
 * @param {number} confidenceScore - AI confidence rating
 * @param {number} executionTimeMs - Execution duration in milliseconds
 * @param {Object} payload - Input payload sent to AI
 * @param {Object} data - Output response from AI
 * @param {string} [customDetails] - Optional custom details description
 * @returns {Object} AuditLog creation object
 */
function buildAiLog(
  agentName,
  timestamp,
  confidenceScore,
  executionTimeMs,
  payload,
  data,
  customDetails,
) {
  let action = "AI_INTAKE_COMPLETED";
  if (agentName === "PLANNING_AGENT") action = "AI_PLANNING_COMPLETED";
  if (agentName === "VERIFICATION_AGENT") action = "FIELD_VERIFIED";

  return {
    action,
    agentName,
    confidenceScore,
    payload,
    response: data,
    details:
      customDetails ||
      `AI ${agentName} executed successfully in ${executionTimeMs}ms (confidence: ${(confidenceScore * 100).toFixed(1)}%)`,
    timestamp: new Date(timestamp),
  };
}

/**
 * Helper to construct standardized human / system operational AuditLog records.
 *
 * @param {string} action - CRM_APPROVED | FIELD_OFFICER_ASSIGNED
 * @param {string|Date} timestamp - ISO timestamp
 * @param {string|Object} detailsObj - Descriptive notes or payload details
 * @returns {Object} AuditLog creation object
 */
function buildSystemLog(action, timestamp, detailsObj) {
  const details =
    typeof detailsObj === "object" ? JSON.stringify(detailsObj) : detailsObj;
  return {
    action,
    agentName: null,
    confidenceScore: null,
    payload: typeof detailsObj === "object" ? detailsObj : null,
    response: null,
    details,
    timestamp: new Date(timestamp),
  };
}

/**
 * Seed database with 5 SKPD DKI Jakarta departments, structured multi-role users,
 * and 8 realistic benchmark urban maintenance incident reports with rich multi-agent audit logs.
 *
 * @returns {Promise<void>}
 */
async function main() {
  console.log(
    "===============================================================",
  );
  console.log(
    " [AUMS Seeder] Starting Enterprise Database Seeding Process    ",
  );
  console.log(
    "===============================================================",
  );

  // 1. Safe Database Teardown (Respecting foreign key dependency hierarchy)
  console.log("\n[1/5] Executing safe teardown of existing records...");
  await prisma.auditLog.deleteMany();
  await prisma.actionPlan.deleteMany();
  await prisma.report.updateMany({ data: { parentReportId: null } });
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  console.log("  ✔ Teardown completed successfully.");

  // 2. Seed 5 Official SKPD DKI Jakarta Departments
  console.log("\n[2/5] Seeding 5 SKPD DKI Jakarta municipal departments...");
  const departmentMap = {};
  for (const dept of DEPARTMENTS) {
    const createdDept = await prisma.department.create({
      data: dept,
    });
    departmentMap[dept.name] = createdDept;
    console.log(`  ✔ Department created: ${dept.name} (${dept.id})`);
  }

  // 3. Seed Structured Multi-Role Users (Admin, CRM Officer, Field Officer, Citizen)
  console.log("\n[3/5] Seeding multi-role structured user accounts...");
  const defaultPassword = "PasswordAUMS2026!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const usersData = [
    // 2 ADMIN Users
    {
      id: "c0000000-0000-4000-8000-000000000001",
      email: "admin@aums.jakarta.go.id",
      name: "Drs. Hendra Wijaya, M.Si",
      role: "ADMIN",
      password: passwordHash,
      nip: "197805142003121001",
      unit: "Diskominfotik DKI Jakarta",
      phone: "+628111000001",
      isAvailable: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000002",
      email: "admin2@aums.jakarta.go.id",
      name: "Ir. Rina Kartika, M.T.",
      role: "ADMIN",
      password: passwordHash,
      nip: "198109222006042002",
      unit: "Bappeda DKI Jakarta",
      phone: "+628111000002",
      isAvailable: true,
    },

    // 2 CRM_OFFICER Users
    {
      id: "c0000000-0000-4000-8000-000000000003",
      email: "crm@aums.jakarta.go.id",
      name: "Nadia Kusuma, S.Sos",
      role: "CRM_OFFICER",
      password: passwordHash,
      nip: "199204182017012005",
      unit: "Citizen Relationship Management DKI Jakarta",
      phone: "+628111000003",
      isAvailable: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000004",
      email: "crm2@aums.jakarta.go.id",
      name: "Fajar Pratama, S.AP",
      role: "CRM_OFFICER",
      password: passwordHash,
      nip: "199401092019031007",
      unit: "Biro Tata Pemerintahan Setda DKI Jakarta",
      phone: "+628111000004",
      isAvailable: true,
    },

    // 5 FIELD_OFFICER Users (1 PIC per SKPD)
    {
      id: "c0000000-0000-4000-8000-000000000005",
      email: "officer.binamarga@aums.jakarta.go.id",
      name: "Bambang Suryanto, S.T.",
      role: "FIELD_OFFICER",
      password: passwordHash,
      departmentId: departmentMap["Dinas Bina Marga DKI Jakarta"].id,
      nip: "198703122011011003",
      unit: "Seksi Pemeliharaan Jalan & Jembatan Bina Marga",
      phone: "+628111000005",
      isAvailable: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000006",
      email: "officer.sda@aums.jakarta.go.id",
      name: "Dedi Kurniawan, A.Md",
      role: "FIELD_OFFICER",
      password: passwordHash,
      departmentId: departmentMap["Dinas Sumber Daya Air DKI Jakarta"].id,
      nip: "198906202014021004",
      unit: "Pasukan Biru Satgas Drainase SDA",
      phone: "+628111000006",
      isAvailable: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000007",
      email: "officer.dlh@aums.jakarta.go.id",
      name: "Agus Setiawan",
      role: "FIELD_OFFICER",
      password: passwordHash,
      departmentId: departmentMap["Dinas Lingkungan Hidup DKI Jakarta"].id,
      nip: "199108152015031002",
      unit: "Pasukan Oranye Satuan Pelaksana Kebersihan DLH",
      phone: "+628111000007",
      isAvailable: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000008",
      email: "officer.tamhut@aums.jakarta.go.id",
      name: "Wahyu Hidayat, S.P.",
      role: "FIELD_OFFICER",
      password: passwordHash,
      departmentId:
        departmentMap["Dinas Pertamanan dan Hutan Kota DKI Jakarta"].id,
      nip: "198811052012011001",
      unit: "Pasukan Hijau Tim Reaksi Cepat Pohon Tamhut",
      phone: "+628111000008",
      isAvailable: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000009",
      email: "officer.dishub@aums.jakarta.go.id",
      name: "Rizky Ramadhan, S.Tr.Tra",
      role: "FIELD_OFFICER",
      password: passwordHash,
      departmentId: departmentMap["Dinas Perhubungan DKI Jakarta"].id,
      nip: "199302192018011006",
      unit: "Teknisi Pemeliharaan APILL & Rambu Dishub",
      phone: "+628111000009",
      isAvailable: true,
    },

    // 4 CITIZEN Users
    {
      id: "c0000000-0000-4000-8000-000000000010",
      email: "warga1@aums.jakarta.go.id",
      name: "Andi Pratama",
      role: "CITIZEN",
      password: passwordHash,
      nik: "3174041505950002",
      phone: "+6281211112221",
      isAvailable: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000011",
      email: "warga2@aums.jakarta.go.id",
      name: "Siti Rahmawati",
      role: "CITIZEN",
      password: passwordHash,
      nik: "3172024809920005",
      phone: "+6281211112222",
      isAvailable: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000012",
      email: "warga3@aums.jakarta.go.id",
      name: "Budi Santoso",
      role: "CITIZEN",
      password: passwordHash,
      nik: "3171011203880007",
      phone: "+6281211112223",
      isAvailable: true,
    },
    {
      id: "c0000000-0000-4000-8000-000000000013",
      email: "warga4@aums.jakarta.go.id",
      name: "Dewi Lestari",
      role: "CITIZEN",
      password: passwordHash,
      nik: "3174085911960003",
      phone: "+6281211112224",
      isAvailable: true,
    },
  ];

  const userMap = {};
  for (const user of usersData) {
    const createdUser = await prisma.user.create({
      data: user,
    });
    userMap[user.email] = createdUser;
    console.log(
      `  ✔ User created: ${user.name} (${user.role} | ${user.email})`,
    );
  }

  // 4. Seed 8 Realistic Benchmark Reports + 1 Linked Duplicate
  console.log(
    "\n[4/5] Seeding 8 realistic benchmark reports with full multi-agent audit trails...",
  );

  const reportsData = [
    // -------------------------------------------------------------------------
    // 1. Report 1 (Resolved | Bina Marga)
    // -------------------------------------------------------------------------
    {
      id: "a1b2c3d4-1111-4000-8000-000000000001",
      title: "Lubang Jalan Dalam di Jl. Senopati Raya Dekat Halte",
      description:
        "Lubang jalan berdiameter 70cm dengan kedalaman 12cm di lajur kiri Jl. Senopati Raya sangat membahayakan pengendara motor terutama saat malam hari.",
      category: "Jalan Rusak",
      status: "Resolved",
      priority: "High",
      locationAddress:
        "Jl. Senopati Raya No. 41, RT.8/RW.3, Selong, Kebayoran Baru, Jakarta Selatan",
      latitude: -6.2314,
      longitude: 106.8097,
      photoUrl:
        "https://mock.storage.local/reports/senopati-pothole-before.jpg",
      officerPhotoUrl:
        "https://mock.storage.local/verifications/senopati-pothole-after.jpg",
      officerNotes:
        "Pengaspalan ulang hotmix AC-WC selesai dikerjakan dan dipadatkan dengan baby roller.",
      assignedOfficerName: "Bambang Suryanto, S.T.",
      resolvedAt: new Date("2026-11-10T16:45:00.000Z"),
      reporterId: userMap["warga1@aums.jakarta.go.id"].id,
      departmentId: departmentMap["Dinas Bina Marga DKI Jakarta"].id,
      assignedToId: userMap["officer.binamarga@aums.jakarta.go.id"].id,
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
      createdAt: new Date("2026-11-10T08:30:00.000Z"),
      actionPlan: {
        targetAgency: "Dinas Bina Marga DKI Jakarta",
        confidenceScore: 0.95,
        estimatedDays: 1,
        actionSteps: [
          "Pemasangan rambu keselamatan kerja dan traffic cone di sekitar lubang jalan",
          "Pembersihan puing dan pemotongan tepi aspal rusak secara presisi",
          "Pemberian lapisan aspal perekat tack coat",
          "Penambalan aspal panas hotmix AC-WC dan pemadatan dengan baby roller",
        ],
        confidenceMetadata: {
          agencyConfidence: 0.97,
          planConfidence: 0.94,
          dispatchReason:
            "Sesuai tupoksi pemeliharaan berkala infrastruktur jalan Bina Marga",
        },
        approvedBy: "Nadia Kusuma, S.Sos (CRM Officer)",
        approvedAt: new Date("2026-11-10T09:15:00.000Z"),
      },
      auditLogs: [
        buildAiLog(
          "INTAKE_AGENT",
          "2026-11-10T08:31:12.000Z",
          0.96,
          380,
          {
            title: "Lubang Jalan Dalam di Jl. Senopati Raya Dekat Halte",
            latitude: -6.2314,
            longitude: 106.8097,
            category: "Jalan Rusak",
          },
          {
            isValid: true,
            urgencyLevel: "High",
            priorityScore: 85,
            category: "Jalan Rusak",
            reasoning:
              "Lubang jalan berdimensi signifikan di jalur aktif perkotaan.",
          },
        ),
        buildAiLog(
          "PLANNING_AGENT",
          "2026-11-10T08:32:05.000Z",
          0.95,
          420,
          {
            description:
              "Lubang jalan berdiameter 70cm di lajur kiri Jl. Senopati Raya",
            location: [-6.2314, 106.8097],
          },
          {
            targetAgency: "Dinas Bina Marga DKI Jakarta",
            estimatedDays: 1,
            stepsCount: 4,
          },
        ),
        buildSystemLog(
          "CRM_APPROVED",
          "2026-11-10T09:15:00.000Z",
          "Disetujui oleh crm@aums.jakarta.go.id (Nadia Kusuma, S.Sos) untuk diteruskan ke tim lapangan Bina Marga.",
        ),
        buildSystemLog(
          "FIELD_OFFICER_ASSIGNED",
          "2026-11-10T10:00:00.000Z",
          "Ditugaskan kepada Bambang Suryanto, S.T. (officer.binamarga@aums.jakarta.go.id).",
        ),
        buildAiLog(
          "VERIFICATION_AGENT",
          "2026-11-10T16:45:00.000Z",
          0.94,
          510,
          {
            beforePhotoUrl:
              "https://mock.storage.local/reports/senopati-pothole-before.jpg",
            afterPhotoUrl:
              "https://mock.storage.local/verifications/senopati-pothole-after.jpg",
            officerLocation: [-6.2314, 106.8097],
          },
          {
            visualMatch: true,
            isResolved: true,
            auditNotes:
              "Tambalan aspal baru rata sempurna. Teks watermark koordinat dan timestamp web canvas terbaca jelas dan cocok dengan lokasi tugas.",
          },
        ),
      ],
    },

    // -------------------------------------------------------------------------
    // 2. Report 2 (Resolved | DLH)
    // -------------------------------------------------------------------------
    {
      id: "a1b2c3d4-2222-4000-8000-000000000002",
      title: "Tumpukan Sampah Liar Meluber di Jl. Boulevard Raya Kelapa Gading",
      description:
        "Tumpukan sampah plastik dan limbah rumah tangga meluber ke bahu jalan sepanjang 10 meter, mengeluarkan bau menyengat dan mengganggu pejalan kaki.",
      category: "Sampah Liar",
      status: "Resolved",
      priority: "High",
      locationAddress:
        "Jl. Boulevard Raya Blok LB3 No. 1, Kelapa Gading Timur, Kelapa Gading, Jakarta Utara",
      latitude: -6.1586,
      longitude: 106.9056,
      photoUrl:
        "https://mock.storage.local/reports/kelapagading-trash-before.jpg",
      officerPhotoUrl:
        "https://mock.storage.local/verifications/kelapagading-trash-after.jpg",
      officerNotes:
        "1,4 ton sampah liar diangkut ke truk compactor dan trotoar disemprot desinfektan.",
      assignedOfficerName: "Agus Setiawan",
      resolvedAt: new Date("2026-11-10T15:30:00.000Z"),
      reporterId: userMap["warga2@aums.jakarta.go.id"].id,
      departmentId: departmentMap["Dinas Lingkungan Hidup DKI Jakarta"].id,
      assignedToId: userMap["officer.dlh@aums.jakarta.go.id"].id,
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
      createdAt: new Date("2026-11-10T07:45:00.000Z"),
      actionPlan: {
        targetAgency: "Dinas Lingkungan Hidup DKI Jakarta",
        confidenceScore: 0.93,
        estimatedDays: 1,
        actionSteps: [
          "Mobilisasi armada truk compactor dan regu Pasukan Oranye",
          "Pengangkutan sampah padat dan pemilahan limbah anorganik",
          "Penyapuan dan pembersihan sisa kotoran di bahu jalan",
          "Penyemprotan disinfektan dan pemasangan spanduk larangan membuang sampah",
        ],
        confidenceMetadata: {
          agencyConfidence: 0.95,
          planConfidence: 0.92,
          dispatchReason:
            "Penanganan timbulan sampah liar ruang publik tupoksi DLH DKI",
        },
        approvedBy: "Nadia Kusuma, S.Sos (CRM Officer)",
        approvedAt: new Date("2026-11-10T08:45:00.000Z"),
      },
      auditLogs: [
        buildAiLog(
          "INTAKE_AGENT",
          "2026-11-10T07:46:10.000Z",
          0.95,
          340,
          { category: "Sampah Liar", latitude: -6.1586, longitude: 106.9056 },
          {
            isValid: true,
            urgencyLevel: "High",
            priorityScore: 82,
            category: "Sampah Liar",
          },
        ),
        buildAiLog(
          "PLANNING_AGENT",
          "2026-11-10T07:47:00.000Z",
          0.93,
          390,
          { targetAgency: "Dinas Lingkungan Hidup DKI Jakarta" },
          { stepsCount: 4, estimatedDays: 1 },
        ),
        buildSystemLog(
          "CRM_APPROVED",
          "2026-11-10T08:45:00.000Z",
          "Disetujui oleh crm@aums.jakarta.go.id (Nadia Kusuma, S.Sos).",
        ),
        buildSystemLog(
          "FIELD_OFFICER_ASSIGNED",
          "2026-11-10T09:15:00.000Z",
          "Ditugaskan kepada Agus Setiawan (officer.dlh@aums.jakarta.go.id).",
        ),
        buildAiLog(
          "VERIFICATION_AGENT",
          "2026-11-10T15:30:00.000Z",
          0.96,
          480,
          {
            beforePhotoUrl:
              "https://mock.storage.local/reports/kelapagading-trash-before.jpg",
            afterPhotoUrl:
              "https://mock.storage.local/verifications/kelapagading-trash-after.jpg",
          },
          {
            visualMatch: true,
            isResolved: true,
            auditNotes:
              "Bahu jalan bersih total dari timbulan sampah. Watermark GPS canvas sinkron dengan lokasi penugasan.",
          },
        ),
      ],
    },

    // -------------------------------------------------------------------------
    // 3. Report 3 (Resolved | Tamhut)
    // -------------------------------------------------------------------------
    {
      id: "a1b2c3d4-3333-4000-8000-000000000003",
      title: "Pohon Angsana Tumbang Menutup Lajur di Jl. Medan Merdeka Selatan",
      description:
        "Pohon angsana berdiameter 50cm tumbang melintang di lajur kendaraan akibat hujan lebat disertai angin kencang, menghalangi lajur busway.",
      category: "Pohon Tumbang",
      status: "Resolved",
      priority: "High",
      locationAddress: "Jl. Medan Merdeka Selatan No. 8, Gambir, Jakarta Pusat",
      latitude: -6.1805,
      longitude: 106.8283,
      photoUrl: "https://mock.storage.local/reports/merdeka-tree-before.jpg",
      officerPhotoUrl:
        "https://mock.storage.local/verifications/merdeka-tree-after.jpg",
      officerNotes:
        "Evakuasi batang pohon dengan chainsaw selesai dan potongan kayu telah diangkut.",
      assignedOfficerName: "Wahyu Hidayat, S.P.",
      resolvedAt: new Date("2026-11-09T17:15:00.000Z"),
      reporterId: userMap["warga3@aums.jakarta.go.id"].id,
      departmentId:
        departmentMap["Dinas Pertamanan dan Hutan Kota DKI Jakarta"].id,
      assignedToId: userMap["officer.tamhut@aums.jakarta.go.id"].id,
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
      createdAt: new Date("2026-11-09T13:00:00.000Z"),
      actionPlan: {
        targetAgency: "Dinas Pertamanan dan Hutan Kota DKI Jakarta",
        confidenceScore: 0.97,
        estimatedDays: 1,
        actionSteps: [
          "Pengamanan perimeter kerja bersama Dishub dan Kepolisian",
          "Pemotongan batang dan cabang pohon menggunakan gergaji mesin (chainsaw)",
          "Pemuatan gelondongan kayu dan dahan ke truk pengangkut sampah hijau",
          "Pembersihan serpihan daun dan pembukaan kembali akses lalu lintas",
        ],
        confidenceMetadata: {
          agencyConfidence: 0.98,
          planConfidence: 0.96,
          dispatchReason: "Evakuasi darurat pohon tumbang tupoksi Tamhut DKI",
        },
        approvedBy: "Fajar Pratama, S.AP (CRM Officer)",
        approvedAt: new Date("2026-11-09T13:30:00.000Z"),
      },
      auditLogs: [
        buildAiLog(
          "INTAKE_AGENT",
          "2026-11-09T13:01:00.000Z",
          0.98,
          310,
          { category: "Pohon Tumbang", latitude: -6.1805, longitude: 106.8283 },
          {
            isValid: true,
            urgencyLevel: "High",
            priorityScore: 92,
            category: "Pohon Tumbang",
          },
        ),
        buildAiLog(
          "PLANNING_AGENT",
          "2026-11-09T13:02:00.000Z",
          0.97,
          360,
          {
            targetAgency: "Dinas Pertamanan dan Hutan Kota DKI Jakarta",
          },
          { stepsCount: 4, estimatedDays: 1 },
        ),
        buildSystemLog(
          "CRM_APPROVED",
          "2026-11-09T13:30:00.000Z",
          "Disetujui oleh crm2@aums.jakarta.go.id (Fajar Pratama, S.AP) - Penanganan Darurat.",
        ),
        buildSystemLog(
          "FIELD_OFFICER_ASSIGNED",
          "2026-11-09T13:45:00.000Z",
          "Ditugaskan kepada Wahyu Hidayat, S.P. (officer.tamhut@aums.jakarta.go.id).",
        ),
        buildAiLog(
          "VERIFICATION_AGENT",
          "2026-11-09T17:15:00.000Z",
          0.95,
          490,
          {
            beforePhotoUrl:
              "https://mock.storage.local/reports/merdeka-tree-before.jpg",
            afterPhotoUrl:
              "https://mock.storage.local/verifications/merdeka-tree-after.jpg",
          },
          {
            visualMatch: true,
            isResolved: true,
            auditNotes:
              "Lajur jalan telah bersih dari batang pohon. Watermark koordinat canvas diverifikasi valid.",
          },
        ),
      ],
    },

    // -------------------------------------------------------------------------
    // 4. Report 4 (In_Progress | SDA)
    // -------------------------------------------------------------------------
    {
      id: "a1b2c3d4-4444-4000-8000-000000000004",
      title:
        "Genangan Banjir dan Luapan Drainase di Jl. Tebet Barat Dalam Raya",
      description:
        "Genangan air setinggi 40cm merendam jalan raya sepanjang 150 meter akibat saluran drainase tersumbat lumpur tebal.",
      category: "Banjir & Genangan",
      status: "In_Progress",
      priority: "High",
      locationAddress:
        "Jl. Tebet Barat Dalam Raya No. 12, Tebet Barat, Tebet, Jakarta Selatan",
      latitude: -6.2297,
      longitude: 106.8473,
      photoUrl: "https://mock.storage.local/reports/tebet-flood-before.jpg",
      assignedOfficerName: "Dedi Kurniawan, A.Md",
      reporterId: userMap["warga4@aums.jakarta.go.id"].id,
      departmentId: departmentMap["Dinas Sumber Daya Air DKI Jakarta"].id,
      assignedToId: userMap["officer.sda@aums.jakarta.go.id"].id,
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
      createdAt: new Date("2026-11-11T08:00:00.000Z"),
      actionPlan: {
        targetAgency: "Dinas Sumber Daya Air DKI Jakarta",
        confidenceScore: 0.94,
        estimatedDays: 2,
        actionSteps: [
          "Pengerahan 1 unit pompa mobile berkapasitas 500 liter/detik",
          "Pembersihan sedimentasi dan sampah penyumbat mulut inlet saluran",
          "Pengerukan lumpur saluran penghubung (PHB) Tebet Barat",
          "Uji alir surut genangan air menuju badan kali",
        ],
        confidenceMetadata: {
          agencyConfidence: 0.96,
          planConfidence: 0.93,
          dispatchReason:
            "Pengendalian genangan air & drainase mikro permukiman SDA",
        },
        approvedBy: "Nadia Kusuma, S.Sos (CRM Officer)",
        approvedAt: new Date("2026-11-11T08:30:00.000Z"),
      },
      auditLogs: [
        buildAiLog(
          "INTAKE_AGENT",
          "2026-11-11T08:02:00.000Z",
          0.96,
          350,
          {
            category: "Banjir & Genangan",
            latitude: -6.2297,
            longitude: 106.8473,
          },
          {
            isValid: true,
            urgencyLevel: "High",
            priorityScore: 88,
            category: "Banjir & Genangan",
          },
        ),
        buildAiLog(
          "PLANNING_AGENT",
          "2026-11-11T08:03:00.000Z",
          0.94,
          410,
          {
            targetAgency: "Dinas Sumber Daya Air DKI Jakarta",
          },
          { stepsCount: 4, estimatedDays: 2 },
        ),
        buildSystemLog(
          "CRM_APPROVED",
          "2026-11-11T08:30:00.000Z",
          "Disetujui oleh crm@aums.jakarta.go.id (Nadia Kusuma, S.Sos).",
        ),
        buildSystemLog(
          "FIELD_OFFICER_ASSIGNED",
          "2026-11-11T09:00:00.000Z",
          "Ditugaskan kepada Dedi Kurniawan, A.Md (officer.sda@aums.jakarta.go.id).",
        ),
      ],
    },

    // -------------------------------------------------------------------------
    // 5. Report 5 (In_Progress | Bina Marga)
    // -------------------------------------------------------------------------
    {
      id: "a1b2c3d4-5555-4000-8000-000000000005",
      title:
        "Trotoar dan Guiding Block Rusak Berat di Jl. Jend. Sudirman Kav. 52",
      description:
        "Ubin pemandu disabilitas netra (guiding block) lepas dan amblas sepanjang 25 meter membahayakan pejalan kaki difabel.",
      category: "Trotoar Rusak",
      status: "In_Progress",
      priority: "Medium",
      locationAddress:
        "Jl. Jenderal Sudirman Kav. 52-53, Senayan, Kebayoran Baru, Jakarta Selatan",
      latitude: -6.2246,
      longitude: 106.8091,
      photoUrl:
        "https://mock.storage.local/reports/sudirman-sidewalk-before.jpg",
      assignedOfficerName: "Bambang Suryanto, S.T.",
      reporterId: userMap["warga1@aums.jakarta.go.id"].id,
      departmentId: departmentMap["Dinas Bina Marga DKI Jakarta"].id,
      assignedToId: userMap["officer.binamarga@aums.jakarta.go.id"].id,
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
      createdAt: new Date("2026-11-11T08:15:00.000Z"),
      actionPlan: {
        targetAgency: "Dinas Bina Marga DKI Jakarta",
        confidenceScore: 0.91,
        estimatedDays: 2,
        actionSteps: [
          "Pembongkaran ubin trotoar dan tactile block yang retak dan tidak rata",
          "Perataan dan pemadatan lapisan pasir semen dasar trotoar",
          "Pemasangan ubin granit dan guiding block kuning baru dengan standar aksesibilitas",
          "Grouting nat semen dan pembersihan permukaan trotoar",
        ],
        confidenceMetadata: {
          agencyConfidence: 0.94,
          planConfidence: 0.89,
          dispatchReason:
            "Pemeliharaan fasilitas trotoar ramah disabilitas Bina Marga",
        },
        approvedBy: "Fajar Pratama, S.AP (CRM Officer)",
        approvedAt: new Date("2026-11-11T09:00:00.000Z"),
      },
      auditLogs: [
        buildAiLog(
          "INTAKE_AGENT",
          "2026-11-11T08:16:00.000Z",
          0.92,
          320,
          { category: "Trotoar Rusak", latitude: -6.2246, longitude: 106.8091 },
          {
            isValid: true,
            urgencyLevel: "Medium",
            priorityScore: 68,
            category: "Trotoar Rusak",
          },
        ),
        buildAiLog(
          "PLANNING_AGENT",
          "2026-11-11T08:17:00.000Z",
          0.91,
          370,
          {
            targetAgency: "Dinas Bina Marga DKI Jakarta",
          },
          { stepsCount: 4, estimatedDays: 2 },
        ),
        buildSystemLog(
          "CRM_APPROVED",
          "2026-11-11T09:00:00.000Z",
          "Disetujui oleh crm2@aums.jakarta.go.id (Fajar Pratama, S.AP).",
        ),
        buildSystemLog(
          "FIELD_OFFICER_ASSIGNED",
          "2026-11-11T09:30:00.000Z",
          "Ditugaskan kepada Bambang Suryanto, S.T. (officer.binamarga@aums.jakarta.go.id).",
        ),
      ],
    },

    // -------------------------------------------------------------------------
    // 6. Report 6 (Approved | Dishub)
    // -------------------------------------------------------------------------
    {
      id: "a1b2c3d4-6666-4000-8000-000000000006",
      title: "Lampu Merah (APILL) Mati Total di Simpang Harmoni Jakarta Pusat",
      description:
        "Lampu pengatur lalu lintas mati total di keempat arah simpang Harmoni menimbulkan kesemrawutan arus dan kemacetan parah.",
      category: "Fasilitas Publik",
      status: "Approved",
      priority: "High",
      locationAddress:
        "Simpang Harmoni, Jl. Gajah Mada No. 1, Kebon Kelapa, Gambir, Jakarta Pusat",
      latitude: -6.1656,
      longitude: 106.8205,
      photoUrl:
        "https://mock.storage.local/reports/harmoni-trafficlight-before.jpg",
      reporterId: userMap["warga2@aums.jakarta.go.id"].id,
      departmentId: departmentMap["Dinas Perhubungan DKI Jakarta"].id,
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
      createdAt: new Date("2026-11-11T09:30:00.000Z"),
      actionPlan: {
        targetAgency: "Dinas Perhubungan DKI Jakarta",
        confidenceScore: 0.92,
        estimatedDays: 1,
        actionSteps: [
          "Pemeriksaan panel daya utama dan sistem UPS backup simpang Harmoni",
          "Penggantian modul power supply controller APILL yang terbakar",
          "Pengujian siklus penyalaan lampu merah, kuning, dan hijau di semua fase simpang",
          "Sinkronisasi ulang waktu siklus APILL dengan sistem ATCS Dishub",
        ],
        confidenceMetadata: {
          agencyConfidence: 0.96,
          planConfidence: 0.9,
          dispatchReason:
            "Tupoksi keselamatan lalu lintas dan perlengkapan jalan Dishub",
        },
        approvedBy: "Nadia Kusuma, S.Sos (CRM Officer)",
        approvedAt: new Date("2026-11-11T10:15:00.000Z"),
      },
      auditLogs: [
        buildAiLog(
          "INTAKE_AGENT",
          "2026-11-11T09:31:00.000Z",
          0.95,
          310,
          {
            category: "Fasilitas Publik",
            latitude: -6.1656,
            longitude: 106.8205,
          },
          {
            isValid: true,
            urgencyLevel: "High",
            priorityScore: 90,
            category: "Fasilitas Publik",
          },
        ),
        buildAiLog(
          "PLANNING_AGENT",
          "2026-11-11T09:32:00.000Z",
          0.92,
          380,
          {
            targetAgency: "Dinas Perhubungan DKI Jakarta",
          },
          { stepsCount: 4, estimatedDays: 1 },
        ),
        buildSystemLog(
          "CRM_APPROVED",
          "2026-11-11T10:15:00.000Z",
          "Disetujui oleh crm@aums.jakarta.go.id (Nadia Kusuma, S.Sos) - Menunggu penugasan teknisi.",
        ),
      ],
    },

    // -------------------------------------------------------------------------
    // 7. Report 7 (Pending | Bina Marga | Target Duplikasi)
    // -------------------------------------------------------------------------
    {
      id: "a1b2c3d4-7777-4000-8000-000000000007",
      title: "Amblesan Aspal dan Retakan Lebar di Jl. Kemang Raya",
      description:
        "Badan jalan mengalami penurunan sedalam 20cm dengan retakan memanjang 8 meter di depan pertokoan Kemang, membahayakan kendaraan roda empat.",
      category: "Jalan Rusak",
      status: "Pending",
      priority: "High",
      locationAddress:
        "Jl. Kemang Raya No. 18, Bangka, Mampang Prapatan, Jakarta Selatan",
      latitude: -6.2607,
      longitude: 106.8136,
      photoUrl: "https://mock.storage.local/reports/kemang-road-before.jpg",
      reporterId: userMap["warga3@aums.jakarta.go.id"].id,
      departmentId: departmentMap["Dinas Bina Marga DKI Jakarta"].id,
      isDuplicate: false,
      duplicateCount: 1,
      aiProcessed: true,
      requiresHumanReview: true,
      createdAt: new Date("2026-11-11T10:00:00.000Z"),
      actionPlan: {
        targetAgency: "Dinas Bina Marga DKI Jakarta",
        confidenceScore: 0.89,
        estimatedDays: 2,
        actionSteps: [
          "Pemeriksaan struktur sub-base tanah untuk mendeteksi potensi rongga air bawah tanah",
          "Pengerukan lapisan aspal dan tanah dasar yang mengalami settlement",
          "Pemadatan agregat batu pecah kelas A dan pemberian geotekstil",
          "Penghamparan aspal hotmix binder course dan wearing course",
        ],
        confidenceMetadata: {
          agencyConfidence: 0.93,
          planConfidence: 0.86,
          dispatchReason:
            "Penanganan penurunan konstruksi jalan amblas Bina Marga",
        },
      },
      auditLogs: [
        buildAiLog(
          "INTAKE_AGENT",
          "2026-11-11T10:01:00.000Z",
          0.91,
          360,
          { category: "Jalan Rusak", latitude: -6.2607, longitude: 106.8136 },
          {
            isValid: true,
            urgencyLevel: "High",
            priorityScore: 84,
            category: "Jalan Rusak",
          },
        ),
        buildAiLog(
          "PLANNING_AGENT",
          "2026-11-11T10:02:00.000Z",
          0.89,
          420,
          {
            targetAgency: "Dinas Bina Marga DKI Jakarta",
          },
          { stepsCount: 4, estimatedDays: 2 },
        ),
      ],
    },

    // -------------------------------------------------------------------------
    // 77. Report 77 (Pending | DUPLIKAT TERHUBUNG ke Report 7 | Jarak 14 meter)
    // -------------------------------------------------------------------------
    {
      id: "a1b2c3d4-7777-4000-8000-000000000077",
      title: "Jalan Ambles Parah di Depan Kemang Village Arah Antasari",
      description:
        "Aspal amblas turun cukup dalam dekat Kemang Village, mobil sedan gasruk saat melintas.",
      category: "Jalan Rusak",
      status: "Pending",
      priority: "High",
      locationAddress:
        "Jl. Kemang Raya No. 20, Bangka, Mampang Prapatan, Jakarta Selatan",
      latitude: -6.2608,
      longitude: 106.8137,
      photoUrl: "https://mock.storage.local/reports/kemang-road-before.jpg",
      reporterId: userMap["warga4@aums.jakarta.go.id"].id,
      departmentId: departmentMap["Dinas Bina Marga DKI Jakarta"].id,
      parentReportId: "a1b2c3d4-7777-4000-8000-000000000007",
      isDuplicate: true,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: true,
      createdAt: new Date("2026-11-11T10:20:00.000Z"),
      auditLogs: [
        buildAiLog(
          "INTAKE_AGENT",
          "2026-11-11T10:21:00.000Z",
          0.91,
          290,
          {
            title: "Jalan Ambles Parah di Depan Kemang Village Arah Antasari",
            latitude: -6.2608,
            longitude: 106.8137,
            category: "Jalan Rusak",
          },
          {
            isValid: true,
            isDuplicate: true,
            parentReportId: "a1b2c3d4-7777-4000-8000-000000000007",
            deduplicationConfidence: 0.91,
            distanceMeters: 14.2,
            reasoning:
              "Aduan terdeteksi sebagai duplikat insiden amblesan Jl. Kemang Raya (radius 14.2m < 100m).",
          },
          "AI INTAKE_AGENT mendeteksi duplikasi spasial (jarak 14.2 meter < 100m) dan kemiripan semantik 91%.",
        ),
      ],
    },

    // -------------------------------------------------------------------------
    // 8. Report 8 (Pending | Bina Marga)
    // -------------------------------------------------------------------------
    {
      id: "a1b2c3d4-8888-4000-8000-000000000008",
      title: "Lampu Penerangan Jalan Umum (PJU) Padam Sepanjang Jl. Cikajang",
      description:
        "Tiga tiang lampu PJU mati total berurutan membuat jalan gelap gulita di malam hari dan memicu kerawanan kriminalitas.",
      category: "Fasilitas Publik",
      status: "Pending",
      priority: "Medium",
      locationAddress:
        "Jl. Cikajang No. 34, Petogogan, Kebayoran Baru, Jakarta Selatan",
      latitude: -6.2389,
      longitude: 106.8032,
      photoUrl:
        "https://mock.storage.local/reports/cikajang-streetlight-before.jpg",
      reporterId: userMap["warga1@aums.jakarta.go.id"].id,
      departmentId: departmentMap["Dinas Bina Marga DKI Jakarta"].id,
      isDuplicate: false,
      duplicateCount: 0,
      aiProcessed: true,
      requiresHumanReview: false,
      createdAt: new Date("2026-11-11T11:00:00.000Z"),
      actionPlan: {
        targetAgency: "Dinas Bina Marga DKI Jakarta",
        confidenceScore: 0.87,
        estimatedDays: 1,
        actionSteps: [
          "Pengecekan jaringan kabel bawah tanah dan kotak MCB PJU Cikajang",
          "Penggantian lampu LED armature 120W dan modul driver yang rusak",
          "Pengujian sistem foton timer otomatis penyalaan malam hari",
          "Verifikasi tingkat kuat pencahayaan (lux meter) pada permukaan jalan",
        ],
        confidenceMetadata: {
          agencyConfidence: 0.9,
          planConfidence: 0.85,
          dispatchReason: "Pemeliharaan berkala jaringan PJU Bina Marga",
        },
      },
      auditLogs: [
        buildAiLog(
          "INTAKE_AGENT",
          "2026-11-11T11:01:00.000Z",
          0.88,
          310,
          {
            category: "Fasilitas Publik",
            latitude: -6.2389,
            longitude: 106.8032,
          },
          {
            isValid: true,
            urgencyLevel: "Medium",
            priorityScore: 65,
            category: "Fasilitas Publik",
          },
        ),
        buildAiLog(
          "PLANNING_AGENT",
          "2026-11-11T11:02:00.000Z",
          0.87,
          380,
          {
            targetAgency: "Dinas Bina Marga DKI Jakarta",
          },
          { stepsCount: 4, estimatedDays: 1 },
        ),
      ],
    },
  ];

  for (const reportItem of reportsData) {
    const { actionPlan, auditLogs, ...reportFields } = reportItem;

    const createdReport = await prisma.report.create({
      data: reportFields,
    });
    console.log(
      `  ✔ Report created [${createdReport.status}]: "${createdReport.title}" (${createdReport.id})`,
    );

    // Create ActionPlan if defined
    if (actionPlan) {
      await prisma.actionPlan.create({
        data: {
          reportId: createdReport.id,
          ...actionPlan,
        },
      });
      console.log(`    * ActionPlan created: ${actionPlan.targetAgency}`);
    }

    // Create AuditLogs if defined
    if (auditLogs && auditLogs.length > 0) {
      for (const log of auditLogs) {
        await prisma.auditLog.create({
          data: {
            reportId: createdReport.id,
            ...log,
          },
        });
      }
      console.log(`    * AuditLogs created (${auditLogs.length} entries)`);
    }

    // Synchronize PostGIS geography location column (Point SRID 4326)
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE "Report"
         SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
         WHERE id = $3::uuid`,
        Number(createdReport.longitude),
        Number(createdReport.latitude),
        createdReport.id,
      );
      console.log(
        `    * PostGIS geography synced: Point(${createdReport.longitude}, ${createdReport.latitude})`,
      );
    } catch (spatialErr) {
      console.warn(
        `    ! PostGIS geography update skipped (${spatialErr.message})`,
      );
    }
  }

  // 5. Print Demo Credentials Summary Table
  console.log(
    "\n===============================================================",
  );
  console.log(
    " [AUMS Seeder] DEMO ACCOUNTS & CREDENTIALS SUMMARY TABLE       ",
  );
  console.log(
    "===============================================================",
  );
  const demoTable = usersData.map((u) => ({
    Peran: u.role,
    Nama: u.name,
    Email: u.email,
    Identifier: u.nip || u.nik,
    Password: defaultPassword,
  }));
  console.table(demoTable);

  console.log(
    "\n===============================================================",
  );
  console.log(" [AUMS Seeder] Enterprise Database Seeding Completed 100%!    ");
  console.log(
    "===============================================================",
  );
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("[AUMS Seeder] Fatal Error during seed execution:", error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = main;
