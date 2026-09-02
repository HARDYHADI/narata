import type { SupabaseClient } from "@supabase/supabase-js";
import { searchWikidataEntity, fetchWikidataClaims } from "../wikidata/client";
import { fetchWikipediaSummary } from "../wikipedia/client";
import { extractRelationsFromText, type RelationType } from "./extractRelationsFromText";
import { normalizeTitle } from "./util";

const FETCH_PAGE_SIZE = 1000;

async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + FETCH_PAGE_SIZE - 1);
    if (error) throw error;

    rows.push(...((data ?? []) as unknown as T[]));
    if (!data || data.length < FETCH_PAGE_SIZE) break;
    from += FETCH_PAGE_SIZE;
  }

  return rows;
}

export interface RelationMatchIndexes {
  /** normalizeTitle(canonical_title | alias_title) -> content.id */
  titleIndex: Map<string, string>;
  /** content.wikidata_qid -> content.id */
  qidIndex: Map<string, string>;
}

/**
 * Loads every content/content_alias title into an in-memory index for
 * normalized (case/whitespace-insensitive) exact-match lookups, and every
 * already-resolved wikidata_qid for direct QID matching. Built once per
 * bulk-discovery invocation (see the admin route) and reused across the
 * whole page of content it processes.
 */
export async function buildRelationMatchIndexes(supabase: SupabaseClient): Promise<RelationMatchIndexes> {
  const [contentRows, aliasRows] = await Promise.all([
    fetchAllRows<{ id: string; canonical_title: string; wikidata_qid: string | null }>(
      supabase,
      "content",
      "id, canonical_title, wikidata_qid"
    ),
    fetchAllRows<{ content_id: string; alias_title: string }>(
      supabase,
      "content_alias",
      "content_id, alias_title"
    ),
  ]);

  const titleIndex = new Map<string, string>();
  const qidIndex = new Map<string, string>();

  for (const row of contentRows) {
    const key = normalizeTitle(row.canonical_title);
    if (!titleIndex.has(key)) titleIndex.set(key, row.id);
    if (row.wikidata_qid) qidIndex.set(row.wikidata_qid, row.id);
  }
  for (const row of aliasRows) {
    const key = normalizeTitle(row.alias_title);
    if (!titleIndex.has(key)) titleIndex.set(key, row.content_id);
  }

  return { titleIndex, qidIndex };
}

export interface DiscoverableContent {
  id: string;
  canonical_title: string;
  content_type: string;
  release_date: string | null;
  wikidata_qid: string | null;
}

interface RelationCandidate {
  source_content_id: string;
  target_content_id: string;
  relation_type: RelationType;
  confidence: number;
  source_id: string;
  evidence_text: string | null;
}

export interface DiscoverResult {
  contentId: string;
  tier1RelationsCreated: number;
  tier2RelationsCreated: number;
  wikidataQid: string | null;
  skippedTier2Reason?: string;
}

/**
 * Runs tier 1 (Wikidata) then, only if tier 1 found nothing, tier 2
 * (Wikipedia summary + grounded LLM extraction) for one content row, and
 * upserts whatever relations it confidently resolved against `indexes`.
 *
 * Direction convention: for a P144 ("based on") claim, this content is the
 * adaptation and the claim target is the original — the row is written as
 * `source=this content, relation_type=ADAPTATION, target=original`. P179
 * ("part of the series") relations are written the same way, source=this
 * content. (The schema also allows the ORIGINAL relation_type for the
 * inverse reading — this pipeline never emits it, to keep direction
 * consistent instead of writing both sides.)
 */
export async function discoverRelationsForContent(
  supabase: SupabaseClient,
  content: DiscoverableContent,
  indexes: RelationMatchIndexes
): Promise<DiscoverResult> {
  const releaseYear = content.release_date ? Number(content.release_date.slice(0, 4)) : null;
  let qid = content.wikidata_qid;
  const tier1Relations: RelationCandidate[] = [];

  if (!qid) {
    const candidate = await searchWikidataEntity(content.canonical_title, releaseYear, content.content_type);
    if (candidate) {
      qid = candidate.qid;
      const { error } = await supabase.from("content").update({ wikidata_qid: qid }).eq("id", content.id);
      if (error) {
        // Most likely the unique constraint (another content row already
        // claimed this QID) — non-fatal, just don't persist it; the claims
        // lookup below still runs against it for this invocation.
        console.error(`failed to persist wikidata_qid (${qid}) for content ${content.id}`, error);
      } else {
        indexes.qidIndex.set(qid, content.id);
      }
    }
  }

  if (qid) {
    const claims = await fetchWikidataClaims(qid);
    for (const claim of claims) {
      const matchedId =
        indexes.qidIndex.get(claim.targetQid) ??
        (claim.label ? indexes.titleIndex.get(normalizeTitle(claim.label)) : undefined);
      if (!matchedId || matchedId === content.id) continue;

      tier1Relations.push({
        source_content_id: content.id,
        target_content_id: matchedId,
        relation_type: claim.property === "P144" ? "ADAPTATION" : "SAME_UNIVERSE",
        confidence: 1.0,
        source_id: "wikidata",
        evidence_text: null,
      });
    }
  }

  const tier2Relations: RelationCandidate[] = [];
  let skippedTier2Reason: string | undefined;

  // Tier 2 only runs when tier 1 found nothing, to control OpenAI cost.
  if (tier1Relations.length === 0) {
    const summary = await fetchWikipediaSummary(content.canonical_title, "ko");
    if (!summary) {
      skippedTier2Reason = "no_wikipedia_extract";
    } else {
      const extracted = await extractRelationsFromText(content.canonical_title, summary.extract);
      for (const rel of extracted) {
        const matchedId = indexes.titleIndex.get(normalizeTitle(rel.relatedTitle));
        if (!matchedId || matchedId === content.id) continue;

        tier2Relations.push({
          source_content_id: content.id,
          target_content_id: matchedId,
          relation_type: rel.relationType,
          confidence: 0.6,
          source_id: "wikipedia_llm",
          evidence_text: rel.evidenceQuote,
        });
      }
    }
  }

  const allRelations = [...tier1Relations, ...tier2Relations];
  if (allRelations.length > 0) {
    const { error } = await supabase
      .from("content_relation")
      .upsert(allRelations, {
        onConflict: "source_content_id,target_content_id,relation_type",
        ignoreDuplicates: true,
      });
    if (error) {
      console.error(`failed to upsert content relations for ${content.id}`, error);
    }
  }

  return {
    contentId: content.id,
    tier1RelationsCreated: tier1Relations.length,
    tier2RelationsCreated: tier2Relations.length,
    wikidataQid: qid ?? null,
    skippedTier2Reason,
  };
}
