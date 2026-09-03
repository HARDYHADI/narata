import Link from "next/link";
import SiteHeader from "@/components/site-header";
import AiSearch from "@/components/ai-search";
import AuthStatus from "@/components/auth-status";

export default function AiFindPage() {
  return (
    <>
      <SiteHeader
        active="ai"
        actions={
          <>
            <Link href="/taste#ai-logs" className="btn ghost">
              이전 질문
            </Link>
            <AuthStatus />
          </>
        }
      />

      <div className="ai-shell wrap">
        <div className="ai-intro">
          <span className="pill orange">NARATA AI · 작품 찾기</span>
          <h1>기억나는 장면부터 말해보세요</h1>
          <p>
            제목, 배우, 연도를 몰라도 괜찮아요. 줄거리·장르·분위기 같은 단서를 설명하면
            <br />
            저장된 작품 중 가장 가까운 후보를 찾아드립니다.
          </p>
        </div>

        <AiSearch />
      </div>
    </>
  );
}
