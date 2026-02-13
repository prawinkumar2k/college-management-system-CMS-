import db from '../db.js';

export const getQPRequirements = async (req, res) => {
  try {
    // Select required columns from exam_timetable
    const [rows] = await db.query('SELECT id, QPC, Dept_Code, Elective, Semester, Regulation, Sub_Code, Sub_Name, Regular_Count, Arrear_Count FROM exam_timetable');
    // Map DB columns to frontend keys (all lowercase)
    const mapped = rows.map(row => ({
      id: row.id,
      eqc: row.QPC,
      course: row.Dept_Code,
      subcode: row.Sub_Code,
      subname: row.Sub_Name,
      elective: row.Elective,
      sem: row.Semester,
      regl: row.Regulation,
      regular_count: row.Regular_Count,
      arrear_count: row.Arrear_Count,
      candidates: (row.Regular_Count || 0) + (row.Arrear_Count || 0),
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


export const deleteQPRequirement = async (req, res) => {
  try {
    const id = req.params.id;
  await db.query('DELETE FROM qp WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
