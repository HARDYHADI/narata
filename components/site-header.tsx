import Link from "next/link";

type NavKey = "home" | "content" | "community" | "ai" | "taste";

const NAV_ITEMS: { key: NavKey; label: string; href: string }[] = [
  { key: "home", label: "홈", href: "/" },
  { key: "content", label: "콘텐츠", href: "/movies" },
  { key: "community", label: "커뮤니티", href: "/community" },
  { key: "ai", label: "AI 찾기", href: "/ai" },
  { key: "taste", label: "내 취향", href: "/taste" },
];

export default function SiteHeader({
  active,
  searchPlaceholder,
  actions,
}: {
  active: NavKey;
  searchPlaceholder?: string;
  actions: React.ReactNode;
}) {
  return (
    <header className="header">
      <div className="wrap hrow">
        <Link href="/" className="logo">
          <b>N</b>ㅏ라타
        </Link>
        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={item.key === active ? "on" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="grow" />
        {searchPlaceholder && (
          <div className="search">
            {searchPlaceholder}
            <i />
          </div>
        )}
        {actions}
      </div>
    </header>
  );
}
