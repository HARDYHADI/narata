"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { addToCollection, createCollection, fetchMyCollections, type Collection } from "@/lib/collections/queries";

export default function CollectionPickerButton({ contentId }: { contentId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [addingId, setAddingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function handleToggleOpen() {
    const next = !open;
    setOpen(next);
    if (!next || checkedAuth) return;

    setLoading(true);
    const supabase = getSupabaseClient();
    if (!supabase) {
      setCheckedAuth(true);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setLoggedIn(Boolean(user));
    setCheckedAuth(true);

    if (user) {
      const list = await fetchMyCollections(supabase);
      setCollections(list);
    }
    setLoading(false);
  }

  async function handleAdd(collectionId: string) {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    setAddingId(collectionId);
    setNotice(null);
    const result = await addToCollection(supabase, collectionId, contentId);
    setAddingId(null);

    if (result.success) {
      setAddedIds((prev) => new Set(prev).add(collectionId));
    } else {
      setNotice("추가에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setCreating(true);
    setNotice(null);
    const result = await createCollection(supabase, name, undefined, true);

    if (!result.success || !result.collection) {
      setCreating(false);
      setNotice("컬렉션 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    const created = result.collection;
    setCollections((prev) => [created, ...prev]);
    setNewName("");

    const addResult = await addToCollection(supabase, created.id, contentId);
    setCreating(false);

    if (addResult.success) {
      setAddedIds((prev) => new Set(prev).add(created.id));
    } else {
      setNotice("컬렉션은 만들었지만 추가에 실패했어요.");
    }
  }

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" className="btn ghost" onClick={handleToggleOpen}>
        컬렉션에 추가
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            width: 260,
            padding: 14,
            zIndex: 20,
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
          }}
        >
          {loading && <p className="muted" style={{ fontSize: 13, margin: 0 }}>불러오는 중...</p>}

          {!loading && checkedAuth && !loggedIn && (
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>로그인이 필요해요.</p>
          )}

          {!loading && loggedIn && (
            <>
              {collections.length === 0 ? (
                <p className="muted" style={{ fontSize: 13, margin: "0 0 10px" }}>
                  아직 만든 컬렉션이 없어요.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    maxHeight: 180,
                    overflowY: "auto",
                    marginBottom: 10,
                  }}
                >
                  {collections.map((collection) => {
                    const added = addedIds.has(collection.id);
                    return (
                      <button
                        key={collection.id}
                        type="button"
                        disabled={added || addingId === collection.id}
                        onClick={() => handleAdd(collection.id)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                          background: "transparent",
                          border: "1px solid rgba(6, 53, 50, 0.15)",
                          borderRadius: 8,
                          padding: "7px 10px",
                          font: "inherit",
                          fontSize: 13,
                          textAlign: "left",
                          cursor: added ? "default" : "pointer",
                          color: "inherit",
                        }}
                      >
                        <span>{collection.name}</span>
                        <span className="muted" style={{ fontSize: 12 }}>
                          {added ? "추가됨" : addingId === collection.id ? "추가 중" : "추가"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="새 컬렉션 이름"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "1px solid rgba(6, 53, 50, 0.2)",
                    fontSize: 13,
                  }}
                />
                <button
                  type="button"
                  className="btn orange"
                  disabled={creating || !newName.trim()}
                  onClick={handleCreate}
                  style={{ height: "auto", padding: "0 12px", fontSize: 13 }}
                >
                  만들기
                </button>
              </div>
            </>
          )}

          {notice && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
              {notice}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
