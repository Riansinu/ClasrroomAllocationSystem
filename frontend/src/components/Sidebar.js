import { NavLink } from 'react-router-dom';
import './Sidebar.css';

const navItems = [
  { to: '/',               label: 'Dashboard',     icon: '⊞', end: true },
  { to: '/allocation',     label: 'Allocation',     icon: '📋' },
  { to: '/auto-scheduler', label: 'Auto Scheduler', icon: '🤖' },
  { to: '/timetable',      label: 'Timetable',      icon: '📅' },
  { to: '/about',          label: 'About Project',  icon: 'ℹ️' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">🎓</div>
        <div className="brand-text">
          <span className="brand-name">Classroom Allocation System</span>
          <span className="brand-sub">Smart Scheduler &amp; Conflict Detection</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-logout">
          <span className="sidebar-icon">⇤</span>
          Logout
        </button>
      </div>
    </aside>
  );
}
