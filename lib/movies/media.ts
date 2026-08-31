import type { SupabaseClient } from "@supabase/supabase-js";

export interface ContentVideo {
  id: string;
  video_type: "TRAILER" | "TEASER" | "INTERVIEW" | "OST" | "CLIP";
  title: string;
  url: string;
  provider_label: string | null;
  duration_seconds: number | null;
  published_at: string | null;
}

const CONTENT_VIDEO_SELECT =
  "id, video_type, title, url, provider_label, duration_seconds, published_at";

export async function fetchContentVideos(
  supabase: SupabaseClient,
  contentId: string
): Promise<ContentVideo[]> {
  const { data, error } = await supabase
    .from("content_video")
    .select(CONTENT_VIDEO_SELECT)
    .eq("content_id", contentId)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    console.error("failed to load content videos", error);
    return [];
  }

  return (data ?? []) as unknown as ContentVideo[];
}

export interface ContentWatchProvider {
  country_code: string;
  type: "STREAMING" | "RENT" | "BUY" | "THEATER";
  url: string | null;
  provider: { name: string; logo_url: string | null } | null;
}

const CONTENT_WATCH_PROVIDER_SELECT =
  "country_code, type, url, provider:watch_provider(name, logo_url)";

export async function fetchContentWatchProviders(
  supabase: SupabaseClient,
  contentId: string,
  countryCode = "KR"
): Promise<ContentWatchProvider[]> {
  const { data, error } = await supabase
    .from("content_watch_provider")
    .select(CONTENT_WATCH_PROVIDER_SELECT)
    .eq("content_id", contentId)
    .eq("country_code", countryCode);

  if (error) {
    console.error("failed to load content watch providers", error);
    return [];
  }

  return (data ?? []) as unknown as ContentWatchProvider[];
}
