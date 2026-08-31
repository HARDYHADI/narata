"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchWatchlistMovies } from "@/lib/collections/queries";
import type { MovieListItem } from "@/lib/movies/queries";
import MovieCard from "@/components/movie-card";

export default function WatchlistView() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [movies, setMovies] = useState<MovieListItem[]>([]);

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
        const list = await fetchWatchlistMovies(supabase);
        if (!cancelled) setMovies(list);
      }

      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <p className="muted">불러오는 중...</p>;
  }

  if (!loggedIn) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <p className="muted" style={{ margin: 0 }}>
          로그인이 필요해요. 로그인하면 담아둔 작품을 여기서 볼 수 있어요.
        </p>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <p className="muted" style={{ margin: 0 }}>
          아직 &quot;보고 싶어요&quot;에 담은 작품이 없어요.
        </p>
      </div>
    );
  }

  return (
    <div className="content-grid">
      {movies.map((movie) => (
        <MovieCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
