import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import WriteBox from "@/components/reviews/write-box";
import TagCloud from "@/components/reviews/tag-cloud";
import ReviewList from "@/components/reviews/review-list";
import TasteMatch from "@/components/reviews/taste-match";
import AuthStatus from "@/components/auth-status";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchMovieDetail } from "@/lib/movies/queries";
import {
  fetchRatingSummary,
  fetchReviews,
  fetchContentTags,
  fetchContentTagVotePercentages,
  type TagVotePercentage,
} from "@/lib/reviews/queries";

export const revalidate = 60;

export default async function MovieReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getSupabaseClient();
  if (!supabase) notFound();

  const movie = await fetchMovieDetail(supabase, id);
  if (!movie) notFound();

  const [summary, reviews, moodTags, tagVotes] = await Promise.all([
    fetchRatingSummary(supabase, id),
    fetchReviews(supabase, id, "helpful"),
    fetchContentTags(supabase, "MOOD"),
    fetchContentTagVotePercentages(supabase, id),
  ]);

  const tagCloudInitial: TagVotePercentage[] = moodTags.map((tag) => {
    const voted = tagVotes.find((v) => v.tag_id === tag.id);
    return {
      tag_id: tag.id,
      name: tag.name,
      category: tag.category,
      kind: tag.kind,
      votes: voted?.votes ?? 0,
      percentage: voted?.percentage ?? 0,
    };
  });

  const roundedAverage = Math.round(summary.average);

  return (
    <>
      <SiteHeader active="content" actions={<AuthStatus />} />

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">{movie.canonical_title}</span>
            <h1>평점과 리뷰</h1>
            <p>별점 분포, 취향별 평가와 스포일러 리뷰를 확인하세요.</p>
          </div>
          <a href="#write-box" className="btn orange">
            내 리뷰 작성
          </a>
        </div>

        <nav className="detail-tabs">
          <Link href={`/movies/${id}`}>주요 정보</Link>
          <span className="on">평점·리뷰</span>
          <Link href={`/movies/${id}#videos`}>영상·OST</Link>
          <Link href={`/movies/${id}#related`}>관련 작품</Link>
          <Link href={`/movies/${id}/gallery`}>갤러리</Link>
        </nav>

        <div className="section" style={{ borderTop: 0 }}>
          <div className="review-summary">
            <div className="card rating-card">
              <span className="eyebrow">평균 평점</span>
              <div className="bignum" style={{ fontSize: 47, fontWeight: 900 }}>
                {summary.average.toFixed(1)}
              </div>
              <div className="stars" style={{ fontSize: 21 }}>
                {"★".repeat(roundedAverage)}
                {"☆".repeat(5 - roundedAverage)}
              </div>
              <div className="sub">{summary.count.toLocaleString()}명 참여</div>
              <div className="bars" style={{ textAlign: "left" }}>
                {summary.distribution.map((d) => (
                  <div key={d.star} className="bar">
                    <span>{d.star}</span>
                    <i style={{ ["--w" as string]: `${d.pct}%` }} />
                    <small>{d.pct}%</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="card review-stats">
              <h2>리뷰에서 자주 언급된 요소</h2>
              <div className="sub">리뷰와 선택형 태그를 함께 분석했어요.</div>
              <TagCloud contentId={id} initialTags={tagCloudInitial} />
              <TasteMatch contentTags={tagVotes} />
            </div>
          </div>

          <WriteBox contentId={id} />

          <ReviewList contentId={id} initialReviews={reviews} />
        </div>
      </div>

      <SiteFooter
        title="작품에서 시작하는 대화"
        subtitle="평점, 갤러리, 관계작을 한 화면에서 확인하세요."
      />
    </>
  );
}
