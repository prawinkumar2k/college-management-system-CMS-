import db from '../db.js';

// Get all subjects
export const getSubjects = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM subject_master');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a new subject
export const addSubject = async (req, res) => {
  try {
    const subject = req.body;
    const fields = Object.keys(subject).join(',');
    const values = Object.values(subject);
    const placeholders = values.map(() => '?').join(',');
    const sql = `INSERT INTO subject_master (${fields}) VALUES (${placeholders})`;
    await db.query(sql, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit subject
export const editSubject = async (req, res) => {
  try {
    const id = req.params.id;
    const subject = req.body;
    const updates = Object.keys(subject).map(key => `${key}=?`).join(',');
    const values = [...Object.values(subject), id];
    const sql = `UPDATE subject_master SET ${updates} WHERE id=?`;
    await db.query(sql, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete subject
export const deleteSubject = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM subject_master WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Check if subject code exists
export const checkSubjectCode = async (req, res) => {
  try {
    const { subjectCode, excludeId } = req.query;
    if (!subjectCode) return res.status(400).json({ exists: false });
    let sql = 'SELECT id FROM subject_master WHERE SUBCODE = ?';
    let params = [subjectCode];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
