const ReportRepository = require("../repositories/report.repository");

class RagService {
  constructor(repository = new ReportRepository()) {
    this.repository = repository;
  }

  /**
   * Mengambil dan menormalkan laporan serupa untuk konteks RAG.
   *
   * @param {object} report Laporan target
   * @returns {Promise<Array<object>>} Daftar laporan serupa
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
   * Membentuk laporan serupa menjadi struktur konteks untuk AI.
   *
   * @param {Array<object>} reports Daftar laporan serupa
   * @returns {Array<object>} Konteks RAG berperingkat
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
