import Link from "next/link";

export interface ContentNavItem {
  key: string;
  label: string;
  href: string;
}

export default function ContentNavBar({
  label,
  active,
  items,
}: {
  label: string;
  active: string;
  items: ContentNavItem[];
}) {
  return (
    <div className="moviebar">
      <div className="wrap moviebar-row">
        <b>{label}</b>
        {items.map((item) => (
          <Link key={item.key} href={item.href} className={item.key === active ? "on" : undefined}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
