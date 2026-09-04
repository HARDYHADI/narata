import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AuthStatus from "@/components/auth-status";
import ShareButton from "@/components/share-button";
import CollectionDetail from "@/components/collections/collection-detail";

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <SiteHeader
        active="taste"
        actions={
          <>
            <Link href="/collections" className="btn ghost">
              내 컬렉션
            </Link>
            <ShareButton title="나라타 컬렉션" />
            <AuthStatus />
          </>
        }
      />

      <div className="wrap">
        <CollectionDetail collectionId={id} />
      </div>

      <SiteFooter title="취향대로 모아보는 나만의 목록" subtitle="컬렉션은 공개·비공개로 관리할 수 있어요." />
    </>
  );
}
