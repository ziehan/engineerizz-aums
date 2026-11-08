const prisma = require("../config/prisma.config");

/**
 * Repository isolating PostgreSQL and PostGIS/pgvector persistence concerns for reports.
 */
class ReportRepository {
  /**
   * Persists a new report record and populates the PostGIS spatial geography column.
   *
   * @param {Object} data - Report attribute data.
   * @returns {Promise<Object>} Created report record.
   */
  async create(data) {
    const report = await prisma.report.create({ data });
    await prisma.$executeRawUnsafe(
      `UPDATE "Report"
       SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
       WHERE id = $3::uuid`,
      Number(data.longitude),
      Number(data.latitude),
      report.id,
    );
    return report;
  }

  /**
   * Persists a new report with embedding vector and PostGIS geography location.
   *
   * @param {Object} data - Report attribute data.
   * @param {Array<number>|undefined} embedding - Vector embedding array.
   * @returns {Promise<Object>} Created report record.
   */
  async createWithEmbedding(data, embedding) {
    const report = await prisma.report.create({ data });
    const values = Array.isArray(embedding)
      ? embedding.map(Number).filter(Number.isFinite)
      : [];
    const vector = values.length > 0 ? `[${values.join(",")}]` : null;
    await prisma.$executeRawUnsafe(
      `UPDATE "Report"
       SET location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           embedding = CASE WHEN $3::text IS NULL THEN embedding ELSE $3::vector END
       WHERE id = $4::uuid`,
      Number(data.longitude),
      Number(data.latitude),
      vector,
      report.id,
    );
    return report;
  }

  /**
   * Retrieves reports matching filter criteria with associated action plans.
   *
   * @param {Object} [filters={}] - Prisma query filters.
   * @returns {Promise<Array<Object>>} List of reports.
   */
  async findMany(filters = {}) {
    return prisma.report.findMany({
      where: filters,
      include: { actionPlan: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Retrieves a single report by ID including related audit logs, duplicates, and plans.
   *
   * @param {string} id - Target report UUID.
   * @returns {Promise<Object|null>} Found report record or null.
   */
  async findById(id) {
    return prisma.report.findUnique({
      where: { id },
      include: {
        actionPlan: true,
        auditLogs: { orderBy: { timestamp: "desc" } },
        duplicates: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  /**
   * Identifies nearby candidate reports for deduplication based on category and geospatial delta.
   *
   * @param {Object} report - Target report attributes.
   * @returns {Promise<Array<Object>>} Candidate reports.
   */
  async findDeduplicationCandidates(report) {
    const latitudeDelta = 0.01;
    const longitudeDelta = 0.01;
    return prisma.report.findMany({
      where: {
        isDuplicate: false,
        status: { in: ["Pending", "Approved"] },
        OR: [
          { category: report.category },
          {
            latitude: {
              gte: report.latitude - latitudeDelta,
              lte: report.latitude + latitudeDelta,
            },
            longitude: {
              gte: report.longitude - longitudeDelta,
              lte: report.longitude + longitudeDelta,
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  }

  /**
   * Finds previously resolved reports within 100 meters ranked by pgvector cosine similarity.
   *
   * @param {Object} report - Target report.
   * @returns {Promise<Array<Object>>} List of top-3 similar resolved reports.
   */
  async findSimilarReports(report) {
    return prisma.$queryRawUnsafe(
      `WITH target AS (
         SELECT embedding,
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography AS location
         FROM "Report"
         WHERE id = $1::uuid
       )
       SELECT r.id, r.title, r.description, r.category, r."locationAddress",
              r.latitude, r.longitude, r.status, r.priority, r."createdAt",
              CASE
                WHEN r.embedding IS NOT NULL AND target.embedding IS NOT NULL
                THEN r.embedding <=> target.embedding
                ELSE NULL
              END AS similarity,
              ST_Distance(r.location, target.location) AS distance_meters
       FROM "Report" r
       CROSS JOIN target
       WHERE r.id <> $1::uuid
         AND r.status = 'Resolved'
         AND r.location IS NOT NULL
         AND ST_DWithin(r.location, target.location, 100)
       ORDER BY
         CASE WHEN r.embedding IS NOT NULL AND target.embedding IS NOT NULL
              THEN r.embedding <=> target.embedding ELSE 1 END,
         distance_meters,
         r."createdAt" DESC
       LIMIT 3`,
      report.id,
    );
  }

  /**
   * Updates report attributes by ID.
   *
   * @param {string} id - Target report UUID.
   * @param {Object} data - Update payload.
   * @returns {Promise<Object>} Updated report record.
   */
  async update(id, data) {
    return prisma.report.update({ where: { id }, data });
  }

  /**
   * Upserts the operational action plan associated with a report.
   *
   * @param {string} reportId - Target report UUID.
   * @param {Object} data - Action plan attributes.
   * @returns {Promise<Object>} Upserted action plan record.
   */
  async upsertActionPlan(reportId, data) {
    return prisma.actionPlan.upsert({
      where: { reportId },
      create: { reportId, ...data },
      update: data,
    });
  }

  /**
   * Updates an existing action plan.
   *
   * @param {string} reportId - Target report UUID.
   * @param {Object} data - Update payload.
   * @returns {Promise<Object>} Updated action plan record.
   */
  async updateActionPlan(reportId, data) {
    return prisma.actionPlan.update({ where: { reportId }, data });
  }

  /**
   * Appends an operational event entry to the audit log table.
   *
   * @param {string} reportId - Target report UUID.
   * @param {string} action - Action event name.
   * @param {Object|string} details - Event details.
   * @returns {Promise<Object>} Created audit log record.
   */
  async addAuditLog(reportId, action, details) {
    return prisma.auditLog.create({
      data: {
        reportId,
        action,
        details:
          typeof details === "string" ? details : JSON.stringify(details),
      },
    });
  }

  /**
   * Persists an AI agent execution audit log without impacting main transaction on failure.
   *
   * @param {string} reportId - Target report UUID.
   * @param {string} agentName - Name of the executing AI agent.
   * @param {Object} payload - Input payload dispatched to AI.
   * @param {Object} response - Output received from AI.
   * @param {number|null} [confidenceScore=null] - Confidence score if present.
   * @returns {Promise<Object|null>} Created audit log record or null on error.
   */
  async addAiAuditLog(
    reportId,
    agentName,
    payload,
    response,
    confidenceScore = null,
  ) {
    try {
      return await prisma.auditLog.create({
        data: {
          reportId,
          action: `AI_${agentName}_COMPLETED`,
          details: JSON.stringify({ agentName, confidenceScore }),
          agentName,
          payload,
          response,
          confidenceScore,
        },
      });
    } catch (error) {
      console.error("[AUMS Backend] AI audit log persistence failed:", {
        reportId,
        agentName,
        message: error.message,
      });
      return null;
    }
  }

  /**
   * Marks a report as duplicate of a primary report and increments the primary duplicate count.
   *
   * @param {string} reportId - Duplicate report UUID.
   * @param {string} parentReportId - Primary parent report UUID.
   * @returns {Promise<Object>} Updated duplicate report record.
   */
  async markAsDuplicate(reportId, parentReportId) {
    return prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.report.update({
        where: { id: reportId },
        data: {
          isDuplicate: true,
          parentReportId,
          aiProcessed: true,
        },
      });
      await transaction.report.update({
        where: { id: parentReportId },
        data: {
          duplicateCount: { increment: 1 },
          priority: "High",
        },
      });
      return duplicate;
    });
  }

  /**
   * Deletes a report by unique ID.
   *
   * @param {string} id - Target report UUID.
   * @returns {Promise<Object>} Deleted report record.
   */
  async deleteById(id) {
    return prisma.report.delete({ where: { id } });
  }

  /**
   * Removes a duplicate report and decrements the primary report duplicate count.
   *
   * @param {string} id - Duplicate report UUID.
   * @returns {Promise<Object|null>} Deleted report record or null if not found.
   */
  async deleteDuplicateById(id) {
    return prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.report.findUnique({
        where: { id },
        select: { id: true, isDuplicate: true, parentReportId: true },
      });
      if (!duplicate) return null;
      if (!duplicate.isDuplicate || !duplicate.parentReportId) {
        const error = new Error("Report is not a duplicate");
        error.statusCode = 400;
        throw error;
      }

      await transaction.report.delete({ where: { id } });
      await transaction.report.updateMany({
        where: { id: duplicate.parentReportId, duplicateCount: { gt: 0 } },
        data: { duplicateCount: { decrement: 1 } },
      });
      return duplicate;
    });
  }
}

module.exports = ReportRepository;
