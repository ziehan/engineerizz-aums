const ReportRepository = require("../repositories/report.repository");

/**
 * Builds retrieval-augmented generation context from report records.
 */
class RagService {
  /**
   * @param {ReportRepository} [repository] Report repository dependency.
   */
  constructor(repository = new ReportRepository()) {
    this.repository = repository;
  }

  /**
   * Retrieves and normalizes similar reports for RAG context.
   *
   * @param {object} report Target report.
   * @returns {Promise<Array<object>>} Similar reports.
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
   * @param {Array<object>} reports Similar reports.
   * @returns {Array<object>} Ranked RAG context.
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
