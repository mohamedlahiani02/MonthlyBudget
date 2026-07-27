import { importExpensesCsv } from "@/lib/csv";
import { ok, handleError } from "@/lib/api";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";
    let text: string;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return Response.json({ error: "No file provided" }, { status: 400 });
      }
      text = await file.text();
    } else {
      text = await req.text();
    }

    const result = await importExpensesCsv(text);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
