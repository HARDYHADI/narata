import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import TasteDashboard from "@/components/taste/taste-dashboard";
import ShareButton from "@/components/share-button";

export default function TastePage() {
  return (
    <>
      <SiteHeader
        active="taste"
        actions={
          <>
            <Link href="#preferences" className="btn ghost">
              설정
            </Link>
            <ShareButton title="나라타 - 내 취향" label="프로필 공유" className="btn" />
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
