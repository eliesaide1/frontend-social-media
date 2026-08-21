/**
 * Reports service — placeholder for report generation.
 * Will aggregate data from all platform services into exportable reports.
 */

export interface Report {
  id: string;
  title: string;
  dateRange: string;
  createdAt: string;
  status: "ready" | "generating";
}

// Placeholder — reports feature to be built later

export async function getReports(_clientId: string): Promise<Report[]> {
  // TODO: Implement report listing
  throw new Error("Reports not yet implemented");
}

export async function exportReport(
  _clientId: string,
  _dateRange: string
): Promise<Blob> {
  // TODO: Implement report export
  throw new Error("Report export not yet implemented");
}
