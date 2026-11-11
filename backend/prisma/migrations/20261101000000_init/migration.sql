-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CITIZEN', 'FIELD_OFFICER', 'CRM_OFFICER', 'ADMIN');
CREATE TYPE "ReportStatus" AS ENUM ('Pending', 'PENDING_AI', 'Approved', 'In_Progress', 'Resolved', 'Rejected');
CREATE TYPE "Priority" AS ENUM ('Low', 'Medium', 'High');

-- CreateTable Department
CREATE TABLE IF NOT EXISTS "Department" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable User
CREATE TABLE IF NOT EXISTS "User" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CITIZEN',
    "departmentId" UUID,
    "nip" TEXT,
    "unit" TEXT,
    "phone" TEXT,
    "nik" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable Report
CREATE TABLE IF NOT EXISTS "Report" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'Pending',
    "priority" "Priority" NOT NULL DEFAULT 'Medium',
    "locationAddress" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "photoUrl" TEXT,
    "officerPhotoUrl" TEXT,
    "officerNotes" TEXT,
    "assignedOfficerName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "parentReportId" UUID,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "aiProcessed" BOOLEAN NOT NULL DEFAULT false,
    "requiresHumanReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reporterId" UUID,
    "departmentId" UUID,
    "assignedToId" UUID,
    "embedding" vector(768),
    "location" geography(Point, 4326),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable ActionPlan
CREATE TABLE IF NOT EXISTS "ActionPlan" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reportId" UUID NOT NULL,
    "targetAgency" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "estimatedDays" INTEGER NOT NULL,
    "actionSteps" JSONB NOT NULL,
    "confidenceMetadata" JSONB,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable AuditLog
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "reportId" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "agentName" TEXT,
    "payload" JSONB,
    "response" JSONB,
    "confidenceScore" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Department_name_key" ON "Department"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_nip_key" ON "User"("nip");
CREATE INDEX IF NOT EXISTS "User_departmentId_idx" ON "User"("departmentId");

CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");
CREATE INDEX IF NOT EXISTS "Report_category_idx" ON "Report"("category");
CREATE INDEX IF NOT EXISTS "Report_priority_idx" ON "Report"("priority");
CREATE INDEX IF NOT EXISTS "Report_parentReportId_idx" ON "Report"("parentReportId");
CREATE INDEX IF NOT EXISTS "Report_departmentId_idx" ON "Report"("departmentId");
CREATE INDEX IF NOT EXISTS "Report_assignedToId_idx" ON "Report"("assignedToId");

-- Spatial GiST and Vector IVFFlat Indices
CREATE INDEX IF NOT EXISTS "Report_embedding_idx" ON "Report" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS "Report_location_gist_idx" ON "Report" USING gist (location);

CREATE UNIQUE INDEX IF NOT EXISTS "ActionPlan_reportId_key" ON "ActionPlan"("reportId");

CREATE INDEX IF NOT EXISTS "AuditLog_reportId_idx" ON "AuditLog"("reportId");
CREATE INDEX IF NOT EXISTS "AuditLog_agentName_idx" ON "AuditLog"("agentName");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_departmentId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Report_parentReportId_fkey') THEN
    ALTER TABLE "Report" ADD CONSTRAINT "Report_parentReportId_fkey" FOREIGN KEY ("parentReportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Report_reporterId_fkey') THEN
    ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Report_departmentId_fkey') THEN
    ALTER TABLE "Report" ADD CONSTRAINT "Report_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Report_assignedToId_fkey') THEN
    ALTER TABLE "Report" ADD CONSTRAINT "Report_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ActionPlan_reportId_fkey') THEN
    ALTER TABLE "ActionPlan" ADD CONSTRAINT "ActionPlan_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_reportId_fkey') THEN
    ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
