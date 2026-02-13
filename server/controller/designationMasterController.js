import db from '../db.js';

// Get all designations
export const getAllDesignations = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM designation_master');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add new designation
export const addDesignation = async (req, res) => {
  try {
    const { Designation } = req.body;
    
    // Check if designation already exists (case-insensitive)
    const [existing] = await db.query(
      'SELECT id FROM designation_master WHERE LOWER(TRIM(Designation)) = LOWER(TRIM(?))',
      [Designation]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This designation already exists' });
    }
    
    await db.query('INSERT INTO designation_master (Designation, CreatedAt) VALUES (?, NOW())', [Designation]);
    res.json({ message: 'Designation added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit designation
export const editDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    const { Designation } = req.body;
    
    // Check if designation already exists (case-insensitive) - exclude current record
    const [existing] = await db.query(
      'SELECT id FROM designation_master WHERE LOWER(TRIM(Designation)) = LOWER(TRIM(?)) AND id != ?',
      [Designation, id]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This designation already exists' });
    }
    
    await db.query('UPDATE designation_master SET Designation=?, UpdatedAt=NOW() WHERE id=?', [Designation, id]);
    res.json({ message: 'Designation updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete designation
export const deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM designation_master WHERE id=?', [id]);
    res.json({ message: 'Designation deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
