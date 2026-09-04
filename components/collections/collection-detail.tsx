"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchCollection, removeFromCollection, type CollectionDetail as CollectionDetailType } from "@/lib/collections/queries";
import MovieCard from "@/components/movie-card";

type Status = "loading" | "not_found" | "ready";

export default function CollectionDetail({ collectionId }: { collectionId: string }) {
  const [status, setStatus] = useState<Status>("loading");
  const [collection, setCollection] = useState<CollectionDetailType | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setStatus("not_found");
        return;
      }

      const [detail, userResult] = await Promise.all([
        fetchCollection(supabase, collectionId),
        supabase.auth.getUser(),
      ]);
      if (cancelled) return;

      if (!detail) {
        setStatus("not_found");
        return;
      }

      setCollection(detail);
      setIsOwner(userResult.data.user?.id === detail.user_id);
      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  async function handleRemove(contentId: string) {
    const supabase = getSupabaseClient();
    if (!supabase || !collection) return;

    setRemovingId(contentId);
    const result = await removeFromCollection(supabase, collection.id, contentId);
    setRemovingId(null);

    if (result.success) {
      setCollection((prev) => (prev ? { ...prev, items: prev.items.filter((i) => i.content_id !== contentId) } : prev));
    }
  }

  if (status === "loading") {
    return <p className="muted">불러오는 중...</p>;
  }

  if (status === "not_found") {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <p className="muted" style={{ margin: 0 }}>
          찾을 수 없거나 비공개 컬렉션이에요.
        </p>
      </div>
    );
  }

  const c = collection!;

  return (
    <div>
      <div className="page-title">
        <div>
          <span className="eyebrow">{c.is_public ? "공개 컬렉션" : "비공개 컬렉션"}</span>
          <h1>{c.name}</h1>
          {c.description && <p>{c.description}</p>}
        </div>
      </div>

      {c.items.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <p className="muted" style={{ margin: 0 }}>
            아직 담긴 작품이 없어요.
          </p>
        </div>
      ) : (
        <div className="content-grid">
          {c.items.map((item) =>
            item.movie ? (
              <div key={item.content_id} style={{ position: "relative" }}>
                <MovieCard movie={item.movie} />
                {isOwner && (
                  <button
                    type="button"
                    className="pill"
                    disabled={removingId === item.content_id}
                    onClick={(e) => {
                      e.preventDefault();
                      handleRemove(item.content_id);
                    }}
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    {removingId === item.content_id ? "제거 중" : "제거"}
                  </button>
                )}
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
