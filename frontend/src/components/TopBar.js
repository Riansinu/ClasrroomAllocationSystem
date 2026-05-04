import './TopBar.css';

export default function TopBar() {
  return (
    <header className="topbar">
      <button className="topbar-menu" aria-label="Toggle menu">☰</button>
      <div className="topbar-right">
        <div className="topbar-bell" aria-label="Notifications">
          🔔
          <span className="bell-badge">3</span>
        </div>
        <div className="topbar-admin">
          <div className="admin-avatar">A</div>
          <div className="admin-info">
            <span className="admin-name">Admin</span>
            <span className="admin-role">Administrator</span>
          </div>
          <span className="admin-arrow">▾</span>
        </div>
      </div>
    </header>
  );
}
