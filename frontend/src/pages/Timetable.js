import { useState, useEffect } from 'react';
import Spinner from '../components/Spinner';
import './Timetable.css';

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COURSE_COLORS = ['c-green', 'c-purple', 'c-orange', 'c-blue', 'c-teal'];

export default function Timetable() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [filter, setFilter] = useState('');

  // GET /schedule — existing route, NO /api/ prefix
  useEffect(() => {
    fetch('/schedule')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load schedule'))))
      .then((data) => setAllocations(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Build unique sorted timeslot labels + room labels from data
  const timeslotLabels = [
    ...new Map(
      allocations.map((a) => [
        `${a.day}|${a.start_time}`,
        { key: `${a.day}|${a.start_time}`, day: a.day, label: `${a.day} ${a.start_time.slice(0, 5)}` },
      ])
    ).values(),
  ].sort((a, b) => {
    const di = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
    if (di !== 0) return di;
    return a.label.localeCompare(b.label);
  });

  const allRooms = [...new Set(allocations.map((a) => a.room_number))].sort();

  const filteredRooms = filter.trim()
    ? allRooms.filter((r) => r.toLowerCase().includes(filter.toLowerCase()))
    : allRooms;

  // Lookup: roomNumber + timeslotKey → course_name
  const cellMap = {};
  for (const a of allocations) {
    const key = `${a.room_number}||${a.day}|${a.start_time}`;
    cellMap[key] = a.course_name;
  }

  // Color map per unique course name
  const uniqueCourses = [...new Set(allocations.map((a) => a.course_name))];
  const colorMap = {};
  uniqueCourses.forEach((c, i) => {
    colorMap[c] = COURSE_COLORS[i % COURSE_COLORS.length];
  });

  const colCount = timeslotLabels.length;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📅 Weekly Timetable</h1>
        <p className="page-subtitle">
          Visual overview of all classroom allocations. Filter by room or switch to table view.
        </p>
      </div>

      {/* Controls */}
      <div className="tt-controls">
        <div className="tt-toggle">
          <button
            className={viewMode === 'grid' ? 'btn-primary tt-tab' : 'btn-outline tt-tab'}
            onClick={() => setViewMode('grid')}
          >
            ⊞ Grid View
          </button>
          <button
            className={viewMode === 'table' ? 'btn-primary tt-tab' : 'btn-outline tt-tab'}
            onClick={() => setViewMode('table')}
          >
            ☰ Table View
          </button>
        </div>
        <input
          className="tt-filter"
          type="text"
          placeholder="Filter by room name…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button className="btn-outline no-print" onClick={() => window.print()}>
          🖨 Print / Save
        </button>
      </div>

      {loading && <Spinner />}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        <div className="timetable-printable">
          {/* Print-only header */}
          <div className="print-header">
            <h2>Classroom Allocation — Weekly Timetable</h2>
            <p>Printed: {new Date().toLocaleDateString()}</p>
          </div>

          {allocations.length === 0 ? (
            <div className="card tt-empty">
              No allocations found. Go to the{' '}
              <a href="/allocation">Allocation page</a> to create some.
            </div>
          ) : viewMode === 'grid' ? (
            /* ── GRID VIEW ── */
            <div className="timetable-grid" style={{ '--col-count': colCount }}>
              {/* Top-left corner */}
              <div className="grid-header tt-corner">Room</div>

              {/* Column headers */}
              {timeslotLabels.map((ts) => (
                <div key={ts.key} className="grid-header">
                  <div>{ts.day}</div>
                  <div className="tt-time">{ts.label.split(' ')[1]}</div>
                </div>
              ))}

              {/* Rows */}
              {filteredRooms.length === 0 ? (
                <div
                  className="grid-cell"
                  style={{
                    gridColumn: `1 / span ${colCount + 1}`,
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  No rooms match "{filter}"
                </div>
              ) : (
                filteredRooms.map((room) => (
                  <>
                    <div key={`label-${room}`} className="grid-room-label">
                      {room}
                    </div>
                    {timeslotLabels.map((ts) => {
                      const course = cellMap[`${room}||${ts.key}`];
                      const colorCls = course ? colorMap[course] : '';
                      return (
                        <div
                          key={`${room}|${ts.key}`}
                          className={`grid-cell${course ? ` allocated ${colorCls}` : ''}`}
                          title={course || 'Free'}
                        >
                          {course || '—'}
                        </div>
                      );
                    })}
                  </>
                ))
              )}
            </div>
          ) : (
            /* ── TABLE VIEW ── */
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Course</th>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations
                      .filter(
                        (a) =>
                          !filter ||
                          a.room_number.toLowerCase().includes(filter.toLowerCase())
                      )
                      .map((a) => (
                        <tr key={a.allocation_id}>
                          <td>{a.room_number}</td>
                          <td>
                            <span className={`tt-badge ${colorMap[a.course_name] || 'c-green'}`}>
                              {a.course_name}
                            </span>
                          </td>
                          <td>{a.day}</td>
                          <td>
                            {a.start_time.slice(0, 5)} – {a.end_time.slice(0, 5)}
                          </td>
                          <td>{a.faculty_name}</td>
                        </tr>
                      ))}
                    {allocations.filter(
                      (a) =>
                        !filter ||
                        a.room_number.toLowerCase().includes(filter.toLowerCase())
                    ).length === 0 && (
                      <tr>
                        <td colSpan="5" className="empty-state">
                          No allocations match "{filter}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
