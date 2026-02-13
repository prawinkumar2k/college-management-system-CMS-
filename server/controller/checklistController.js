import db from '../db.js';

export const getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT DISTINCT Dept_Code, Dept_Name 
       FROM exam_timetable 
       ORDER BY Dept_Name`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};


export const getChecklistReport = async (req, res) => {
  try {
    const { department, type } = req.query;

    let typeCondition = '';
    if (type === 'regular') {
      typeCondition = "AND es.Exam_Type = 'R'";
    } else if (type === 'arrear') {
      typeCondition = "AND es.Exam_Type = 'A'";
    }

    const [rows] = await db.query(
      `
      SELECT 
        et.Dept_Code,
        et.Dept_Name,
        et.Sub_Code,
        et.Sub_Name,

        GROUP_CONCAT(
          CASE WHEN es.Exam_Type = 'R'
          THEN es.Register_Number END
          ORDER BY es.Register_Number SEPARATOR ', '
        ) AS Regular_Registers,

        COUNT(CASE WHEN es.Exam_Type = 'R' THEN 1 END) AS Regular_Count,

        GROUP_CONCAT(
          CASE WHEN es.Exam_Type = 'A'
          THEN es.Register_Number END
          ORDER BY es.Register_Number SEPARATOR ', '
        ) AS Arrear_Registers,

        COUNT(CASE WHEN es.Exam_Type = 'A' THEN 1 END) AS Arrear_Count

      FROM exam_timetable_student_list es
      JOIN exam_timetable et 
        ON et.Sub_Code COLLATE utf8mb4_unicode_ci
           = es.Sub_Code COLLATE utf8mb4_unicode_ci
       AND et.Dept_Code COLLATE utf8mb4_unicode_ci
           = es.Dept_Code COLLATE utf8mb4_unicode_ci

      WHERE es.Dept_Code COLLATE utf8mb4_unicode_ci = ?
      ${typeCondition}

      GROUP BY et.Sub_Code, et.Sub_Name
      ORDER BY et.Sub_Code
      `,
      [department]
    );

    res.json(rows);
  } catch (err) {
    console.error("Checklist Error:", err);
    res.json([]); // NEVER crash frontend
  }
};
