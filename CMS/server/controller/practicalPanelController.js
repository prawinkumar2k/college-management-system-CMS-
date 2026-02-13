// controller/practicalPanelController.js
import pool from "../db.js";

/**
 * GET PRACTICAL PANEL REPORT
 * URL:
 * /api/practical-panel?deptCode=DME&semester=5
 */
export const getPracticalPanel = async (req, res) => {
  try {
    const { deptCode, semester } = req.query;

    if (!deptCode || !semester) {
      return res.status(400).json({
        message: "Department Code and Semester are required"
      });
    }

    const sql = `
      SELECT
        sub.Dept_Code,
        sub.Semester,
        sub.Sub_Code,
        sub.Sub_Name,
        sub.Col_No,
        sub.Type,
        COUNT(st.Student_ID) AS Candidate
      FROM subject_master sub
      JOIN student_master st
        ON st.Dept_Code = sub.Dept_Code
       AND st.Admission_Status = 'Admitted'
       AND (
          CASE sub.Semester
            WHEN 1 THEN FIND_IN_SET(sub.Sub_Code, st.S1)
            WHEN 2 THEN FIND_IN_SET(sub.Sub_Code, st.S2)
            WHEN 3 THEN FIND_IN_SET(sub.Sub_Code, st.S3)
            WHEN 4 THEN FIND_IN_SET(sub.Sub_Code, st.S4)
            WHEN 5 THEN FIND_IN_SET(sub.Sub_Code, st.S5)
            WHEN 6 THEN FIND_IN_SET(sub.Sub_Code, st.S6)
          END
       ) > 0
      WHERE sub.Dept_Code = ?
        AND sub.Semester = ?
        AND sub.Subject_Type = 'PRACTICAL'
      GROUP BY
        sub.Sub_Code,
        sub.Sub_Name,
        sub.Col_No,
        sub.Type,
        sub.Dept_Code,
        sub.Semester
      ORDER BY sub.Sub_Code
    `;

    const [rows] = await pool.query(sql, [deptCode, semester]);

    res.json(rows);
  } catch (error) {
    console.error("Practical Panel Error:", error);
    res.status(500).json({
      message: "Failed to generate Practical Panel report"
    });
  }
};
