import './StatCard.css';

export default function StatCard({ label, value, subtitle, colorClass, icon }) {
  return (
    <div className="stat-card">
      <div className={`stat-circle ${colorClass}`}>{icon}</div>
      <div className="stat-info">
        <span className="stat-value">{value ?? '—'}</span>
        <span className="stat-label">{label}</span>
        {subtitle && <span className="stat-sub">{subtitle}</span>}
      </div>
    </div>
  );
}
