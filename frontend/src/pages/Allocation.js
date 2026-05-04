import axios from 'axios';
import { useEffect, useState } from 'react';
import Spinner from '../components/Spinner';
import Alert from '../components/Alert';

const initialFormState = {
  room_id: '',
  course_id: '',
  faculty_id: '',
  slot_id: '',
};

function Allocation() {
  const [classrooms, setClassrooms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [feedback, setFeedback] = useState(null);

  async function loadSchedule() {
    try {
      setScheduleError('');
      const response = await axios.get('/schedule');
      setSchedule(response.data);
    } catch (error) {
      setScheduleError(error.response?.data?.details || error.message || 'Unable to load schedule');
    }
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setLoadError('');

        // ⚠️ These routes use NO /api/ prefix — they are the existing backend routes
        const [classroomResponse, courseResponse, facultyResponse, timeslotResponse] =
          await Promise.all([
            fetch('/classrooms'),
            fetch('/courses'),
            fetch('/faculty'),
            fetch('/timeslots'),
          ]);

        const failedResponse = [
          classroomResponse,
          courseResponse,
          facultyResponse,
          timeslotResponse,
        ].find((response) => !response.ok);

        if (failedResponse) {
          throw new Error('Failed to load allocation data');
        }

        const [classroomData, courseData, facultyData, timeslotData] = await Promise.all([
          classroomResponse.json(),
          courseResponse.json(),
          facultyResponse.json(),
          timeslotResponse.json(),
        ]);

        setClassrooms(classroomData);
        setCourses(courseData);
        setFaculty(facultyData);
        setTimeslots(timeslotData);
      } catch (error) {
        setLoadError(error.message || 'Unable to load form options');
      } finally {
        setLoading(false);
      }

      await loadSchedule();
    }

    loadData();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
    setFeedback(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback(null);

    if (Object.values(formData).some((value) => value === '')) {
      setFeedback({
        type: 'error',
        message: 'Please choose a classroom, course, faculty member, and timeslot.',
      });
      return;
    }

    try {
      setSubmitting(true);

      // ⚠️ POST /allocate — no /api/ prefix
      const response = await fetch('/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: Number(formData.room_id),
          course_id: Number(formData.course_id),
          faculty_id: Number(formData.faculty_id),
          slot_id: Number(formData.slot_id),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Allocation failed');
      }

      setFeedback({
        type: 'success',
        message: `Allocation created successfully for ${result.allocation.course_name} in room ${result.allocation.room_number}.`,
      });
      setFormData(initialFormState);
      await loadSchedule();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to create allocation',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClearAllocations() {
    const confirmed = window.confirm('Are you sure you want to clear all allocations?');
    if (!confirmed) return;

    try {
      setClearing(true);
      setFeedback(null);

      // ⚠️ DELETE /schedule — no /api/ prefix
      const response = await axios.delete('/schedule');
      setFeedback({
        type: 'success',
        message: response.data.message || 'All allocations cleared',
      });
      await loadSchedule();
    } catch (error) {
      setFeedback({
        type: 'error',
        message:
          error.response?.data?.details ||
          error.response?.data?.error ||
          'Unable to clear allocations',
      });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📋 Allocate a Classroom</h1>
        <p className="page-subtitle">
          Select the classroom, course, faculty member, and timeslot to create a new allocation.
        </p>
      </div>
      <div className="page-card allocation-card">
        <div className="card-heading"></div>

        {loadError ? <div className="alert alert-error">{loadError}</div> : null}

        <Alert
          type={feedback?.type}
          message={feedback?.message}
          onDismiss={() => setFeedback(null)}
        />

        {loading ? (
          <Spinner />
        ) : (
          <>
            <form className="allocation-form" onSubmit={handleSubmit}>
              <label className="field">
                <span>Classroom</span>
                <select name="room_id" value={formData.room_id} onChange={handleChange}>
                  <option value="">Select a classroom</option>
                  {classrooms.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      {room.room_number} | {room.building} | {room.room_type} | Capacity{' '}
                      {room.capacity}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Course</span>
                <select name="course_id" value={formData.course_id} onChange={handleChange}>
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_code} | {course.course_name} | {course.enrollment_count}{' '}
                      students
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Faculty</span>
                <select name="faculty_id" value={formData.faculty_id} onChange={handleChange}>
                  <option value="">Select faculty</option>
                  {faculty.map((member) => (
                    <option key={member.faculty_id} value={member.faculty_id}>
                      {member.name} | {member.department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Timeslot</span>
                <select name="slot_id" value={formData.slot_id} onChange={handleChange}>
                  <option value="">Select a timeslot</option>
                  {timeslots.map((slot) => (
                    <option key={slot.slot_id} value={slot.slot_id}>
                      {slot.day} | {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                    </option>
                  ))}
                </select>
              </label>

              <button className="submit-button" type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Create Allocation'}
              </button>
            </form>

            <section className="schedule-section">
              <div className="schedule-header">
                <h2>Current Schedule</h2>
                <p>Live allocation view grouped by room, course, faculty, and timeslot.</p>
              </div>

              {scheduleError ? (
                <div className="alert alert-error">{scheduleError}</div>
              ) : null}

              <div className="schedule-table-wrap">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Course</th>
                      <th>Faculty</th>
                      <th>Day</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.length > 0 ? (
                      schedule.map((item) => (
                        <tr key={item.allocation_id}>
                          <td>{item.room_number}</td>
                          <td>{item.course_name}</td>
                          <td>{item.faculty_name}</td>
                          <td>{item.day}</td>
                          <td>
                            {item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="empty-state">
                          No allocations yet. Use the form above to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                className="secondary-danger-button"
                type="button"
                onClick={handleClearAllocations}
                disabled={clearing}
              >
                {clearing ? 'Clearing…' : 'Clear All Allocations'}
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default Allocation;
