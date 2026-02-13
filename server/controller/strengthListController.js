import db from "../db.js";

/* ================================
   STRENGTH LIST REPORT
================================ */
export const getStrengthListReport = async (req, res) => {
  const { type = "normal" } = req.query;

  try {
    const [rows] = await db.query(`
      SELECT
        Dept_Code,
        Dept_Name,
        DATE_FORMAT(Exam_Date, '%d-%m-%Y') AS Exam_Date,
        Session,
        QPC,
        Regulation,
        Semester,
        Sub_Code,
        Sub_Name,
        Regular_Count,
        Arrear_Count
      FROM exam_timetable
      ORDER BY Exam_Date, Session, Semester
    `);

    if (!rows.length) {
      return res.json({ groups: [] });
    }

    const grouped = {};

    rows.forEach(r => {
      const key = `${r.Exam_Date}_${r.Session}`;

      if (!grouped[key]) {
        grouped[key] = {
          exam_date: r.Exam_Date,
          session: r.Session,
          records: [],
          totals: { regular: 0, arrear: 0, total: 0 }
        };
      }

      const regular = type === "simple" ? 0 : r.Regular_Count;
      const arrear  = type === "simple" ? 0 : r.Arrear_Count;
      const total   = r.Regular_Count + r.Arrear_Count;

      grouped[key].records.push({
        qpc: r.QPC,
        dept_code: r.Dept_Code,
        dept_name: r.Dept_Name,
        regulation: r.Regulation,
        sem: r.Semester,
        sub_code: r.Sub_Code,
        sub_name: r.Sub_Name,
        regular,
        arrear,
        total
      });

      grouped[key].totals.regular += regular;
      grouped[key].totals.arrear  += arrear;
      grouped[key].totals.total   += total;
    });

    res.json({
      dept_name: rows[0].Dept_Name,
      dept_code: rows[0].Dept_Code,
      groups: Object.values(grouped)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load strength list" });
  }
};
