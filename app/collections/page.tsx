import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AuthStatus from "@/components/auth-status";
import CollectionsList from "@/components/collections/collections-list";

export default function CollectionsPage() {
  return (
    <>
      <SiteHeader active="taste" actions={<AuthStatus />} />

      <div className="wrap">
        <div className="page-title">
          <div>
            <span className="eyebrow">MY COLLECTIONS</span>
            <h1>내 컬렉션</h1>
            <p>직접 모은 작품 목록이에요. 공개로 만들면 다른 사람도 링크로 볼 수 있어요.</p>
          </div>
        </div>

        <CollectionsList />
      </div>

      <SiteFooter title="취향대로 모아보는 나만의 목록" subtitle="컬렉션은 공개·비공개로 관리할 수 있어요." />
    </>
  );
}
