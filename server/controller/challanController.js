// server/controllers/challan.controller.js
import pool from '../db.js';

/**
 * Convert DB snake_case row => frontend camelCase object
 */
function rowToCamel(r) {
  return {
    id: r.id,
    candidateType: r.candidateType,
    course: r.course,
    sem: r.sem,
    regNo: r.regNo,
    date: r.date,
    challanNo: r.challanNo,
    isPaid: r.isPaid === true || r.isPaid === 'true' || r.isPaid === 1,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

/**
 * GET /api/challan
 */
export const getChallans = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, candidateType, course, sem, regNo, date, challanNo, isPaid, created_at, updated_at
       FROM challan
       ORDER BY created_at DESC
       LIMIT 100`
    );

    const data = rows.map(rowToCamel);
    res.json(data);
  } catch (err) {
    console.error('getChallans error:', err);
    res.status(500).json({ message: 'Failed to fetch challan entries' });
  }
};

/**
 * POST /api/challan
 * body: { candidateType, course, sem, regNo, date, challanNo, isPaid }
 */
export const createChallan = async (req, res) => {
  try {
    const {
      candidateType,
      course,
      sem,
      regNo,
      date,
      challanNo,
      isPaid = false
    } = req.body || {};

    // Basic validation
    if (!candidateType || !course || !sem || !regNo || !date || !challanNo) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const data = {
      candidateType: String(candidateType),
      course: String(course),
      sem: String(sem),
      regNo: String(regNo),
      date: String(date),
      challanNo: String(challanNo),
      isPaid: isPaid ? 1 : 0
    };

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO challan (${columns}) VALUES (${placeholders})`;
    const [result] = await pool.query(sql, values);

    const created = {
      id: result.insertId,
      candidateType: data.candidateType,
      course: data.course,
      sem: data.sem,
      regNo: data.regNo,
      date: data.date,
      challanNo: data.challanNo,
      isPaid: !!data.isPaid
    };

    res.status(201).json(created);
  } catch (err) {
    console.error('createChallan error:', err);
    res.status(500).json({ message: 'Failed to create challan' });
  }
};

/**
 * PATCH /api/challan/:challanNo/paid
 * Marks all entries with challan_no as paid.
 */
export const markPaid = async (req, res) => {
  try {
    const { challanNo } = req.params;
    if (!challanNo) return res.status(400).json({ message: 'Missing challanNo parameter' });

      const [result] = await pool.query(
        `UPDATE challan SET isPaid = 1, updated_at = CURRENT_TIMESTAMP WHERE challanNo = ?`,
        [String(challanNo)]
      );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Challan not found' });
    }

    res.json({ message: 'Challan marked as paid', affectedRows: result.affectedRows });
  } catch (err) {
    console.error('markPaid error:', err);
    res.status(500).json({ message: 'Failed to mark challan as paid' });
  }
};
