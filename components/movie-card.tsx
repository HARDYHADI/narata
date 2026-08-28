import Link from "next/link";
import type { MovieListItem } from "@/lib/movies/queries";

export default function MovieCard({ movie }: { movie: MovieListItem }) {
  return (
    <Link href={`/movies/${movie.id}`} className="content-card">
      <div className={`content-thumb${movie.poster_url ? "" : " empty"}`}>
        {movie.poster_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={movie.poster_url} alt={movie.canonical_title} loading="lazy" />
        ) : (
          "No Image"
        )}
      </div>
      <div>
        <b style={{ display: "block", fontSize: 15 }}>{movie.canonical_title}</b>
        <div className="sub">
          {movie.release_date?.slice(0, 4) ?? "미정"}
          {movie.external_rating != null && (
            <>
              {" "}
              · <span className="stars">★ {movie.external_rating.toFixed(1)}</span>
            </>
          )}
          {movie.content_genre.length > 0 && (
            <>
              {" "}
              ·{" "}
              {movie.content_genre
                .map((cg) => cg.genre?.name)
                .filter(Boolean)
                .join(", ")}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
