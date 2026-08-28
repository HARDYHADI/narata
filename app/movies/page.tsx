import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import MovieBar from "@/components/movie-bar";
import MovieInfiniteGrid from "@/components/movie-infinite-grid";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  fetchFilteredMoviePage,
  fetchGenres,
  type MovieFilterParams,
  type MovieSortOption,
} from "@/lib/movies/queries";
import { COUNTRY_LABELS } from "@/lib/movies/format";

export const revalidate = 60;

const STATUS_OPTIONS = [
  { value: "COMPLETED", label: "공개됨" },
  { value: "UPCOMING", label: "공개 예정" },
];

const COUNTRY_OPTIONS = ["KR", "US", "JP", "GB", "FR", "CN", "DE"];

const YEAR_OPTIONS = [
  { value: "", label: "전체" },
  { value: "2020s", label: "2020년 이후" },
  { value: "2010s", label: "2010년대" },
  { value: "older", label: "2000년대 이전" },
];

const SORT_OPTIONS: { value: MovieSortOption; label: string }[] = [
  { value: "latest", label: "최신순" },
  { value: "rating", label: "평점순" },
  { value: "popularity", label: "인기순" },
];

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function yearBucketToRange(bucket: string): { yearFrom?: number; yearTo?: number } {
  if (bucket === "2020s") return { yearFrom: 2020 };
  if (bucket === "2010s") return { yearFrom: 2010, yearTo: 2019 };
  if (bucket === "older") return { yearTo: 2009 };
  return {};
}

type SearchParams = {
  genre?: string | string[];
  country?: string | string[];
  status?: string | string[];
  year?: string;
  runtime?: string;
  sort?: string;
};

function buildSortHref(params: SearchParams, sort: MovieSortOption): string {
  const qs = new URLSearchParams();
  toArray(params.genre).forEach((v) => qs.append("genre", v));
  toArray(params.country).forEach((v) => qs.append("country", v));
  toArray(params.status).forEach((v) => qs.append("status", v));
  if (params.year) qs.set("year", params.year);
  if (params.runtime) qs.set("runtime", params.runtime);
  qs.set("sort", sort);
  return `/movies?${qs.toString()}`;
}

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = getSupabaseClient();
  const genres = supabase ? await fetchGenres(supabase) : [];

  const selectedGenreIds = toArray(params.genre);
  const selectedCountries = toArray(params.country);
  const selectedStatuses = toArray(params.status);
  const selectedYear = params.year ?? "";
  const runtimeCapped = params.runtime === "120";
  const sort: MovieSortOption =
    params.sort === "rating" || params.sort === "popularity" ? params.sort : "latest";

  const filters: MovieFilterParams = {
    genreIds: selectedGenreIds,
    countries: selectedCountries,
    statuses: selectedStatuses,
    maxRuntime: runtimeCapped ? 120 : undefined,
    sort,
    ...yearBucketToRange(selectedYear),
  };

  const initialMovies = supabase ? await fetchFilteredMoviePage(supabase, 0, filters) : [];

  const activeFilterCount =
    selectedGenreIds.length +
    selectedCountries.length +
    selectedStatuses.length +
    (selectedYear ? 1 : 0) +
    (runtimeCapped ? 1 : 0);

  return (
    <>
      <SiteHeader
        active="content"
        searchPlaceholder="제목, 인물, 장면을 검색해보세요"
        actions={
          <>
            <Link href="/ai" className="btn orange">
              AI 찾기
            </Link>
            <button className="btn">로그인</button>
          </>
        }
      />
      <MovieBar active="browse" />

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">MOVIE EXPLORE</span>
            <h1>조건별 영화 탐색</h1>
            <p>장르, 국가, 공개 시기와 감상 조건을 조합해 찾아보세요.</p>
          </div>
          <div className="tabs">
            {SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={buildSortHref(params, opt.value)}
                className={`tab${sort === opt.value ? " on" : ""}`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="browse">
          <form action="/movies" method="get" className="card filter">
            <input type="hidden" name="sort" value={sort} />
            <h3>필터</h3>
            <div className="filterset">
              <b>상태</b>
              <div className="checks">
                {STATUS_OPTIONS.map((opt) => (
                  <label key={opt.value} className="check">
                    <input
                      type="checkbox"
                      name="status"
                      value={opt.value}
                      defaultChecked={selectedStatuses.includes(opt.value)}
                    />
                    <i />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="filterset">
              <b>장르</b>
              <div className="checks">
                {genres.map((genre) => (
                  <label key={genre.id} className="check">
                    <input
                      type="checkbox"
                      name="genre"
                      value={genre.id}
                      defaultChecked={selectedGenreIds.includes(genre.id)}
                    />
                    <i />
                    {genre.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="filterset">
              <b>국가</b>
              <div className="checks">
                {COUNTRY_OPTIONS.map((code) => (
                  <label key={code} className="check">
                    <input
                      type="checkbox"
                      name="country"
                      value={code}
                      defaultChecked={selectedCountries.includes(code)}
                    />
                    <i />
                    {COUNTRY_LABELS[code] ?? code}
                  </label>
                ))}
              </div>
            </div>
            <div className="filterset">
              <b>개봉 연도</b>
              <div className="checks">
                {YEAR_OPTIONS.map((opt) => (
                  <label key={opt.value || "all"} className="check">
                    <input
                      type="radio"
                      name="year"
                      value={opt.value}
                      defaultChecked={selectedYear === opt.value}
                    />
                    <i />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="filterset">
              <b>감상 조건</b>
              <div className="checks">
                <label className="check">
                  <input type="checkbox" name="runtime" value="120" defaultChecked={runtimeCapped} />
                  <i />
                  120분 이하
                </label>
              </div>
            </div>
            <button type="submit" className="btn orange" style={{ width: "100%" }}>
              필터 적용
            </button>
          </form>

          <div>
            <div className="result-top">
              <b>TMDB에서 수집한 영화</b>
              <span className="sub">선택한 필터 {activeFilterCount}개</span>
            </div>
            <MovieInfiniteGrid initialMovies={initialMovies} filters={filters} />
          </div>
        </div>
      </div>

      <SiteFooter
        title="모든 매체를 한곳에서"
        subtitle="영화, 드라마, 애니, 웹툰, 웹소설을 통합 검색하고 평가하세요."
      />
    </>
  );
}
