import db from '../db.js';

// Get all academic years
export const getAllAcademicYears = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM academic_year_master');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add new academic year
export const addAcademicYear = async (req, res) => {
  try {
    const { Academic_Year } = req.body;
    await db.query('INSERT INTO academic_year_master (Academic_Year, Created_At) VALUES (?, NOW())', [Academic_Year]);
    res.json({ message: 'Academic year added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit academic year
export const editAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { Academic_Year } = req.body;
    await db.query('UPDATE academic_year_master SET Academic_Year=?, Update_At=NOW() WHERE Id=?', [Academic_Year, id]);
    res.json({ message: 'Academic year updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete academic year
export const deleteAcademicYear = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM academic_year_master WHERE Id=?', [id]);
    res.json({ message: 'Academic year deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
