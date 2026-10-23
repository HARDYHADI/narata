import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedAdminRequest } from "@/lib/admin-auth";
import { runTmdbBackfill, serializeError } from "@/lib/ingestion/ingestTmdbPopular";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedAdminRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "5");
  const pages = Number(request.nextUrl.searchParams.get("pages") ?? "1");

  try {
    const summary = await runTmdbBackfill(page, pages, limit);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: serializeError(error) }, { status: 500 });
  }
}
