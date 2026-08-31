import { randomBytes, scrypt, createHash, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// Guest post/comment passwords are hashed with scrypt (Node builtin, no new
// dependency). Stored as "salt:hash", both hex. Lost guest passwords are NOT
// recoverable — there is no reset flow, ever.
export async function hashGuestPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyGuestPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const storedBuf = Buffer.from(hashHex, "hex");
  if (derived.length !== storedBuf.length) return false;

  return timingSafeEqual(derived, storedBuf);
}

// We never persist a requester's raw IP — only a SHA-256 hash of it, used
// solely to render a DCInside-style "ㅇㅇ(xx.x)" tag distinguishing different
// anonymous posters in a thread. Not reversible to the real IP.
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export function getRequestIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

interface TurnstileVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

// CAPTCHA gate for anonymous submissions. env-var-gated per this app's
// existing pattern (e.g. INGEST_ADMIN_SECRET): if TURNSTILE_SECRET_KEY isn't
// set, verification is skipped (with a server warning) so the feature still
// fully works in environments without Turnstile configured. Once the product
// owner signs up for Cloudflare Turnstile and sets TURNSTILE_SECRET_KEY
// (server) + NEXT_PUBLIC_TURNSTILE_SITE_KEY (client widget), this becomes
// real enforcement.
export async function verifyTurnstile(token: string | null | undefined): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn(
      "TURNSTILE_SECRET_KEY is not set — skipping CAPTCHA verification for anonymous community post/comment. " +
        "Set TURNSTILE_SECRET_KEY (server) and NEXT_PUBLIC_TURNSTILE_SITE_KEY (client) to enforce it."
    );
    return true;
  }

  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });

    const result = (await response.json()) as TurnstileVerifyResponse;
    return result.success === true;
  } catch (error) {
    console.error("failed to verify turnstile token", error);
    return false;
  }
}
