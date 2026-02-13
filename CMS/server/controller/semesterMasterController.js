import db from '../db.js';

// Get all semesters
export const getAllSemesters = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM semester_master');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add new semester
export const addSemester = async (req, res) => {
  try {
    const { Semester } = req.body;
    // Auto-generate year based on semester
    const semNum = parseInt(Semester);
    let year = '';
    if (semNum >= 1 && semNum <= 2) year = '1';
    else if (semNum >= 3 && semNum <= 4) year = '2';
    else if (semNum >= 5 && semNum <= 6) year = '3';
    else if (semNum >= 7 && semNum <= 8) year = '4';
    
    await db.query('INSERT INTO semester_master (Semester, Year, CreatedAt) VALUES (?, ?, NOW())', [Semester, year]);
    res.json({ message: 'Semester added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit semester
export const editSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const { Semester } = req.body;
    // Auto-generate year based on semester
    const semNum = parseInt(Semester);
    let year = '';
    if (semNum >= 1 && semNum <= 2) year = '1';
    else if (semNum >= 3 && semNum <= 4) year = '2';
    else if (semNum >= 5 && semNum <= 6) year = '3';
    else if (semNum >= 7 && semNum <= 8) year = '4';
    
    await db.query('UPDATE semester_master SET Semester=?, Year=?, UpdatedAt=NOW() WHERE id=?', [Semester, year, id]);
    res.json({ message: 'Semester updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete semester
export const deleteSemester = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM semester_master WHERE id=?', [id]);
    res.json({ message: 'Semester deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
