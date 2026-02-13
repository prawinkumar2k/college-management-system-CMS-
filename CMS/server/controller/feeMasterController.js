import db from '../db.js';

// Get all fee types
export const getAllFees = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM fee_master');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add new fee type
export const addFee = async (req, res) => {
  try {
    const { Fee_Type } = req.body;
    await db.query('INSERT INTO fee_master (Fee_Type, CreatedAt) VALUES (?, NOW())', [Fee_Type]);
    res.json({ message: 'Fee type added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit fee type
export const editFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { Fee_Type } = req.body;
    await db.query('UPDATE fee_master SET Fee_Type=?, UpdatedAt=NOW() WHERE id=?', [Fee_Type, id]);
    res.json({ message: 'Fee type updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete fee type
export const deleteFee = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM fee_master WHERE id=?', [id]);
    res.json({ message: 'Fee type deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
