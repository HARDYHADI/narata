"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  fetchFilteredMoviePage,
  MOVIE_PAGE_SIZE,
  type MovieFilterParams,
  type MovieListItem,
} from "@/lib/movies/queries";
import MovieCard from "@/components/movie-card";

export default function MovieInfiniteGrid({
  initialMovies,
  filters = {},
  contentType = "MOVIE",
}: {
  initialMovies: MovieListItem[];
  filters?: MovieFilterParams;
  contentType?: string;
}) {
  const [movies, setMovies] = useState(initialMovies);
  const [hasMore, setHasMore] = useState(initialMovies.length === MOVIE_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const nextPageRef = useRef(1);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        setLoading(true);

        const supabase = getSupabaseClient();
        if (!supabase) {
          setLoading(false);
          return;
        }

        const next = await fetchFilteredMoviePage(
          supabase,
          nextPageRef.current,
          filters,
          contentType
        );
        nextPageRef.current += 1;
        setMovies((prev) => [...prev, ...next]);
        setHasMore(next.length === MOVIE_PAGE_SIZE);
        setLoading(false);
      },
      { rootMargin: "600px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (movies.length === 0) {
    return <p className="muted">아직 등록된 영화가 없습니다.</p>;
  }

  return (
    <>
      <div className="content-grid">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loading && (
        <p className="muted" style={{ textAlign: "center", marginTop: 24 }}>
          불러오는 중...
        </p>
      )}
      {!hasMore && (
        <p className="muted" style={{ textAlign: "center", marginTop: 24 }}>
          마지막 작품까지 모두 봤어요.
        </p>
      )}
    </>
  );
}
