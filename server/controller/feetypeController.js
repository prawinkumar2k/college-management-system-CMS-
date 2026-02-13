// controllers/feetype.controller.js
import pool from '../db.js';

/**
 * Helper to safely parse numeric-like strings (because your table currently stores amounts as VARCHAR)
 */
const toNumber = (v) => {
  if (v === null || typeof v === 'undefined') return null;
  const n = Number(String(v).replace(/[,₹\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};

/* -----------------------
   Low-level DB helpers (merged from previous model)
   ----------------------- */

export const findAll = async (opts = {}) => {
  const {
    feeType, department, classVal, section,
    status, paymentMode, search,
    fromDate, toDate,
    limit = 50, offset = 0,
    sortBy = 'id', sortDir = 'DESC'
  } = opts;

  const where = [];
  const params = [];

  if (feeType) {
    where.push('F.fee_types LIKE ?');
    params.push(`%${feeType}%`);
  }
  if (department) {
    where.push('F.department = ?');
    params.push(department);
  }
  if (classVal) {
    where.push('F.class = ?');
    params.push(classVal);
  }
  if (section) {
    where.push('F.section = ?');
    params.push(section);
  }
  if (status) {
    where.push('F.status = ?');
    params.push(status);
  }
  if (paymentMode) {
    where.push('F.payment_mode = ?');
    params.push(paymentMode);
  }
  if (search) {
    where.push('(F.name LIKE ? OR F.reg_no LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (fromDate) {
    where.push("F.last_payment_date >= ?");
    params.push(fromDate);
  }
  if (toDate) {
    where.push("F.last_payment_date <= ?");
    params.push(toDate);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // total count
  const countSql = `SELECT COUNT(*) AS total FROM feetype F ${whereSql}`;
  const [countRows] = await pool.query(countSql, params);
  const total = (countRows && countRows[0] && countRows[0].total) ? countRows[0].total : 0;

  // fetch rows
  const allowedSortCols = [
    'id','reg_no','name','department','class','last_payment_date',
    'created_at','updated_at','total_amount','paid_amount','pending_amount'
  ];
  const col = allowedSortCols.includes(sortBy) ? sortBy : 'id';
  const dir = (String(sortDir).toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

  const sql = `
    SELECT F.*
    FROM feetype F
    ${whereSql}
    ORDER BY ${col} ${dir}
    LIMIT ? OFFSET ?
  `;

  const execParams = params.concat([Number(limit), Number(offset)]);
  const [rows] = await pool.query(sql, execParams);

  // Convert amounts to numbers on the fly for convenience
  const normalized = (rows || []).map(r => ({
    ...r,
    total_amount_num: toNumber(r.total_amount),
    paid_amount_num: toNumber(r.paid_amount),
    pending_amount_num: toNumber(r.pending_amount)
  }));

  return { total, rows: normalized };
};

export const findById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM feetype WHERE id = ? LIMIT 1', [id]);
  return (rows && rows[0]) ? rows[0] : null;
};

export const createOne = async (data) => {
  // data is expected to be an object matching the feetype columns
  const fields = [
    'reg_no','name','department','class','section','fee_types',
    'total_amount','paid_amount','pending_amount','last_payment_date',
    'status','payment_mode','notes'
  ];
  const values = fields.map(f => (typeof data[f] !== 'undefined' ? data[f] : null));
  const placeholders = fields.map(() => '?').join(',');

  const sql = `INSERT INTO feetype (${fields.join(',')}) VALUES (${placeholders})`;
  const [result] = await pool.query(sql, values);
  const insertedId = result.insertId;
  return findById(insertedId);
};

export const updateOne = async (id, data) => {
  const updatable = [
    'reg_no','name','department','class','section','fee_types',
    'total_amount','paid_amount','pending_amount','last_payment_date',
    'status','payment_mode','notes'
  ];
  const sets = [];
  const params = [];
  for (const k of updatable) {
    if (k in data) {
      sets.push(`${k} = ?`);
      params.push(data[k]);
    }
  }
  if (!sets.length) return findById(id);
  params.push(id);
  const sql = `UPDATE feetype SET ${sets.join(', ')} WHERE id = ?`;
  await pool.query(sql, params);
  return findById(id);
};

export const removeOne = async (id) => {
  const [res] = await pool.query('DELETE FROM feetype WHERE id = ?', [id]);
  return res.affectedRows > 0;
};

/* -----------------------
   HTTP handlers (controllers)
   ----------------------- */

/**
 * GET /api/feetype
 * Query params: feeType, department, classVal, section, status, paymentMode,
 * search, fromDate, toDate, limit, page, sortBy, sortDir
 */
export const list = async (req, res) => {
  try {
    const {
      feeType, department, classVal, section, status, paymentMode, search,
      fromDate, toDate, limit = 50, page = 1, sortBy, sortDir
    } = req.query;

    const l = Math.min(Number(limit) || 50, 1000);
    const p = Math.max(Number(page) || 1, 1);
    const offset = (p - 1) * l;

    const result = await findAll({
      feeType, department, classVal, section, status, paymentMode, search,
      fromDate, toDate, limit: l, offset, sortBy, sortDir
    });

    return res.json({
      success: true,
      total: result.total,
      page: p,
      perPage: l,
      data: result.rows
    });
  } catch (err) {
    console.error('feetype.list error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch fee records' });
  }
};

export const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const row = await findById(id);
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('feetype.getOne error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch record' });
  }
};

export const create = async (req, res) => {
  try {
    const payload = req.body || {};
    // Basic validation
    if (!payload.reg_no || !payload.name) {
      return res.status(400).json({ success: false, message: 'reg_no and name are required' });
    }
    const created = await createOne(payload);
    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error('feetype.create error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create record' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const payload = req.body || {};
    const updated = await updateOne(id, payload);
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('feetype.update error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update record' });
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
    const ok = await removeOne(id);
    if (!ok) return res.status(404).json({ success: false, message: 'Not found or already deleted' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('feetype.remove error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete record' });
  }
};
