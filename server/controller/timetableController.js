// controllers/timetable.controller.js
import pool from "../db.js";

/**
 * Helper: map frontend camelCase → DB snake_case
 */
const mapBodyToDb = (body = {}) => ({
  Exam_Date: body.Exam_Date || null,
  Day_Order: body.Day_Order || null,
  Session: body.Session || null,
  Dept_Code: body.Dept_Code || null,
  Dept_Name: body.Dept_Name || null,
  Regulation: body.Regulation || null,
  Semester: body.Semester || null,
  Year: body.Year || null,
  Sub_Name: body.Sub_Name || null,
  Sub_Code: body.Sub_Code || null,
  QPC: body.QPC || null,
  Elective: body.Elective || null,
  Elective_No: body.Elective_No || null,
  Regular_Count: body.Regular_Count || 0,
  Arrear_Count: body.Arrear_Count || 0,
});

/**
 * GET /api/timetable
 * Optional filters: type, exam_date, course_code
 */
export const getTimetables = async (req, res) => {
  try {
    // Optionally add filters if needed
    let sql = "SELECT * FROM exam_timetable WHERE 1=1";
      const params = [];
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getTimetables error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch timetable" });
  }
};

/**
 * GET /api/timetable/:id
 */
export const getTimetableById = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM exam_timetable WHERE id = ?",
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("getTimetableById error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch record" });
  }
};

/**
 * POST /api/timetable
 */
export const createTimetable = async (req, res) => {
  try {
    const data = mapBodyToDb(req.body);
    const sql = `
      INSERT INTO exam_timetable (
        Exam_Date, Day_Order, Session, Dept_Code, Dept_Name, Regulation, Semester, Year, Sub_Name, Sub_Code, QPC, Elective, Elective_No, Regular_Count, Arrear_Count
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;
    const params = [
      data.Exam_Date,
      data.Day_Order,
      data.Session,
      data.Dept_Code,
      data.Dept_Name,
      data.Regulation,
      data.Semester,
      data.Year,
      data.Sub_Name,
      data.Sub_Code,
      data.QPC,
      data.Elective,
      data.Elective_No,
      data.Regular_Count,
      data.Arrear_Count,
    ];
    const [result] = await pool.query(sql, params);
    const [saved] = await pool.query(
      "SELECT * FROM exam_timetable WHERE id = ?",
      [result.insertId]
    );
    res.status(201).json({ success: true, data: saved[0] });
  } catch (err) {
    console.error("createTimetable error:", err);
    res.status(500).json({ success: false, message: "Failed to create timetable" });
  }
};

/**
 * PUT /api/timetable/:id
 */
export const updateTimetable = async (req, res) => {
  try {
    const data = mapBodyToDb(req.body);
    const fields = [];
    const params = [];
    for (const key in data) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }
    if (!fields.length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }
    params.push(req.params.id);
    await pool.query(
      `UPDATE exam_timetable SET ${fields.join(", ")} WHERE id = ?`,
      params
    );
    const [rows] = await pool.query(
      "SELECT * FROM exam_timetable WHERE id = ?",
      [req.params.id]
    );
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("updateTimetable error:", err);
    res.status(500).json({ success: false, message: "Failed to update timetable" });
  }
};

/**
 * DELETE /api/timetable/:id
 */
export const deleteTimetable = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM exam_timetable WHERE id = ?",
      [req.params.id]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, message: "Timetable deleted" });
  } catch (err) {
    console.error("deleteTimetable error:", err);
    res.status(500).json({ success: false, message: "Failed to delete timetable" });
  }
};

/**
 * GET /api/timetable/master/regulations
 */
export const getMasterRegulations = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM regulation_master');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getMasterRegulations error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/timetable/master/semesters
 */
export const getMasterSemesters = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM semester_master');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getMasterSemesters error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/timetable/master/departments
 */
export const getMasterDepartments = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT Dept_Name, Dept_Code FROM course_details');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getMasterDepartments error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/timetable/master/subjects
 * Optional filters: deptCode, semester, year, regulation, qpc
 */
export const getMasterSubjects = async (req, res) => {
  try {
    const { deptCode, semester, year, regulation, qpc } = req.query;
    let sql = 'SELECT * FROM subject_master WHERE 1=1 AND Sub_Type = "T"';
    const params = [];
    if (deptCode) {
      sql += ' AND Dept_Code = ?';
      params.push(deptCode);
    }
    if (semester) {
      sql += ' AND Semester = ?';
      params.push(semester);
    }
    if (year) {
      sql += ' AND Year = ?';
      params.push(year);
    }
    if (regulation) {
      sql += ' AND Regulation = ?';
      params.push(regulation);
    }
    if (qpc) {
      sql += ' AND QPC = ?';
      params.push(qpc);
    }
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getMasterSubjects error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/timetable/master/subjects-with-counts
 * Filters: qpc, deptCode, semester
 * Returns subjects with Regular_Count and Arrear_Count
 * 
 * Regular Count: Students with subject in CURRENT semester (S3, S5, etc.)
 * Arrear Count: Students with subject in ANY PREVIOUS semester (S1, S2, etc.)
 * 
 * IMPORTANT: A student can be counted in both Regular AND Arrear if they have
 * the subject in both current and previous semesters (no exclusion).
 */
export const getMasterSubjectsWithCounts = async (req, res) => {
  try {
    const { qpc, deptCode, semester } = req.query;

    /* ================= VALIDATION ================= */
    const sem = parseInt(semester, 10);
    if (!sem || sem < 1) {
      return res.status(400).json({
        success: false,
        message: "Invalid semester"
      });
    }

    /* ================= GET SUBJECTS ================= */
    // ❌ DO NOT filter by Semester here
    let sql = `SELECT * FROM subject_master WHERE 1=1`;
    const params = [];

    if (qpc) {
      sql += ` AND QPC = ?`;
      params.push(qpc);
    }

    if (deptCode) {
      sql += ` AND Dept_Code = ?`;
      params.push(deptCode);
    }

    const [subjects] = await pool.query(sql, params);

    /* ================= SEMESTER COLUMNS ================= */
    const currentSemesterColumn = `S${sem}`;

    const previousSemesterColumns = [];
    for (let i = 1; i < sem; i++) {
      previousSemesterColumns.push(`S${i}`);
    }

    /* ================= CALCULATE COUNTS ================= */
    const subjectsWithCounts = await Promise.all(
      subjects.map(async (subject) => {
        const subCode = subject.Sub_Code;

        /* ---------- REGULAR COUNT ---------- */
        const regularSql = `
          SELECT COUNT(DISTINCT Register_Number) AS count
          FROM student_master
          WHERE Dept_Code = ?
          AND Admission_Status = 'Admitted'
          AND FIND_IN_SET(?, ${currentSemesterColumn}) > 0
        `;

        const [[{ count: regularCount } = { count: 0 }]] =
          await pool.query(regularSql, [deptCode, subCode]);

        /* ---------- ARREAR COUNT ---------- */
        let arrearCount = 0;

        if (previousSemesterColumns.length > 0) {
          const arrearConditions = previousSemesterColumns
            .map(col => `FIND_IN_SET(?, ${col}) > 0`)
            .join(" OR ");

          const arrearSql = `
            SELECT COUNT(DISTINCT Register_Number) AS count
            FROM student_master
            WHERE Dept_Code = ?
            AND Admission_Status = 'Admitted'
            AND (${arrearConditions})
          `;

          const arrearParams = [
            deptCode,
            ...previousSemesterColumns.map(() => subCode)
          ];

          const [[{ count } = { count: 0 }]] =
            await pool.query(arrearSql, arrearParams);

          arrearCount = count;
        }

        return {
          ...subject,
          Regular_Count: regularCount,
          Arrear_Count: arrearCount
        };
      })
    );

    return res.json({
      success: true,
      data: subjectsWithCounts
    });

  } catch (err) {
    console.error("getMasterSubjectsWithCounts error:", err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
