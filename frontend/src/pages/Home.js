import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import Spinner from '../components/Spinner';
import './Home.css';

/* ── Color palette for timetable preview cells ─────────────────────── */
const CELL_COLORS = ['c-green', 'c-purple', 'c-orange', 'c-blue', 'c-teal'];
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PREVIEW_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

/* ── Feature card sub-component ────────────────────────────────────── */
function FeatureCard({ icon, title, desc, btnText, to }) {
  return (
    <div className="feature-card">
      <div className="fc-icon-box">{icon}</div>
      <div className="fc-body">
        <h3>{title}</h3>
        <p>{desc}</p>
        <Link to={to} className="fc-btn">{btnText} →</Link>
      </div>
    </div>
  );
}

/* ── Upcoming schedule table (first 5 rows from /schedule) ─────────── */
function UpcomingSchedule({ schedule, loading }) {
  if (loading) return <Spinner />;
  if (!schedule.length) {
    return <p className="home-empty">No allocations yet. <Link to="/allocation">Create one →</Link></p>;
  }
  return (
    <>
      <table className="upcoming-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Course</th>
            <th>Faculty</th>
            <th>Room</th>
          </tr>
        </thead>
        <tbody>
          {schedule.slice(0, 5).map((a) => (
            <tr key={a.allocation_id}>
              <td>
                <span className="row-dot" />
                {a.day.slice(0, 3)} {a.start_time.slice(0, 5)}
              </td>
              <td>{a.course_name}</td>
              <td>{a.faculty_name}</td>
              <td>{a.room_number}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link to="/timetable" className="view-full-link">View Full Schedule →</Link>
    </>
  );
}

/* ── Mini timetable preview grid ───────────────────────────────────── */
function TimetablePreview({ schedule, loading }) {
  const [previewMode, setPreviewMode] = useState('grid');

  // Build color map per unique course name
  const uniqueCourses = [...new Set(schedule.map((a) => a.course_name))];
  const colorMap = {};
  uniqueCourses.forEach((c, i) => { colorMap[c] = CELL_COLORS[i % CELL_COLORS.length]; });

  // Unique rooms and timeslots from data
  const rooms = [...new Set(schedule.map((a) => a.room_number))].sort();
  const timeslots = [
    ...new Map(
      schedule.map((a) => [
        `${a.day}|${a.start_time}`,
        { key: `${a.day}|${a.start_time}`, day: a.day, time: a.start_time.slice(0, 5) },
      ])
    ).values(),
  ]
    .filter((ts) => PREVIEW_DAYS.includes(ts.day))
    .sort((a, b) => {
      const di = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
      return di !== 0 ? di : a.time.localeCompare(b.time);
    })
    .slice(0, 5); // cap at 5 columns for mini preview

  const cellMap = {};
  for (const a of schedule) {
    cellMap[`${a.room_number}||${a.day}|${a.start_time}`] = a.course_name;
  }

  const colCount = timeslots.length || 5;

  if (loading) return <Spinner />;

  return (
    <div className="timetable-preview-card">
      <div className="timetable-preview-header">
        <span className="home-section-title">📊 Timetable Preview</span>
        <div className="view-toggle">
          <button
            className={'toggle-btn' + (previewMode === 'table' ? ' active' : '')}
            onClick={() => setPreviewMode('table')}
          >Table View</button>
          <button
            className={'toggle-btn' + (previewMode === 'grid' ? ' active' : '')}
            onClick={() => setPreviewMode('grid')}
          >Grid View</button>
        </div>
      </div>

      {schedule.length === 0 ? (
        <p className="home-empty">No allocations to preview.</p>
      ) : previewMode === 'grid' ? (
        <div
          className="mini-grid"
          style={{ gridTemplateColumns: `80px repeat(${colCount}, 1fr)` }}
        >
          {/* Corner */}
          <div className="mini-grid-header">Room</div>
          {/* Day headers */}
          {timeslots.map((ts) => (
            <div key={ts.key} className="mini-grid-header">
              <div>{ts.day.slice(0, 3)}</div>
              <div style={{ fontSize: '10px', color: 'var(--primary-mid)', fontWeight: 600 }}>{ts.time}</div>
            </div>
          ))}
          {/* Rows */}
          {rooms.slice(0, 4).map((room) => (
            <>
              <div key={`r-${room}`} className="mini-grid-room">{room}</div>
              {timeslots.map((ts) => {
                const course = cellMap[`${room}||${ts.key}`];
                const colorCls = course ? colorMap[course] : 'empty';
                return (
                  <div
                    key={`${room}|${ts.key}`}
                    className={`mini-cell ${colorCls}`}
                    title={course || 'Free'}
                  >
                    {course
                      ? course.split(' ').slice(0, 2).join(' ')
                      : '—'}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      ) : (
        /* Table preview mode */
        <table className="upcoming-table">
          <thead>
            <tr><th>Room</th><th>Course</th><th>Day</th><th>Time</th></tr>
          </thead>
          <tbody>
            {schedule.slice(0, 6).map((a) => (
              <tr key={a.allocation_id}>
                <td>{a.room_number}</td>
                <td>
                  <span
                    className={`preview-badge ${colorMap[a.course_name] || 'c-green'}`}
                  >
                    {a.course_name}
                  </span>
                </td>
                <td>{a.day.slice(0, 3)}</td>
                <td>{a.start_time.slice(0, 5)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button className="download-btn" onClick={() => window.print()}>
        ⬇ Download Timetable (PDF)
      </button>
    </div>
  );
}

/* ── Main Home component ────────────────────────────────────────────── */
export default function Home() {
  // ── Existing stats fetch (DO NOT TOUCH) ──
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setStats(data))
      .catch(() => setStats({ totalRooms: 0, totalCourses: 0, totalAllocations: 0 }))
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Schedule fetch for UpcomingSchedule + TimetablePreview ──
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  useEffect(() => {
    fetch('/schedule')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setSchedule(data))
      .catch(() => setSchedule([]))
      .finally(() => setScheduleLoading(false));
  }, []);

  return (
    <div>
      {/* 1 — Welcome */}
      <div className="welcome-header">
        <h1>Welcome back, Admin! 👋</h1>
        <p>Here's what's happening with your classroom schedule today.</p>
      </div>

      {/* 2 — Stats row */}
      <div className="stats-row">
        {statsLoading ? (
          <Spinner />
        ) : (
          <>
            <StatCard
              label="Total Classrooms"
              value={stats?.totalRooms}
              subtitle="Rooms available"
              colorClass="green"
              icon="🏫"
            />
            <StatCard
              label="Total Courses"
              value={stats?.totalCourses}
              subtitle="Courses offered"
              colorClass="purple"
              icon="📚"
            />
            <StatCard
              label="Total Faculty"
              value={stats?.totalFaculty ?? 0}
              subtitle="Faculty members"
              colorClass="blue"
              icon="👤"
            />
            <StatCard
              label="Total Allocations"
              value={stats?.totalAllocations}
              subtitle="This week"
              colorClass="orange"
              icon="📋"
            />
            <StatCard
              label="Conflicts Prevented"
              value={stats?.totalConflicts ?? 0}
              subtitle="Total conflicts"
              colorClass="teal"
              icon="🛡"
            />
          </>
        )}
      </div>

      {/* 3 — Feature cards */}
      <div className="feature-grid">
        <FeatureCard
          icon="🤖"
          title="Auto Scheduler"
          desc="Get the best room suggestion based on course, timeslot and capacity."
          btnText="Open Scheduler"
          to="/auto-scheduler"
        />
        <FeatureCard
          icon="📋"
          title="Make Allocation"
          desc="Manually allocate a classroom by selecting course, faculty and timeslot."
          btnText="Go to Allocation"
          to="/allocation"
        />
        <FeatureCard
          icon="📅"
          title="Timetable View"
          desc="View the weekly timetable in grid format and download your schedule."
          btnText="View Timetable"
          to="/timetable"
        />
        <FeatureCard
          icon="🚪"
          title="Room Availability"
          desc="Check which rooms are available for a specific timeslot."
          btnText="Check Availability"
          to="/timetable"
        />
      </div>

      {/* 4 — Bottom two-column */}
      <div className="home-bottom-grid">
        <div className="home-section-card">
          <div className="home-section-title">📅 Upcoming Schedule (Today)</div>
          <UpcomingSchedule schedule={schedule} loading={scheduleLoading} />
        </div>
        <div className="home-section-card">
          <TimetablePreview schedule={schedule} loading={scheduleLoading} />
        </div>
      </div>

      {/* 5 — Smart Tip */}
      <div className="smart-tip">
        <span className="tip-icon">💡</span>
        <div>
          <strong>Smart Tip</strong>
          <p>Use Auto Scheduler to get the best classroom suggestion and avoid conflicts automatically.</p>
        </div>
      </div>
    </div>
  );
}
