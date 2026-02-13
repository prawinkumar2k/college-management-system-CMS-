// controllers/feeLedger.controller.js
import pool from '../db.js';
const TABLE = 'fee_ledger';

export const getAll = async (req, res) => {
  try {
    const { department, semester, fee_type, roll_no, academic_year } = req.query;
    const where = [];
    const params = [];

    if (department) { where.push('department = ?'); params.push(department); }
    if (semester) { where.push('semester = ?'); params.push(semester); }
    if (fee_type) { where.push('fee_type = ?'); params.push(fee_type); }
    if (roll_no) { where.push('roll_no LIKE ?'); params.push(`%${roll_no}%`); }
    if (academic_year) { where.push('academic_year = ?'); params.push(academic_year); }

    const sql = `SELECT * FROM ${TABLE}` + (where.length ? ` WHERE ${where.join(' AND ')}` : '') + ' ORDER BY id DESC';
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('getAll error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getById error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const create = async (req, res) => {
  try {
    const {
      roll_no, name, department, semester,
      fee_type, amount, balance, academic_year,
      created_by
    } = req.body;

    const sql = `INSERT INTO ${TABLE} 
      (roll_no, name, department, semester, fee_type, amount, balance, academic_year, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [roll_no, name, department, semester, fee_type, amount, balance, academic_year, created_by];
    const [result] = await pool.execute(sql, params);
    const [rows] = await pool.execute(`SELECT * FROM ${TABLE} WHERE id = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('create error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['roll_no','name','department','semester','fee_type','amount','balance','academic_year','updated_by'];
    const updates = [];
    const params = [];

    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        updates.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    }
    if (!updates.length) return res.status(400).json({ error: 'No fields to update' });
    params.push(id);
    const sql = `UPDATE ${TABLE} SET ${updates.join(', ')}, updated_by = COALESCE(updated_by, ?) WHERE id = ?`;
    // Note: we add updated_by value as last param if present else null; keep code simple
    await pool.execute(`UPDATE ${TABLE} SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.execute(`SELECT * FROM ${TABLE} WHERE id = ?`, [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('update error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deletedId: id });
  } catch (err) {
    console.error('remove error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Bulk update balances endpoint.
 * Accepts an array of objects: [{ id, balance }, ...] and updates each row.
 */
export const bulkUpdateBalances = async (req, res) => {
  try {
    const updates = req.body; // expect array
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'Expected array' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const u of updates) {
        if (!u.id) continue;
        await conn.execute(`UPDATE ${TABLE} SET balance = ? WHERE id = ?`, [String(u.balance), u.id]);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    res.json({ updated: updates.length });
  } catch (err) {
    console.error('bulkUpdateBalances error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
