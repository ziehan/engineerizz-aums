import type useReportList from "@/hooks/useReportList";

export type ReportsData = Pick<
  ReturnType<typeof useReportList>,
  "reports" | "isLoading" | "error"
>;