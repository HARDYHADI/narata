import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import TasteDashboard from "@/components/taste/taste-dashboard";

export default function TastePage() {
  return (
    <>
      <SiteHeader
        active="taste"
        actions={
          <>
            <button className="btn ghost">설정</button>
            <button className="btn">프로필 공유</button>
          </>
        }
      />

      <TasteDashboard />

      <SiteFooter
        title="추천의 주도권은 사용자에게"
        subtitle="취향 신호를 확인하고, 제외하고, 언제든 초기화할 수 있습니다."
      />
    </>
  );
}
