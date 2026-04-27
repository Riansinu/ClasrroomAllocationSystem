-- ==============================
-- DATABASE
-- ==============================
DROP DATABASE IF EXISTS ClassroomAllocationSystem;
CREATE DATABASE ClassroomAllocationSystem;
USE ClassroomAllocationSystem;

-- ==============================
-- CLASSROOM TABLE
-- ==============================
CREATE TABLE Classroom (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    capacity INT NOT NULL CHECK (capacity > 0),
    building VARCHAR(50) NOT NULL,
    room_type ENUM('Lecture', 'Lab', 'Auditorium') NOT NULL
);

-- ==============================
-- FACULTY TABLE
-- ==============================
CREATE TABLE Faculty (
    faculty_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    department VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE
);

-- ==============================
-- COURSE TABLE (IMPROVED)
-- ==============================
CREATE TABLE Course (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    credits INT NOT NULL CHECK (credits > 0),
    enrollment_count INT NOT NULL CHECK (enrollment_count >= 0)
);

-- ==============================
-- TIMESLOT TABLE (STRICT VALIDATION)
-- ==============================
CREATE TABLE TimeSlot (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    day ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CHECK (end_time > start_time),
    UNIQUE(day, start_time, end_time)
);

-- ==============================
-- ALLOCATION TABLE (CORE LOGIC)
-- ==============================
CREATE TABLE Allocation (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    course_id INT NOT NULL,
    faculty_id INT NOT NULL,
    slot_id INT NOT NULL,

    FOREIGN KEY (room_id) REFERENCES Classroom(room_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    FOREIGN KEY (course_id) REFERENCES Course(course_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    FOREIGN KEY (slot_id) REFERENCES TimeSlot(slot_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    -- CONFLICT PREVENTION
    UNIQUE(room_id, slot_id),
    UNIQUE(faculty_id, slot_id)
);

-- ==============================
-- CONFLICT LOG TABLE
-- ==============================
CREATE TABLE Conflict_Log (
    conflict_id INT AUTO_INCREMENT PRIMARY KEY,
    allocation_id INT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    conflict_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    remarks VARCHAR(200),

    FOREIGN KEY (allocation_id) REFERENCES Allocation(allocation_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- ==============================
-- TRIGGER: CONFLICT DETECTION
-- ==============================
DELIMITER $$

CREATE TRIGGER trg_check_allocation_conflict
BEFORE INSERT ON Allocation
FOR EACH ROW
BEGIN
    -- Room-Time Clash
    IF EXISTS (
        SELECT 1 FROM Allocation
        WHERE room_id = NEW.room_id AND slot_id = NEW.slot_id
    ) THEN
        INSERT INTO Conflict_Log(conflict_type, remarks)
        VALUES ('Room-Time Clash', 'Room already booked for this slot');

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Room-Time Clash: Room already booked';
    END IF;

    -- Faculty Clash
    IF EXISTS (
        SELECT 1 FROM Allocation
        WHERE faculty_id = NEW.faculty_id AND slot_id = NEW.slot_id
    ) THEN
        INSERT INTO Conflict_Log(conflict_type, remarks)
        VALUES ('Faculty Clash', 'Faculty already assigned for this slot');

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Faculty Clash: Faculty already scheduled';
    END IF;

    -- Capacity Check (NEW IMPROVEMENT 🔥)
    IF EXISTS (
        SELECT 1
        FROM Classroom c
        JOIN Course cr ON cr.course_id = NEW.course_id
        WHERE c.room_id = NEW.room_id
        AND c.capacity < cr.enrollment_count
    ) THEN
        INSERT INTO Conflict_Log(conflict_type, remarks)
        VALUES ('Capacity Issue', 'Room capacity insufficient');

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Capacity Issue: Room too small';
    END IF;

END$$

DELIMITER ;

-- ==============================
-- SAMPLE DATA (CLEANED)
-- ==============================

INSERT INTO Classroom (room_number, capacity, building, room_type) VALUES
('C101', 60, 'Block A', 'Lecture'),
('C102', 40, 'Block A', 'Lecture'),
('LAB201', 30, 'Block B', 'Lab'),
('LAB202', 25, 'Block B', 'Lab'),
('AUD1', 200, 'Main Block', 'Auditorium');

INSERT INTO Faculty (name, department, email) VALUES
('Dr. Anil Kumar', 'CSE', 'anil.kumar@srmist.edu.in'),
('Dr. Priya Sharma', 'IT', 'priya.sharma@srmist.edu.in'),
('Mr. Rahul Verma', 'CSE', 'rahul.verma@srmist.edu.in'),
('Ms. Neha Singh', 'ECE', 'neha.singh@srmist.edu.in'),
('Dr. Amit Patel', 'CSE', 'amit.patel@srmist.edu.in');

INSERT INTO Course (course_name, course_code, credits, enrollment_count) VALUES
('Database Management Systems', '21CSC205P', 4, 58),
('Operating Systems', '21CSC202J', 4, 42),
('Data Structures', '21CSC201J', 4, 30),
('Computer Networks', '21CSC203J', 3, 35),
('Web Technology', '21CSC210J', 3, 120);

INSERT INTO TimeSlot (day, start_time, end_time) VALUES
('Monday', '09:00:00', '10:00:00'),
('Monday', '10:00:00', '11:00:00'),
('Tuesday', '09:00:00', '10:00:00'),
('Wednesday', '11:00:00', '12:00:00'),
('Friday', '14:00:00', '15:00:00');

-- VALID ALLOCATIONS
INSERT INTO Allocation (room_id, course_id, faculty_id, slot_id) VALUES
(1, 1, 1, 1),
(2, 2, 2, 2),
(3, 3, 3, 3),
(4, 4, 4, 4);

-- TEST CONFLICT (uncomment to test)
-- INSERT INTO Allocation (room_id, course_id, faculty_id, slot_id)
-- VALUES (1, 2, 3, 1);
DROP TRIGGER IF EXISTS trg_check_allocation_conflict;
DELIMITER $$

CREATE TRIGGER trg_check_allocation_conflict
BEFORE INSERT ON Allocation
FOR EACH ROW
BEGIN

    IF EXISTS (
        SELECT 1 FROM Allocation
        WHERE room_id = NEW.room_id AND slot_id = NEW.slot_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Room-Time Clash: Room already booked';
    END IF;

    IF EXISTS (
        SELECT 1 FROM Allocation
        WHERE faculty_id = NEW.faculty_id AND slot_id = NEW.slot_id
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Faculty Clash: Faculty already scheduled';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM Classroom c
        JOIN Course cr ON cr.course_id = NEW.course_id
        WHERE c.room_id = NEW.room_id
        AND c.capacity < cr.enrollment_count
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Capacity Issue: Room too small';
    END IF;

END$$

DELIMITER ;
INSERT INTO Allocation (room_id, course_id, faculty_id, slot_id)
VALUES (1, 2, 3, 1);
DELIMITER $$

CREATE PROCEDURE allocate_classroom_tx(
    IN p_room INT,
    IN p_course INT,
    IN p_faculty INT,
    IN p_slot INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
    END;

    START TRANSACTION;

    INSERT INTO Allocation (room_id, course_id, faculty_id, slot_id)
    VALUES (p_room, p_course, p_faculty, p_slot);

    COMMIT;

END$$

DELIMITER ;
CALL allocate_classroom_tx(2, 3, 4, 2);
CALL allocate_classroom_tx(1, 2, 3, 1);
DELETE FROM Allocation;
SET SQL_SAFE_UPDATES = 0;

DELETE FROM Allocation;

SET SQL_SAFE_UPDATES = 1;