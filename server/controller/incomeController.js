// server/controllers/income.controller.js
import { validationResult } from 'express-validator';
import pool from '../db.js';

const devError = (err) => {
  return process.env.NODE_ENV === 'production'
    ? { message: err.message }
    : { message: err.message, stack: err.stack, code: err.code || null };
};

// ---------- Model functions (merged) ----------
/**
 * Parse number safely to decimal (returns 0 for invalid)
 */
const toDecimal = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const TABLE = 'IncomeExpenses';

/**
 * createIncomeExpenses(payload) -> { insertId, affectedRows }
 */
export async function createIncomeExpenses(payload) {
  const sql = `INSERT INTO \`${TABLE}\`
    (sNo, date, grp, category, person, auth_mode, cheque_details, detail, bill_no,
     income_amount, expense_amount, suspense_amount, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const params = [
    payload.sNo || null,
    payload.date || null,
    payload.grp || null,
    payload.category || null,
    payload.person || null,
    payload.auth_mode || null,
    payload.cheque_details || null,
    payload.detail || null,
    payload.bill_no || null,
    toDecimal(payload.income_amount),
    toDecimal(payload.expense_amount),
    toDecimal(payload.suspense_amount),
    payload.created_by || null
  ];

  if (!Array.isArray(params) || params.length !== 13) {
    throw new Error(`createIncomeModel: expected 13 params but got ${params.length}`);
  }

  const [result] = await pool.execute(sql, params);
  return { insertId: result.insertId, affectedRows: result.affectedRows };
}

/**
 * listIncomesModel(opts)
 * opts: { from, to, group, category, person, search, limit, offset }
 */
export async function listIncomesModel(opts = {}) {
  const {
    from,
    to,
    group: grp,
    category,
    person,
    search,
    limit = 200,
    offset = 0
  } = opts;

  const conditions = [];
  const params = [];

  if (from) { conditions.push('date >= ?'); params.push(from); }
  if (to)   { conditions.push('date <= ?'); params.push(to); }
  if (grp)  { conditions.push('grp = ?'); params.push(grp); }
  if (category) { conditions.push('category = ?'); params.push(category); }
  if (person) { conditions.push('person = ?'); params.push(person); }
  if (search) {
    conditions.push('(detail LIKE ? OR bill_no LIKE ? OR sNo LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : 200;
  const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Math.floor(Number(offset))) : 0;

  const sql = `SELECT * FROM \`${TABLE}\` ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`;
  params.push(safeLimit, safeOffset);

  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * getIncomeById(id)
 */
export async function getIncomeById(id) {
  const [rows] = await pool.execute('SELECT * FROM `IncomeExpenses` WHERE id = ? LIMIT 1', [id]);
  return rows[0] ?? null;
}

/**
 * updateIncomeById(id, payload) -> { affectedRows, changedRows }
 */
export async function updateIncomeById(id, payload) {
  const sql = `UPDATE \`${TABLE}\` SET
    sNo = ?, date = ?, grp = ?, category = ?, person = ?, auth_mode = ?, cheque_details = ?,
    detail = ?, bill_no = ?, income_amount = ?, expense_amount = ?, suspense_amount = ?,
    created_by = ?, status = ?
    WHERE id = ?`;

  const params = [
    payload.sNo || null,
    payload.date || null,
    payload.grp || null,
    payload.category || null,
    payload.person || null,
    payload.auth_mode || null,
    payload.cheque_details || null,
    payload.detail || null,
    payload.bill_no || null,
    toDecimal(payload.income_amount),
    toDecimal(payload.expense_amount),
    toDecimal(payload.suspense_amount),
    payload.created_by || null,
    payload.status || 'Active',
    id
  ];

  const [result] = await pool.execute(sql, params);
  // mysql2's execute result may not include changedRows when using some configs;
  // return what we have.
  return { affectedRows: result.affectedRows, changedRows: result.changedRows ?? 0 };
}

/**
 * deleteIncomeById(id)
 */
export async function deleteIncomeById(id) {
  const [result] = await pool.execute('DELETE FROM `IncomeExpenses` WHERE id = ?', [id]);
  return { affectedRows: result.affectedRows };
}

/**
 * getNextSNo(prefix = '') -> string
 */
export async function getNextSNo(prefix = '') {
  const sql = `SELECT MAX(CAST(sNo AS UNSIGNED)) AS max_sno FROM IncomeExpenses`;
  const [rows] = await pool.execute(sql);
  const row = Array.isArray(rows) && rows.length ? rows[0] : null;
  const max = row && row.max_sno ? Number(row.max_sno) : 0;
  const next = max + 1;
  return prefix ? `${prefix}${next}` : String(next);
}

// ---------- Controller handlers (use merged model functions) ----------
/* create */
export const createIncome = async (req, res) => {
  try {
    if (validationResult) {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    }

    const payload = req.body || {};
    if (!payload.date || !payload.grp || !payload.category || !payload.person) {
      return res.status(400).json({ success: false, error: 'date, grp (group), category and person are required' });
    }
    if (!(payload.income_amount || payload.expense_amount || payload.suspense_amount)) {
      return res.status(400).json({ success: false, error: 'One of income_amount / expense_amount / suspense_amount is required' });
    }

    if (!payload.sNo) {
      payload.sNo = await getNextSNo();
    }

    const result = await createIncomeModel(payload);

    if (global && global.io && typeof global.io.emit === 'function') {
      global.io.emit('income:new', { id: result.insertId, ...payload });
    }

    return res.status(201).json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('createIncome controller error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

/* list */
export const listIncomes = async (req, res) => {
  try {
    const q = req.query || {};
    const opts = {
      from: q.from,
      to: q.to,
      group: q.group,
      grp: q.grp,
      category: q.category,
      person: q.person,
      search: q.search,
      limit: q.limit ? Number(q.limit) : undefined,
      offset: q.offset ? Number(q.offset) : undefined
    };

    if (!opts.grp && opts.group) opts.grp = opts.group;

    const rows = await listIncomesModel(opts);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('listIncomes controller error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

/* get one */
export const getIncome = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, error: 'Invalid id' });

    const row = await getIncomeById(id);
    if (!row) return res.status(404).json({ success: false, error: 'Not found' });

    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('getIncome controller error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

/* update */
export const updateIncome = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, error: 'Invalid id' });

    const payload = req.body || {};
    const result = await updateIncomeById(id, payload);
    if (!result || result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Not found' });

    if (global && global.io && typeof global.io.emit === 'function') {
      global.io.emit('income:updated', { id, ...payload });
    }

    return res.json({ success: true, affectedRows: result.affectedRows, changedRows: result.changedRows });
  } catch (err) {
    console.error('updateIncome controller error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

/* delete */
export const deleteIncome = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, error: 'Invalid id' });

    const result = await deleteIncomeById(id);
    if (!result || result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Not found' });

    if (global && global.io && typeof global.io.emit === 'function') {
      global.io.emit('income:deleted', { id });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('deleteIncome controller error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};
