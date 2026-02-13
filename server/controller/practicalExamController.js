// controllers/practicalExam.controller.js
import pool from "../db.js";

/**
 * GET Practical Exam Student List
 * Filters supported:
 * Exam_Date, Session, Dept_Code, QPC, Regulation, Semester
 */
export const getPracticalExamStudents = async (req, res) => {
  try {
    const {
      Exam_Date,
      Session,
      Dept_Code,
      QPC,
      Regulation,
      Semester
    } = req.query;

    const sql = `
      SELECT
        et.id AS exam_timetable_id,
        et.Exam_Date,
        et.Session,
        et.Dept_Code,
        et.QPC,
        et.Regulation,
        et.Semester,
        sm.Sub_Code,
        st.Register_Number,
        st.Student_Name,
        'R' AS Exam_Type
      FROM practical_exam_timetable et
      JOIN subject_master sm
        ON sm.QPC = et.QPC
       AND sm.Dept_Code = et.Dept_Code
      JOIN student_master st
        ON st.Dept_Code = et.Dept_Code
       AND st.Admission_Status = 'Admitted'
       AND FIND_IN_SET(
          sm.Sub_Code,
          CASE et.Semester
            WHEN 1 THEN st.S1
            WHEN 2 THEN st.S2
            WHEN 3 THEN st.S3
            WHEN 4 THEN st.S4
            WHEN 5 THEN st.S5
            WHEN 6 THEN st.S6
            WHEN 7 THEN st.S7
            WHEN 8 THEN st.S8
          END
       ) > 0

      UNION ALL

      SELECT
        et.id AS exam_timetable_id,
        et.Exam_Date,
        et.Session,
        et.Dept_Code,
        et.QPC,
        et.Regulation,
        et.Semester,
        sm.Sub_Code,
        st.Register_Number,
        st.Student_Name,
        'A' AS Exam_Type
      FROM practical_exam_timetable et
      JOIN subject_master sm
        ON sm.QPC = et.QPC
       AND sm.Dept_Code = et.Dept_Code
      JOIN student_master st
        ON st.Dept_Code = et.Dept_Code
       AND st.Admission_Status = 'Admitted'
       AND (
          (et.Semester > 1 AND FIND_IN_SET(sm.Sub_Code, st.S1) > 0) OR
          (et.Semester > 2 AND FIND_IN_SET(sm.Sub_Code, st.S2) > 0) OR
          (et.Semester > 3 AND FIND_IN_SET(sm.Sub_Code, st.S3) > 0) OR
          (et.Semester > 4 AND FIND_IN_SET(sm.Sub_Code, st.S4) > 0) OR
          (et.Semester > 5 AND FIND_IN_SET(sm.Sub_Code, st.S5) > 0) OR
          (et.Semester > 6 AND FIND_IN_SET(sm.Sub_Code, st.S6) > 0) OR
          (et.Semester > 7 AND FIND_IN_SET(sm.Sub_Code, st.S7) > 0)
       )
    `;

    const conditions = [];
    const params = [];

    if (Exam_Date) {
      conditions.push("Exam_Date = ?");
      params.push(Exam_Date);
    }
    if (Session) {
      conditions.push("Session = ?");
      params.push(Session);
    }
    if (Dept_Code) {
      conditions.push("Dept_Code = ?");
      params.push(Dept_Code);
    }
    if (QPC) {
      conditions.push("QPC = ?");
      params.push(QPC);
    }
    if (Regulation) {
      conditions.push("Regulation = ?");
      params.push(Regulation);
    }
    if (Semester) {
      conditions.push("Semester = ?");
      params.push(Semester);
    }

    const finalSql =
      conditions.length > 0
        ? `SELECT * FROM (${sql}) t WHERE ${conditions.join(" AND ")}`
        : sql;

    const [rows] = await pool.query(finalSql, params);

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error("Practical Exam Fetch Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch practical exam students"
    });
  }
};