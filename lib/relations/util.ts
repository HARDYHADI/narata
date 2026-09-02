// Shared by lib/wikidata/client.ts, lib/wikipedia/client.ts, and
// lib/relations/discoverContentRelations.ts.

// Wikidata and Wikipedia are free, keyless, shared public services (not
// something we pay for or get dedicated rate limits on) — this pipeline
// waits this long after every request to them to stay a good API citizen.
export const EXTERNAL_REQUEST_DELAY_MS = 250;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Case/whitespace-insensitive exact match only — deliberately no
// fuzzy/similarity scoring. A near-miss title match is how you'd link two
// unrelated works, which is worse than finding nothing (see AGENTS task
// notes on disambiguation discipline).
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}
