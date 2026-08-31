export default function CategoryBar({
  label,
  homeLabel,
  tabs,
}: {
  label: string;
  homeLabel: string;
  tabs: string[];
}) {
  return (
    <div className="moviebar">
      <div className="wrap moviebar-row">
        <b>{label}</b>
        <span className="on">{homeLabel}</span>
        {tabs.map((tab) => (
          <span key={tab}>{tab}</span>
        ))}
      </div>
    </div>
  );
}
