const ReportRepository = require("../repositories/report.repository");

/**
 * @typedef {Object} SimilarReportEntity
 * @property {string} id - Report UUID.
 * @property {string} title - Incident title.
 * @property {string} description - Incident description.
 * @property {string} category - Issue category.
 * @property {string} locationAddress - Street address.
 * @property {number} latitude - Decimal latitude.
 * @property {number} longitude - Decimal longitude.
 * @property {string} status - Report status (typically "Resolved").
 * @property {string} priority - Incident priority level.
 * @property {number|null} similarity - Cosine distance from pgvector (<=>).
 * @property {Date} createdAt - Incident submission timestamp.
 */

/**
 * @typedef {Object} RankedRagContextItem
 * @property {number} rank - Priority ranking position (1-based).
 * @property {string} reportId - Historical report UUID.
 * @property {string} issue - Historical issue title.
 * @property {string} description - Historical issue details.
 * @property {string} category - Problem category.
 * @property {{address: string, latitude: number, longitude: number}} location - Geospatial attributes.
 * @property {string} status - Resolution status.
 * @property {string} priority - Historical priority level.
 * @property {number|null} cosineDistance - Measured pgvector vector similarity (<=>).
 * @property {Date} createdAt - Timestamp of historical record.
 */

/**
 * Builds retrieval-augmented generation context from report records.
 *
 * @description
 * Queries similar resolved historical reports using combined PostGIS spatial proximity (< 100m)
 * and pgvector cosine distance, and formats them into structured context for the PlanningAgent.
 */
class RagService {
  /**
   * Initializes RagService with ReportRepository dependency.
   *
   * @param {ReportRepository} [repository] - Report repository dependency.
   */
  constructor(repository = new ReportRepository()) {
    this.repository = repository;
  }

  /**
   * Retrieves and normalizes similar reports for RAG context.
   *
   * @description
   * Calls repository.findSimilarReports() to find top-3 resolved reports within 100 meters
   * sorted by pgvector cosine distance and geographical distance.
   *
   * @param {Object} report - Target report entity containing id, latitude, longitude, and embedding.
   * @returns {Promise<Array<SimilarReportEntity>>} Array of similar normalized historical reports.
   */
  async getSimilarReports(report) {
    const reports = await this.repository.findSimilarReports(report);
    return reports.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      locationAddress: item.locationAddress,
      latitude: item.latitude,
      longitude: item.longitude,
      status: item.status,
      priority: item.priority,
      similarity: item.similarity === null ? null : Number(item.similarity),
      createdAt: item.createdAt,
    }));
  }

  /**
   * Formats similar reports into a ranked AI context structure.
   *
   * @description
   * Maps raw reports into a clean, human-readable ranked context array suitable for
   * injection into PlanningAgent prompt.
   *
   * @param {Array<SimilarReportEntity>} reports - Similar reports array from getSimilarReports.
   * @returns {Array<RankedRagContextItem>} Ranked RAG context array for AI model prompt.
   */
  formatContext(reports) {
    return reports.map((report, index) => ({
      rank: index + 1,
      reportId: report.id,
      issue: report.title,
      description: report.description,
      category: report.category,
      location: {
        address: report.locationAddress,
        latitude: report.latitude,
        longitude: report.longitude,
      },
      status: report.status,
      priority: report.priority,
      cosineDistance: report.similarity,
      createdAt: report.createdAt,
    }));
  }
}

module.exports = RagService;
