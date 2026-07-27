import { exportExpensesCsv, exportDatabaseJson } from "@/lib/csv";
import { handleError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "csv";

    if (format === "json") {
      const json = await exportDatabaseJson();
      return new Response(json, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="finance-backup-${Date.now()}.json"`,
        },
      });
    }

    const csv = await exportExpensesCsv();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="expenses-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
