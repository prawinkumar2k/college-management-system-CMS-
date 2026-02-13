import pool from "../db.js";

// GET exam timetable student list (VIEW)
export const getExamTimetableStudentList = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM exam_timetable_student_list`
    );

    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error("Error fetching exam timetable view:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam timetable student list"
    });
  }
};