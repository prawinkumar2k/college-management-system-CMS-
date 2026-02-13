// server/controllers/assets.controller.js
import { validationResult } from 'express-validator';
import pool from '../db.js';

// -----------------------------
// Helpers
// -----------------------------
const devError = (err) => {
  return process.env.NODE_ENV === 'production'
    ? { message: err.message }
    : { message: err.message, stack: err.stack, code: err.code || null };
};

const ensurePool = () => {
  if (!pool) throw new Error('Database pool is not defined (check server/db.js export).');
  if (typeof pool.execute !== 'function') throw new Error('Database pool does not expose execute(); use mysql2/promise or adjust calls.');
};

function ensureNumber(n, fallback = 0) {
  const num = Number(n);
  return Number.isFinite(num) ? num : fallback;
}

const normalizeString = (val) => {
  if (val == null) return undefined;
  const s = String(val).trim();
  return s === '' ? undefined : s;
};

function camelToSnake(key) {
  return key.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
}

function generateAssetId() {
  return 'ASSET-' + Date.now().toString().slice(-8);
}

// -----------------------------
// DB functions (merged model)
// -----------------------------
const TABLE = 'Assets';

// Create
export const createAsset = async (data) => {
  try {
    ensurePool();

    const assetId = data.asset_id ?? data.assetId ?? generateAssetId();

    const sql = `
      INSERT INTO \`${TABLE}\`
      (asset_id, date, assets, location, description, \`condition\`, qty, rate, amount, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    

    const qty = ensureNumber(data.qty, 0);
    const rate = ensureNumber(data.rate, 0);
    // if amount explicitly provided and is finite use it, else compute
    const amount = (data.amount !== undefined && Number.isFinite(Number(data.amount)))
      ? Number(data.amount)
      : qty * rate;

    const params = [
      assetId,
      data.date ?? null,
      data.assets ?? null,
      data.location ?? null,
      data.description ?? null,
      data.condition ?? null,
      qty,
      rate,
      amount,
      data.status ?? 'Active'
    ];

    // param count sanity (10 placeholders)
    if (!Array.isArray(params) || params.length !== 10) {
      throw new Error(`createAsset SQL param length mismatch. Expected 10, got ${params.length}`);
    }

    console.info('createAsset SQL:', sql);
    console.info('createAsset params:', params);

    const [result] = await pool.execute(sql, params);
    return await getAssetById(result.insertId);
  } catch (err) {
    console.error('createAsset DB error:', err && err.stack ? err.stack : err);
    throw err;
  }
};

// List with pagination
export const getAllAssets = async ({ limit = 100, offset = 0 } = {}) => {
  try {
    ensurePool();

    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : 100;
    const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Math.floor(Number(offset))) : 0;

    // embed safe numeric values directly into the SQL to avoid driver issues
    // with binding LIMIT/OFFSET placeholders in some mysql2 versions.
    const sql = `SELECT * FROM \`${TABLE}\` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    console.info('getAllAssets SQL:', sql);

    const [rows] = await pool.execute(sql);
    return rows;
  } catch (err) {
    console.error('getAllAssets DB error:', err && err.stack ? err.stack : err);
    throw err;
  }
};

// Get single
export const getAssetById = async (id) => {
  try {
    ensurePool();
    const sql = `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
  } catch (err) {
    console.error('getAssetById DB error:', err && err.stack ? err.stack : err);
    throw err;
  }
};

// Update
export const updateAsset = async (id, data) => {
  try {
    ensurePool();

    // map allowed incoming keys -> DB columns
    const allowed = {
      date: 'date',
      assets: 'assets',
      location: 'location',
      description: 'description',
      condition: 'condition',
      qty: 'qty',
      rate: 'rate',
      amount: 'amount',
      status: 'status',
      createdBy: 'created_by',
      assetId: 'asset_id',
      asset_id: 'asset_id'
    };

    const sets = [];
    const params = [];

    for (const [key, val] of Object.entries(data)) {
      if (!Object.prototype.hasOwnProperty.call(allowed, key)) continue;
      const col = allowed[key];

      if (['qty', 'rate', 'amount'].includes(col)) {
        const num = (val !== '' && val != null) ? Number(val) : null;
        sets.push(`\`${col}\` = ?`);
        params.push(num !== null && Number.isFinite(num) ? num : null);
      } else {
        sets.push(`\`${col}\` = ?`);
        params.push(val != null && val !== '' ? val : null);
      }
    }

    if (sets.length === 0) return 0;

    params.push(id);
    const sql = `
      UPDATE \`${TABLE}\`
      SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    console.info('updateAsset SQL:', sql);
    console.info('updateAsset params:', params);

    const [result] = await pool.execute(sql, params);
    return result.affectedRows || 0;
  } catch (err) {
    console.error('updateAsset DB error:', err && err.stack ? err.stack : err);
    throw err;
  }
};

// Delete
export const deleteAsset = async (id) => {
  try {
    ensurePool();
    const sql = `DELETE FROM \`${TABLE}\` WHERE id = ?`;
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows || 0;
  } catch (err) {
    console.error('deleteAsset DB error:', err && err.stack ? err.stack : err);
    throw err;
  }
};

// -----------------------------
// Express handlers (controllers)
// -----------------------------

export const createAssetHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, message: 'Request body missing or invalid JSON. Did you add express.json()?' });
    }

    const assetData = {
      date: normalizeString(req.body.date) ?? null,
      assets: normalizeString(req.body.assets) ?? null,
      location: normalizeString(req.body.location) ?? null,
      description: normalizeString(req.body.description) ?? null,
      condition: normalizeString(req.body.condition) ?? null,
      qty: req.body.qty !== undefined ? req.body.qty : undefined,
      rate: req.body.rate !== undefined ? req.body.rate : undefined,
      amount: req.body.amount !== undefined ? req.body.amount : undefined,
      status: normalizeString(req.body.status) ?? 'Active',
      createdBy: req.body.createdBy ?? null
    };

    const result = await createAsset(assetData);
    return res.status(201).json({ success: true, message: 'Asset created', data: result });
  } catch (err) {
    console.error('createAssetHandler error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const getAssetsHandler = async (req, res) => {
  try {
    let limit = Number(req.query.limit ?? 100);
    let offset = Number(req.query.offset ?? 0);
    if (!Number.isFinite(limit) || limit < 0) limit = 100;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;

    const rows = await getAllAssets({ limit, offset });
    return res.json({ success: true, data: rows, meta: { limit, offset } });
  } catch (err) {
    console.error('getAssetsHandler error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const getAssetHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid id' });

    const row = await getAssetById(id);
    if (!row) return res.status(404).json({ success: false, message: 'Asset not found' });

    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('getAssetHandler error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const updateAssetHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid id' });

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ success: false, message: 'Request body missing or invalid JSON. Did you add express.json()?' });
    }

    const affected = await updateAsset(id, req.body);
    if (!affected) return res.status(404).json({ success: false, message: 'Asset not found or no changes' });

    const updated = await getAssetById(id);
    return res.json({ success: true, message: 'Asset updated', data: updated });
  } catch (err) {
    console.error('updateAssetHandler error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const deleteAssetHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid id' });

    const affected = await deleteAsset(id);
    if (!affected) return res.status(404).json({ success: false, message: 'Asset not found' });

    return res.json({ success: true, message: 'Asset deleted' });
  } catch (err) {
    console.error('deleteAssetHandler error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};
