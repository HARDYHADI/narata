import Link from "next/link";

type MovieBarKey = "home" | "browse" | "now" | "upcoming" | "ranking" | "collection";

const MOVIE_BAR_ITEMS: { key: MovieBarKey; label: string; href: string }[] = [
  { key: "home", label: "영화 홈", href: "/movies/home" },
  { key: "browse", label: "전체 영화", href: "/movies" },
  { key: "now", label: "상영 중", href: "/movies?status=COMPLETED" },
  { key: "upcoming", label: "공개 예정", href: "/movies?status=UPCOMING" },
  { key: "ranking", label: "평점 순위", href: "/movies?sort=rating" },
  { key: "collection", label: "컬렉션", href: "/movies?view=collection" },
];

export default function MovieBar({ active }: { active: MovieBarKey }) {
  return (
    <div className="moviebar">
      <div className="wrap moviebar-row">
        <b>영화</b>
        {MOVIE_BAR_ITEMS.map((item) => (
          <Link key={item.key} href={item.href} className={item.key === active ? "on" : undefined}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
