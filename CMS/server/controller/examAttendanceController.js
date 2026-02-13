import pool from "../db.js";

/* ======================================================
   CREATE EXAM ATTENDANCE
====================================================== */
export const createExamAttendance = async (req, res) => {
  try {
    const {
      exam_date,
      session,
      subject_code,
      subject_name,
      dept_code,
      dept_name,
      semester,
      regulation,
      hall_code,
      hall_name,
      hall_capacity,
      seat_no,
      row,
      col,
      register_number,
      student_name,
      attendance_status
    } = req.body;

    const sql = `
      INSERT INTO exam_attendance (
        exam_date, session, subject_code, subject_name,
        dept_code, dept_name, semester, regulation,
        hall_code, hall_name, hall_capacity,
        seat_no, row, col,
        register_number, student_name, attendance_status
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const [result] = await pool.query(sql, [
      exam_date,
      session,
      subject_code,
      subject_name,
      dept_code,
      dept_name,
      semester,
      regulation,
      hall_code,
      hall_name,
      hall_capacity,
      seat_no,
      row,
      col,
      register_number,
      student_name,
      attendance_status
    ]);

    res.status(201).json({
      success: true,
      message: "Exam attendance created successfully",
      id: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   GET ALL EXAM ATTENDANCE
====================================================== */
export const getExamAttendanceList = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM exam_attendance ORDER BY exam_date DESC"
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   GET SINGLE EXAM ATTENDANCE BY ID
====================================================== */
export const getExamAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      "SELECT * FROM exam_attendance WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   UPDATE EXAM ATTENDANCE
====================================================== */
export const updateExamAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      attendance_status,
      seat_no,
      row,
      col,
      hall_code,
      hall_name
    } = req.body;

    const sql = `
      UPDATE exam_attendance SET
        attendance_status = ?,
        seat_no = ?,
        row = ?,
        col = ?,
        hall_code = ?,
        hall_name = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await pool.query(sql, [
      attendance_status,
      seat_no,
      row,
      col,
      hall_code,
      hall_name,
      id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json({ success: true, message: "Exam attendance updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ======================================================
   DELETE EXAM ATTENDANCE
====================================================== */
export const deleteExamAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM exam_attendance WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    res.json({ success: true, message: "Exam attendance deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
