import type { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Fixed-window rate limit backed by Supabase — no external service (Redis,
 * Vercel KV, etc.) needed, reusing the DB we already have. Counts rows for
 * (bucketKey, route) created within the last `windowMinutes`; if under
 * `limit`, records this attempt and allows it.
 *
 * Best-effort, fails open: a transient DB error returns `allowed: true`
 * rather than blocking the request. This is a cost-control safety net
 * against runaway OpenAI spend, not a security boundary — an occasional
 * missed check is a much smaller problem than an AI feature going down
 * because the rate-limit table had a bad moment.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  bucketKey: string,
  route: string,
  limit: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  try {
    const { count, error: countError } = await supabase
      .from("rate_limit_event")
      .select("id", { count: "exact", head: true })
      .eq("bucket_key", bucketKey)
      .eq("route", route)
      .gte("created_at", windowStart);

    if (countError) throw countError;

    if ((count ?? 0) >= limit) {
      return { allowed: false, retryAfterSeconds: windowMinutes * 60 };
    }

    const { error: insertError } = await supabase
      .from("rate_limit_event")
      .insert({ bucket_key: bucketKey, route });
    if (insertError) throw insertError;

    return { allowed: true };
  } catch (error) {
    console.error(`rate limit check failed for route="${route}" bucket="${bucketKey}", failing open`, error);
    return { allowed: true };
  }
}

export function resolveBucketKey(userId: string | null, ipHash: string): string {
  return userId ? `user:${userId}` : `ip:${ipHash}`;
}
