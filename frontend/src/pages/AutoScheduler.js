import { useState, useEffect } from 'react';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import './AutoScheduler.css';

export default function AutoScheduler() {
  const [courses, setCourses] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  // Fetch courses and timeslots on mount.
  // NOTE: /courses and /timeslots use NO /api/ prefix — these are existing backend routes.
  useEffect(() => {
    async function loadOptions() {
      try {
        const [cRes, tRes] = await Promise.all([fetch('/courses'), fetch('/timeslots')]);
        if (cRes.ok) setCourses(await cRes.json());
        if (tRes.ok) setTimeslots(await tRes.json());
      } catch {
        // silent fail — dropdowns will be empty
      } finally {
        setOptionsLoading(false);
      }
    }
    loadOptions();
  }, []);

  async function handleFind(e) {
    e.preventDefault();
    if (!selectedCourse || !selectedSlot) {
      setAlert({ type: 'error', message: 'Please select both a course and a timeslot.' });
      return;
    }
    setLoading(true);
    setResult(null);
    setAlert(null);
    try {
      // NEW route — uses /api/ prefix. Query param is slotId.
      const res = await fetch(
        `/api/suggest-room?courseId=${selectedCourse}&slotId=${selectedSlot}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setResult(data);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Could not fetch suggestions.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoAllocate(roomId) {
    if (!selectedCourse || !selectedSlot || !roomId) return;
    setAllocating(true);
    setAlert(null);
    try {
      // POST /allocate — existing route, NO /api/ prefix. faculty_id is required by backend.
      // We pick the first available faculty: fetch faculty list and pick id=1 as default.
      // A real app would let the user pick faculty — for auto-allocate we use a placeholder of 1.
      // The backend will return 400 if faculty_id is invalid.
      const res = await fetch('/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: Number(roomId),
          course_id: Number(selectedCourse),
          faculty_id: 1,
          slot_id: Number(selectedSlot),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || 'Allocation failed');
      setAlert({
        type: 'success',
        message: `Auto-allocated ${data.allocation.course_name} → Room ${data.allocation.room_number} on ${data.allocation.day}.`,
      });
      setResult(null);
    } catch (err) {
      setAlert({ type: 'error', message: err.message });
    } finally {
      setAllocating(false);
    }
  }

  const selectedSlotLabel = timeslots.find((s) => String(s.slot_id) === String(selectedSlot));

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🤖 Auto Scheduler</h1>
        <p className="page-subtitle">
          Select a course and timeslot — the system will recommend the best available classroom based
          on enrollment count and room capacity.
        </p>
      </div>

      <Alert
        type={alert?.type}
        message={alert?.message}
        onDismiss={() => setAlert(null)}
      />

      {/* Search Form */}
      <div className="card as-form-card">
        <h2 className="section-title">Find Best Room</h2>
        {optionsLoading ? (
          <Spinner />
        ) : (
          <form className="as-form" onSubmit={handleFind}>
            <div className="form-group">
              <label htmlFor="as-course">Course</label>
              <select
                id="as-course"
                value={selectedCourse}
                onChange={(e) => { setSelectedCourse(e.target.value); setResult(null); }}
              >
                <option value="">Select a course…</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.course_code} — {c.course_name} ({c.enrollment_count} students)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="as-slot">Timeslot</label>
              <select
                id="as-slot"
                value={selectedSlot}
                onChange={(e) => { setSelectedSlot(e.target.value); setResult(null); }}
              >
                <option value="">Select a timeslot…</option>
                {timeslots.map((s) => (
                  <option key={s.slot_id} value={s.slot_id}>
                    {s.day} | {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Searching…' : '🔍 Find Best Room'}
            </button>
          </form>
        )}
      </div>

      {/* Loading */}
      {loading && <Spinner />}

      {/* No result */}
      {!loading && result && result.best === null && (
        <div className="card as-no-result">
          <span className="as-no-icon">😔</span>
          <p>{result.message || 'No suitable rooms found for the selected timeslot.'}</p>
        </div>
      )}

      {/* Result card */}
      {!loading && result && result.best && (
        <div className="as-result-section">
          <h2 className="section-title">Suggestion Results</h2>

          {/* Best room */}
          <div className="card as-best-card">
            <div className="as-best-header">
              <span className="as-trophy">🏆</span>
              <div>
                <div className="as-best-label">Suggested Room</div>
                <div className="as-best-room">{result.best.roomName}</div>
                <div className="as-best-sub">
                  {result.best.building} · {result.best.roomType}
                </div>
              </div>
            </div>

            <div className="as-metrics">
              <div className="as-metric">
                <div className="as-metric-val">{result.best.capacity}</div>
                <div className="as-metric-lbl">Capacity</div>
              </div>
              <div className="as-metric">
                <div className="as-metric-val">{result.courseSize}</div>
                <div className="as-metric-lbl">Enrollment</div>
              </div>
              <div className="as-metric">
                <div className="as-metric-val as-free">Free</div>
                <div className="as-metric-lbl">
                  {selectedSlotLabel
                    ? `${selectedSlotLabel.day} ${selectedSlotLabel.start_time.slice(0, 5)}`
                    : 'This slot'}
                </div>
              </div>
            </div>

            <div className="as-score-row">
              <span>Recommendation Score: <strong>{result.best.score}%</strong></span>
              <div className="as-score-bar">
                <div
                  className="as-score-fill"
                  style={{ width: `${result.best.score}%` }}
                />
              </div>
            </div>

            <button
              className="btn-primary as-allocate-btn"
              onClick={() => handleAutoAllocate(result.best.roomId)}
              disabled={allocating}
            >
              {allocating ? 'Allocating…' : '⚡ Auto Allocate this Room'}
            </button>
          </div>

          {/* Alternatives */}
          {result.alternatives && result.alternatives.length > 0 && (
            <div className="as-alternatives">
              <span className="as-alt-label">Also available: </span>
              {result.alternatives.map((alt, i) => (
                <span key={alt.roomId} className="as-alt-chip">
                  {alt.roomName} ({alt.score}%)
                  {i < result.alternatives.length - 1 ? '' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
