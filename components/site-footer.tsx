export default function SiteFooter({
  title,
  subtitle,
}: {
  title: React.ReactNode;
  subtitle: string;
}) {
  return (
    <footer className="footer">
      <div className="wrap footer-row">
        <b>{title}</b>
        <span>{subtitle}</span>
      </div>
    </footer>
  );
}
