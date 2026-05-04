import './About.css';

export default function About() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">ℹ️ About the Project</h1>
        <p className="page-subtitle">
          Architecture, database design, conflict detection logic, and the tech stack behind this system.
        </p>
      </div>

      {/* Problem Statement */}
      <div className="card ab-section">
        <h2 className="section-title">Problem Statement</h2>
        <p className="ab-text">
          Academic institutions often manage classroom scheduling through manual processes — spreadsheets,
          paper forms, or ad-hoc coordination — leading to double-booked rooms, faculty clashes, and
          capacity mismatches that disrupt learning. This system replaces that process with a structured,
          database-backed solution that enforces scheduling rules at the data layer.
        </p>
        <p className="ab-text">
          When a new allocation is attempted, MySQL triggers automatically check for room-time clashes,
          faculty double-bookings, and capacity violations before the record is committed — ensuring the
          schedule is always consistent, even if multiple users submit allocations simultaneously.
        </p>
      </div>

      {/* Key Features */}
      <div className="card ab-section">
        <h2 className="section-title">Key Features</h2>
        <div className="ab-feature-grid">
          {[
            {
              icon: '🏫',
              title: 'Room Allocation',
              desc: 'Assign any Course + Classroom + Faculty + TimeSlot combination through a validated form. The backend rejects conflicts instantly.',
            },
            {
              icon: '🤖',
              title: 'Auto Scheduler',
              desc: 'Scores all available rooms by capacity fit (tighter fit = higher score) and recommends the best match for a given course and timeslot.',
            },
            {
              icon: '📅',
              title: 'Visual Timetable',
              desc: 'Renders the full weekly schedule as a CSS Grid. Filter by room, toggle to table view, or print to PDF with a single click.',
            },
            {
              icon: '⚡',
              title: 'Conflict Detection',
              desc: 'MySQL triggers prevent Room-Time Clashes, Faculty Clashes, and Capacity Issues at the database level — no allocation can bypass these checks.',
            },
          ].map((f) => (
            <div key={f.title} className="ab-feature-card">
              <div className="ab-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="card ab-section">
        <h2 className="section-title">Tech Stack</h2>
        <div className="ab-tech-grid">
          <div className="ab-tech-col">
            <h3>Frontend</h3>
            <ul>
              <li>React 19 (Create React App)</li>
              <li>react-router-dom v7 (v6 API)</li>
              <li>Axios + Fetch API</li>
              <li>Hand-written CSS (no frameworks)</li>
              <li>Inter font (Google Fonts)</li>
            </ul>
          </div>
          <div className="ab-tech-col">
            <h3>Backend</h3>
            <ul>
              <li>Node.js + Express 4</li>
              <li>CORS (localhost:3000)</li>
              <li>mysql2/promise (connection pool)</li>
              <li>Async error handler middleware</li>
            </ul>
          </div>
          <div className="ab-tech-col">
            <h3>Database</h3>
            <ul>
              <li>MySQL — ClassroomAllocationSystem</li>
              <li>Triggers for conflict prevention</li>
              <li>Transactions for safe clears</li>
              <li>Normalized to 3NF</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Database Design */}
      <div className="card ab-section">
        <h2 className="section-title">Database Design</h2>
        <div className="ab-table-list">
          {[
            { name: 'Classroom', pk: 'room_id', desc: 'Stores physical rooms — room number, capacity, building, and type (Lecture / Lab / Auditorium).' },
            { name: 'Faculty', pk: 'faculty_id', desc: 'Stores instructors — name, department, and unique email address.' },
            { name: 'Course', pk: 'course_id', desc: 'Stores academic courses — course name, unique code, credits, and enrollment_count (student headcount).' },
            { name: 'TimeSlot', pk: 'slot_id', desc: 'Stores discrete scheduling blocks — day of week, start_time, and end_time. Unique per (day, start, end).' },
            { name: 'Allocation', pk: 'allocation_id', desc: 'Core junction table linking Classroom + Course + Faculty + TimeSlot. UNIQUE(room_id, slot_id) and UNIQUE(faculty_id, slot_id) prevent double-booking at the schema level.' },
            { name: 'Conflict_Log', pk: 'conflict_id', desc: 'Audit trail of detected conflicts — records conflict_type, timestamp, and remarks for every rejected insertion (logged by the trigger before raising the error).' },
          ].map((t) => (
            <div key={t.name} className="ab-table-row">
              <div className="ab-table-name">
                <code>{t.name}</code>
                <span className="ab-pk">PK: {t.pk}</span>
              </div>
              <p>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Conflict Detection */}
      <div className="card ab-section">
        <h2 className="section-title">Conflict Detection</h2>
        <p className="ab-text">
          When a POST request hits <code>/allocate</code>, the backend executes an <code>INSERT INTO Allocation</code>.
          Before the row commits, a MySQL <code>BEFORE INSERT</code> trigger (<code>trg_check_allocation_conflict</code>)
          runs three checks:
        </p>
        <ol className="ab-steps">
          <li>
            <strong>Room-Time Clash:</strong> Does <code>Allocation</code> already contain a row with the
            same <code>room_id</code> and <code>slot_id</code>? If yes → <code>SIGNAL SQLSTATE '45000'</code>.
          </li>
          <li>
            <strong>Faculty Clash:</strong> Is the faculty already assigned to another course in the same
            <code> slot_id</code>? If yes → signal.
          </li>
          <li>
            <strong>Capacity Issue:</strong> Does <code>Classroom.capacity</code> fall below
            <code> Course.enrollment_count</code> for the given room and course? If yes → signal.
          </li>
        </ol>
        <p className="ab-text">
          The Express error handler catches MySQL error code <code>ER_DUP_ENTRY</code> (schema-level
          UNIQUE constraint) and <code>sqlState '45000'</code> (trigger signal) and returns a
          structured <code>409 Conflict</code> JSON response that the frontend displays directly.
        </p>
      </div>

      {/* Normalization */}
      <div className="card ab-section">
        <h2 className="section-title">Normalization</h2>
        <div className="ab-nf-grid">
          <div className="ab-nf-card">
            <div className="ab-nf-badge">1NF</div>
            <p>All columns hold atomic, single-valued data — no repeating groups or multi-valued fields exist in any table.</p>
          </div>
          <div className="ab-nf-card">
            <div className="ab-nf-badge">2NF</div>
            <p>Every non-key column in each table depends on the whole primary key — no partial dependencies exist because all primary keys are single-column surrogates.</p>
          </div>
          <div className="ab-nf-card">
            <div className="ab-nf-badge">3NF</div>
            <p>No transitive dependencies — course details live in <code>Course</code>, room details in <code>Classroom</code>, and <code>Allocation</code> holds only foreign keys, never denormalized copies.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
