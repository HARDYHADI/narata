import { timingSafeEqual } from "node:crypto";

// /api/admin/* routes authenticate with `Authorization: Bearer <INGEST_ADMIN_SECRET>`
// (a header, not a query param, so the secret stays out of request logs).
export function isAuthorizedAdminRequest(request: Request): boolean {
  const secret = process.env.INGEST_ADMIN_SECRET;
  if (!secret) return false;

  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

// Headers for a route re-invoking itself (batch continuation via after()).
export function adminAuthHeaders(): Record<string, string> {
  return { authorization: `Bearer ${process.env.INGEST_ADMIN_SECRET}` };
}
