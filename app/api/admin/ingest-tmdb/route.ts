import { NextRequest, NextResponse } from "next/server";
import { runTmdbPopularIngestion, serializeError } from "@/lib/ingestion/ingestTmdbPopular";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.INGEST_ADMIN_SECRET;
  const providedSecret = request.nextUrl.searchParams.get("secret");

  if (!secret || providedSecret !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "5");

  try {
    const results = await runTmdbPopularIngestion(page, limit);
    return NextResponse.json({ page, limit, results });
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}
