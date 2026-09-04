"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchMyCollections, createCollection, type Collection } from "@/lib/collections/queries";

export default function CollectionsList() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        setReady(true);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setLoggedIn(Boolean(user));

      if (user) {
        const list = await fetchMyCollections(supabase);
        if (!cancelled) setCollections(list);
      }

      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    setCreating(true);
    setNotice(null);
    const result = await createCollection(supabase, name, undefined, true);
    setCreating(false);

    if (!result.success || !result.collection) {
      setNotice("컬렉션 생성에 실패했어요. 잠시 후 다시 시도해주세요.");
      return;
    }

    setCollections((prev) => [result.collection!, ...prev]);
    setNewName("");
  }

  if (!ready) {
    return <p className="muted">불러오는 중...</p>;
  }

  if (!loggedIn) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <p className="muted" style={{ margin: 0 }}>
          로그인이 필요해요. 로그인하면 만든 컬렉션을 여기서 볼 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="새 컬렉션 이름"
          style={{
            flex: "1 1 220px",
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(6, 53, 50, 0.16)",
            font: "inherit",
          }}
        />
        <button type="button" className="btn orange" disabled={creating || !newName.trim()} onClick={handleCreate}>
          컬렉션 만들기
        </button>
      </div>
      {notice && <div className="muted" style={{ fontSize: 12 }}>{notice}</div>}

      {collections.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <p className="muted" style={{ margin: 0 }}>
            아직 만든 컬렉션이 없어요. 작품 페이지의 &quot;컬렉션에 추가&quot; 버튼으로도 새 컬렉션을 만들 수 있어요.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.id}`}
              className="card"
              style={{
                padding: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div>
                <b style={{ fontSize: 16 }}>{c.name}</b>
                {c.description && (
                  <div className="sub" style={{ marginTop: 4 }}>
                    {c.description}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {!c.is_public && <span className="pill">비공개</span>}
                <span className="pill orange">{c.item_count}개</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
