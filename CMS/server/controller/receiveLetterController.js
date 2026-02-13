// server/controllers/receiveLetter.controller.js
import pool from '../db.js';

/**
 * Convert DB row -> frontend camelCase object
 */
function rowToCamel(r) {
  return {
    id: r.id,
    letterId: r.letter_id,
    date: r.letter_date,
    from: r.sender,
    message: r.message,
    status: r.status,
    replay: r.replay,
    receivedDate: r.received_date,
    receivedBy: r.received_by,
    priority: r.priority,
    department: r.department,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

/**
 * GET /api/receive-letter
 * returns list of received letters (most recent first)
 */
export const getAll = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM recive_letter ORDER BY created_at DESC LIMIT 1000`
    );
    res.json(rows.map(rowToCamel));
  } catch (err) {
    console.error('getAll error', err);
    res.status(500).json({ message: 'Failed to fetch received letters' });
  }
};

/**
 * POST /api/receive-letter
 * Accepts frontend body fields: date, from, message, status, replay, (optional letterId, priority, department, receivedDate, receivedBy)
 */
export const createOne = async (req, res) => {
  try {
    const body = req.body || {};
    // Basic validation
    if (!body.date || !body.from || !body.message || !body.status || !body.replay) {
      return res.status(400).json({ message: 'Missing required fields: date/from/message/status/replay' });
    }

    const data = {
      letter_id: body.letterId || null,
      letter_date: String(body.date),
      sender: String(body.from),
      message: String(body.message),
      status: String(body.status),
      replay: String(body.replay),
      received_date: body.receivedDate ? String(body.receivedDate) : null,
      received_by: body.receivedBy ? String(body.receivedBy) : null,
      priority: body.priority ? String(body.priority) : 'Normal',
      department: body.department ? String(body.department) : null
    };

    const cols = Object.keys(data).filter(k => data[k] !== undefined).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO recive_letter (${cols}) VALUES (${placeholders})`;
    const [result] = await pool.query(sql, values);

    const [rows] = await pool.query('SELECT * FROM recive_letter WHERE id = ?', [result.insertId]);
    res.status(201).json(rowToCamel(rows[0]));
  } catch (err) {
    console.error('createOne error', err);
    res.status(500).json({ message: 'Failed to create received letter' });
  }
};

/**
 * PUT /api/receive-letter/:id
 * Update an existing letter
 */
export const updateOne = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    if (!id) return res.status(400).json({ message: 'Missing id parameter' });

    // Build set clause dynamically
    const allowed = {
      letterId: 'letter_id',
      date: 'letter_date',
      from: 'sender',
      message: 'message',
      status: 'status',
      replay: 'replay',
      receivedDate: 'received_date',
      receivedBy: 'received_by',
      priority: 'priority',
      department: 'department'
    };

    const sets = [];
    const values = [];
    for (const [k, col] of Object.entries(allowed)) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        sets.push(`${col} = ?`);
        values.push(body[k] === null ? null : String(body[k]));
      }
    }

    if (sets.length === 0) return res.status(400).json({ message: 'No fields to update' });

    values.push(id);
    const sql = `UPDATE recive_letter SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const [result] = await pool.query(sql, values);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Letter not found' });

    const [rows] = await pool.query('SELECT * FROM recive_letter WHERE id = ?', [id]);
    res.json(rowToCamel(rows[0]));
  } catch (err) {
    console.error('updateOne error', err);
    res.status(500).json({ message: 'Failed to update received letter' });
  }
};

/**
 * DELETE /api/receive-letter/:id
 */
export const deleteOne = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM recive_letter WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Letter not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('deleteOne error', err);
    res.status(500).json({ message: 'Failed to delete received letter' });
  }
};
