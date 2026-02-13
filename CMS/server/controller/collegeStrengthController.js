import db from '../db.js';

/* ------------------------------------
   GET ALL ROWS
------------------------------------ */
export const getCollegeStrength = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM college_strength ORDER BY id DESC'
    );

    res.json(rows);
  } catch (err) {
    console.error("GET ERROR:", err);
    res.status(500).json({ error: 'Failed to fetch college strength' });
  }
};

/* ------------------------------------
   ADD NEW ROW
------------------------------------ */
export const addCollegeStrength = async (req, res) => {
  try {
    const { CourseCode, Branch, Year_1, Year_2, Year_3, Year_4, Others, Total } = req.body;

    const [result] = await db.query(
      `INSERT INTO college_strength 
      (CourseCode, Branch, Year_1, Year_2, Year_3, Year_4, Others, Total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [CourseCode, Branch, Year_1, Year_2, Year_3, Year_4, Others, Total]
    );

    res.json({
      id: result.insertId,
      CourseCode,
      Branch,
      Year_1,
      Year_2,
      Year_3,
      Year_4,
      Others,
      Total,
    });

  } catch (err) {
    console.error("ADD ERROR:", err);
    res.status(500).json({ error: 'Failed to add college strength row' });
  }
};

/* ------------------------------------
   UPDATE ROW
------------------------------------ */
export const updateCollegeStrength = async (req, res) => {
  try {
    const { id } = req.params;
    const { CourseCode, Branch, Year_1, Year_2, Year_3, Year_4, Others, Total } = req.body;

    await db.query(
      `UPDATE college_strength 
       SET CourseCode=?, Branch=?, Year_1=?, Year_2=?, Year_3=?, Year_4=?, Others=?, Total=?
       WHERE id=?`,
      [CourseCode, Branch, Year_1, Year_2, Year_3, Year_4, Others, Total, id]
    );

    res.json({
      id,
      CourseCode,
      Branch,
      Year_1,
      Year_2,
      Year_3,
      Year_4,
      Others,
      Total,
    });

  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: 'Failed to update college strength row' });
  }
};

/* ------------------------------------
   DELETE ROW
------------------------------------ */
export const deleteCollegeStrength = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM college_strength WHERE id=?', [id]);

    res.json({ success: true });

  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: 'Failed to delete college strength row' });
  }
};

/* ------------------------------------
   BULK INSERT (SAVE FILTER)
------------------------------------ */
export const bulkCollegeStrength = async (req, res) => {
  try {
    const rows = req.body; // array of rows sent by frontend

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided' });
    }

    const values = rows.map(r => [
      r.CourseCode,
      r.Branch,
      r.Year_1,
      r.Year_2,
      r.Year_3,
      r.Year_4,
      r.Others,
      r.Total,
    ]);

    await db.query(
      `INSERT INTO college_strength
      (CourseCode, Branch, Year_1, Year_2, Year_3, Year_4, Others, Total)
      VALUES ?`,
      [values]
    );

    res.json({ success: true, inserted: values.length });

  } catch (err) {
    console.error("BULK INSERT ERROR:", err);
    res.status(500).json({ error: 'Bulk insert failed' });
  }
};
