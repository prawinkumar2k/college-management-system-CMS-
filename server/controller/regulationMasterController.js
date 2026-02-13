import db from '../db.js';

// Get all regulations
export const getAllRegulations = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM regulation_master');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add new regulation
export const addRegulation = async (req, res) => {
  try {
    const { Regulation } = req.body;
    await db.query('INSERT INTO regulation_master (Regulation, CreatedAt) VALUES (?, NOW())', [Regulation]);
    res.json({ message: 'Regulation added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit regulation
export const editRegulation = async (req, res) => {
  try {
    const { id } = req.params;
    const { Regulation } = req.body;
    await db.query('UPDATE regulation_master SET Regulation=?, UpdatedAt=NOW() WHERE id=?', [Regulation, id]);
    res.json({ message: 'Regulation updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete regulation
export const deleteRegulation = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM regulation_master WHERE id=?', [id]);
    res.json({ message: 'Regulation deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
