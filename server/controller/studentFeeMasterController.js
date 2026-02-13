// controllers/studentFeeMasterController.js
import db from "../db.js";

/**
 * Fetch student + fee master data
 * Used in Fee Receipt page (auto fill)
 */
export const getStudentFeeMaster = async (req, res) => {
  try {
    const { registerNumber, semester, academicYear } = req.query;

    // Try multiple possible table names (legacy and snake_case) until one works
    const candidateTables = [
      "studentfeemaster",
      "student_fee_master",
      "student_fee_master",
      "student_fee_master_view",
    ];

    const params = [];
    // build where and order fragments (we will inject table name)
    const whereParts = ["1 = 1"];
    if (registerNumber) {
      whereParts.push("Register_Number = ?");
      params.push(registerNumber);
    }
    if (semester) {
      whereParts.push("Semester = ?");
      params.push(semester);
    }
    if (academicYear) {
      whereParts.push("Academic_Year = ?");
      params.push(academicYear);
    }

    let lastErr = null;
    for (const tbl of candidateTables) {
      const query = `SELECT * FROM ${tbl} WHERE ${whereParts.join(" AND ")} ORDER BY Fees_Type`;
      try {
        const [rows] = await db.execute(query, params);
        // success
        console.info(`Student Fee Master: using table ${tbl}, rows=${rows.length}`);
        return res.status(200).json({ success: true, data: rows });
      } catch (err) {
        lastErr = err;
        // try next table if table doesn't exist
        if (err && err.code === "ER_NO_SUCH_TABLE") {
          console.warn(`Table ${tbl} not found, trying next candidate.`);
          continue;
        } else {
          // other errors: break and return error
          console.error(`Error querying table ${tbl}:`, err);
          return res.status(500).json({ success: false, message: "Failed to fetch student fee master data" });
        }
      }
    }

    // if we reach here, no candidate table succeeded
    if (lastErr && lastErr.code === "ER_NO_SUCH_TABLE") {
      console.warn("No student fee master table found — returning empty result set");
      return res.status(200).json({ success: true, data: [] });
    }
    console.error("Student Fee Master Fetch Error:", lastErr);
    return res.status(500).json({ success: false, message: "Failed to fetch student fee master data" });

  } catch (error) {
    // If the studentfeemaster table doesn't exist in this database, return empty data
    if (error && error.code === 'ER_NO_SUCH_TABLE') {
      console.warn('Student Fee Master table missing — returning empty data');
      return res.status(200).json({ success: true, data: [] });
    }

    console.error("Student Fee Master Fetch Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch student fee master data",
    });
  }
};
