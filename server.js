const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function validateAllocationPayload(body) {
  const requiredFields = ["room_id", "course_id", "faculty_id", "slot_id"];
  const missingFields = requiredFields.filter((field) => body[field] === undefined);

  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(", ")}`;
  }

  for (const field of requiredFields) {
    if (!Number.isInteger(body[field]) || body[field] <= 0) {
      return `${field} must be a positive integer`;
    }
  }

  return null;
}

app.get(
  "/classrooms",
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT room_id, room_number, capacity, building, room_type FROM Classroom ORDER BY room_id"
    );
    res.json(rows);
  })
);

app.get(
  "/faculty",
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT faculty_id, name, department, email FROM Faculty ORDER BY faculty_id"
    );
    res.json(rows);
  })
);

app.get(
  "/courses",
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT course_id, course_name, course_code, credits, enrollment_count FROM Course ORDER BY course_id"
    );
    res.json(rows);
  })
);

app.get(
  "/timeslots",
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT slot_id, day, start_time, end_time FROM TimeSlot ORDER BY slot_id"
    );
    res.json(rows);
  })
);

app.get(
  "/schedule",
  asyncHandler(async (req, res) => {
    const [rows] = await pool.query(
      `SELECT
         a.allocation_id,
         c.room_number,
         cr.course_name,
         f.name AS faculty_name,
         t.day,
         t.start_time,
         t.end_time
       FROM Allocation a
       JOIN Classroom c ON c.room_id = a.room_id
       JOIN Course cr ON cr.course_id = a.course_id
       JOIN Faculty f ON f.faculty_id = a.faculty_id
       JOIN TimeSlot t ON t.slot_id = a.slot_id
       ORDER BY FIELD(
         t.day,
         'Monday',
         'Tuesday',
         'Wednesday',
         'Thursday',
         'Friday',
         'Saturday'
       ), t.start_time`
    );

    res.json(rows);
  })
);

app.delete(
  "/schedule",
  asyncHandler(async (req, res) => {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.query("DELETE FROM Allocation");
      await connection.query("ALTER TABLE Allocation AUTO_INCREMENT = 1");
      await connection.commit();

      res.json({ message: "All allocations cleared" });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  })
);

app.post(
  "/allocate",
  asyncHandler(async (req, res) => {
    const validationError = validateAllocationPayload(req.body);

    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const { room_id, course_id, faculty_id, slot_id } = req.body;

    const [result] = await pool.execute(
      "INSERT INTO Allocation (room_id, course_id, faculty_id, slot_id) VALUES (?, ?, ?, ?)",
      [room_id, course_id, faculty_id, slot_id]
    );

    const [rows] = await pool.query(
      `SELECT
         a.allocation_id,
         a.room_id,
         c.room_number,
         a.course_id,
         cr.course_name,
         cr.course_code,
         a.faculty_id,
         f.name AS faculty_name,
         a.slot_id,
         t.day,
         t.start_time,
         t.end_time
       FROM Allocation a
       JOIN Classroom c ON c.room_id = a.room_id
       JOIN Course cr ON cr.course_id = a.course_id
       JOIN Faculty f ON f.faculty_id = a.faculty_id
       JOIN TimeSlot t ON t.slot_id = a.slot_id
       WHERE a.allocation_id = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      message: "Allocation created successfully",
      allocation: rows[0],
    });
  })
);

// ── NEW ROUTE 1: Dashboard stats ────────────────────────────────────────────
app.get(
  "/api/stats",
  asyncHandler(async (req, res) => {
    const [[{ totalRooms }]] = await pool.query("SELECT COUNT(*) as totalRooms FROM Classroom");
    const [[{ totalCourses }]] = await pool.query("SELECT COUNT(*) as totalCourses FROM Course");
    const [[{ totalAllocations }]] = await pool.query("SELECT COUNT(*) as totalAllocations FROM Allocation");
    res.json({ totalRooms, totalCourses, totalAllocations });
  })
);

// ── NEW ROUTE 2: Suggest best room for a course + timeslot ───────────────────
app.get(
  "/api/suggest-room",
  asyncHandler(async (req, res) => {
    const { courseId, slotId } = req.query;
    if (!courseId || !slotId) {
      return res.status(400).json({ error: "courseId and slotId are required" });
    }

    const [courses] = await pool.query(
      "SELECT course_id, course_name, enrollment_count FROM Course WHERE course_id = ?",
      [courseId]
    );
    if (!courses.length) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = courses[0];
    const courseSize = course.enrollment_count || 40;

    const [freeRooms] = await pool.query(
      `SELECT room_id, room_number, capacity, building, room_type
       FROM Classroom
       WHERE room_id NOT IN (
         SELECT room_id FROM Allocation WHERE slot_id = ?
       )`,
      [slotId]
    );

    if (!freeRooms.length) {
      return res.json({
        best: null,
        alternatives: [],
        courseSize,
        message: "No rooms available for this timeslot",
      });
    }

    const suitable = freeRooms.filter((r) => (r.capacity || 999) >= courseSize);

    if (!suitable.length) {
      return res.json({
        best: null,
        alternatives: [],
        courseSize,
        message: "No rooms with sufficient capacity for this course",
      });
    }

    const scored = suitable
      .map((r) => {
        const cap = r.capacity || 60;
        const overflow = cap - courseSize;
        // Best score = tight fit. Penalty for large excess capacity.
        const score = Math.round(Math.max(0, Math.min(100, 100 - overflow * 0.5)));
        return {
          roomId: r.room_id,
          roomName: r.room_number,
          capacity: cap,
          building: r.building,
          roomType: r.room_type,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    res.json({
      best: scored[0],
      alternatives: scored.slice(1, 3),
      courseSize,
    });
  })
);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  if (err.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      error: "Duplicate entry or scheduling conflict detected",
      details: err.sqlMessage,
    });
  }

  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    return res.status(400).json({
      error: "Invalid foreign key reference",
      details: "One or more provided IDs do not exist",
    });
  }

  if (err.sqlState === "45000") {
    return res.status(409).json({
      error: "Allocation conflict detected",
      details: err.message,
    });
  }

  return res.status(500).json({
    error: "Internal server error",
    details: err.message || "Unexpected error",
  });
});

app.listen(PORT, async () => {
  try {
    await pool.getConnection().then((connection) => connection.release());
    console.log(`Server is running on port ${PORT}`);
    console.log("Database connection established.");
  } catch (error) {
    console.error("Server started, but database connection failed:", error.message);
  }
});
