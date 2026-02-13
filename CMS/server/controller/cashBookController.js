// server/controller/cashBookController.js
import pool from '../db.js';

// GET /api/cashbook - fetch all fee transactions
export const getCashBookEntries = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT date, voucher, type, detail, category, amount, mode FROM cashbook ORDER BY date DESC LIMIT 200`
    );
    res.json(rows);
  } catch (err) {
    console.error('getCashBookEntries error:', err);
    res.status(500).json({ message: 'Failed to fetch cash book entries' });
  }
};
