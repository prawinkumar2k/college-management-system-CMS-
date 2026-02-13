// controllers/settlementController.js
import db from '../db.js'; // MySQL2 pool/connection

// ----------------------
// Helper: validate body
// ----------------------
const validateSettlement = (body) => {
  const { date, expenseType, detail, person, amount } = body;

  if (!date || !expenseType || !detail || !person || amount == null) {
    return 'All fields (date, expenseType, detail, person, amount) are required.';
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return 'Amount must be a positive number.';
  }

  return null;
};

// ---------------------------------------------
// GET /api/settlements
// Optional query filters: fromDate, toDate, expenseType, person
// ---------------------------------------------
export const getAllSettlements = async (req, res) => {
  try {
    const { fromDate, toDate, expenseType, person } = req.query;

    let query = 'SELECT * FROM settlements WHERE 1=1';
    const params = [];

    if (fromDate) {
      query += ' AND date >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND date <= ?';
      params.push(toDate);
    }

    if (expenseType) {
      query += ' AND expense_type = ?';
      params.push(expenseType);
    }

    if (person) {
      query += ' AND person = ?';
      params.push(person);
    }

    query += ' ORDER BY date DESC, id DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching settlements:', err);
    res.status(500).json({
      error: 'Failed to fetch settlements',
      details: err.message,
    });
  }
};

// ---------------------------------------------
// GET /api/settlements/:id
// ---------------------------------------------
export const getSettlementById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      'SELECT * FROM settlements WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching settlement by id:', err);
    res.status(500).json({
      error: 'Failed to fetch settlement',
      details: err.message,
    });
  }
};

// ---------------------------------------------
// POST /api/settlements
// Body: { date, expenseType, detail, person, amount }
// ---------------------------------------------
export const createSettlement = async (req, res) => {
  try {
    const error = validateSettlement(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const { date, expenseType, detail, person, amount } = req.body;

    const [result] = await db.query(
      `INSERT INTO settlements (date, expense_type, detail, person, amount)
       VALUES (?, ?, ?, ?, ?)`,
      [date, expenseType, detail, person, String(amount)]
    );

    const [rows] = await db.query(
      'SELECT * FROM settlements WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating settlement:', err);
    res.status(500).json({
      error: 'Failed to create settlement',
      details: err.message,
    });
  }
};

// ---------------------------------------------
// PUT /api/settlements/:id
// Body: { date, expenseType, detail, person, amount }
// ---------------------------------------------
export const updateSettlement = async (req, res) => {
  try {
    const { id } = req.params;

    const error = validateSettlement(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const { date, expenseType, detail, person, amount } = req.body;

    const [result] = await db.query(
      `UPDATE settlements
       SET date = ?, expense_type = ?, detail = ?, person = ?, amount = ?
       WHERE id = ?`,
      [date, expenseType, detail, person, String(amount), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const [rows] = await db.query(
      'SELECT * FROM settlements WHERE id = ?',
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating settlement:', err);
    res.status(500).json({
      error: 'Failed to update settlement',
      details: err.message,
    });
  }
};

// ---------------------------------------------
// DELETE /api/settlements/:id
// ---------------------------------------------
export const deleteSettlement = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      'DELETE FROM settlements WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    res.json({ message: 'Settlement deleted successfully' });
  } catch (err) {
    console.error('Error deleting settlement:', err);
    res.status(500).json({
      error: 'Failed to delete settlement',
      details: err.message,
    });
  }
};
