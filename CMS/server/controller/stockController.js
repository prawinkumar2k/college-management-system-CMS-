// server/controllers/stock.controller.js
import fs from 'fs';
import path from 'path';
import pool from '../db.js';
import { validationResult } from 'express-validator';

// -----------------------------
// Config & helpers
// -----------------------------

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'stock', 'scans');
// demo local preview you provided earlier (will be returned if no scan_image present)
const DEMO_PREVIEW_LOCAL = '/mnt/data/e0a6cee1-09c7-4b51-8528-7c1e715f9d07.png';

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const parseNumber = (val, fallback = 0) => {
  if (val == null || val === '') return fallback;
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeString = (val) => {
  if (val == null) return undefined;
  const s = String(val).trim();
  return s === '' ? undefined : s;
};

const devError = (err) => {
  return process.env.NODE_ENV === 'production'
    ? { message: err.message }
    : { message: err.message, stack: err.stack };
};

function camelToSnake(key) {
  return key.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
}

function generateStockId() {
  return 'STK' + Date.now().toString().slice(-8);
}

// -----------------------------
// DB functions
// -----------------------------

export const createStock = async (stock, scanImagePath = null) => {
  try {
    const sql = `INSERT INTO stock_entries
      (stock_id, \`date\`, code, product_name, brand_name, rate, qty, scale, total_value, scan_image, created_by, updated_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

    const rateNum = stock.rate != null ? Number(stock.rate) : 0;
    const qtyNum = stock.qty != null ? Number(stock.qty) : 0;
    const totalValue = stock.totalValue != null
      ? Number(stock.totalValue)
      : (Number.isFinite(rateNum) && Number.isFinite(qtyNum) ? rateNum * qtyNum : 0);

    const params = [
      stock.stockId ?? null,
      stock.date ?? null,
      stock.code ?? null,
      stock.productName ?? null,
      stock.brandName ?? null,
      Number.isFinite(rateNum) ? rateNum : 0,
      Number.isFinite(qtyNum) ? qtyNum : 0,
      stock.scale ?? 'Bundle',
      Number.isFinite(totalValue) ? totalValue : 0,
      scanImagePath ?? null,
      stock.createdBy ?? null,
      stock.updatedBy ?? null
    ];

    const [result] = await pool.execute(sql, params);
    return await getStockById(result.insertId);
  } catch (err) {
    console.error('createStock DB error:', err);
    throw err;
  }
};

export const getAllStocks = async ({
  limit = 50,
  offset = 0,
  productName,
  brandName,
  dateFrom,
  dateTo,
  search
} = {}) => {
  try {
    const where = [];
    const params = [];

    if (productName) { where.push('product_name LIKE ?'); params.push(`%${productName}%`); }
    if (brandName)  { where.push('brand_name LIKE ?');  params.push(`%${brandName}%`); }
    if (dateFrom)   { where.push('`date` >= ?');          params.push(dateFrom); }
    if (dateTo)     { where.push('`date` <= ?');          params.push(dateTo); }

    if (search) {
      where.push('(product_name LIKE ? OR brand_name LIKE ? OR code LIKE ? OR stock_id LIKE ?)');
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Number(limit)) : 50;
    const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Number(offset)) : 0;

    const sql = `SELECT * FROM stock_entries ${whereSql} ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    console.info('getAllStocks SQL:', sql);
    console.info('getAllStocks params:', params);

    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('getAllStocks DB error:', err);
    throw err;
  }
};

export const getStockById = async (id) => {
  try {
    const sql = `SELECT * FROM stock_entries WHERE id = ? LIMIT 1`;
    const [rows] = await pool.execute(sql, [id]);
    return rows[0] || null;
  } catch (err) {
    console.error('getStockById DB error:', err);
    throw err;
  }
};

export const updateStock = async (id, stock, scanImagePath = null) => {
  try {
    const allowed = ['stock_id','date','code','product_name','brand_name','rate','qty','scale','total_value','scan_image','created_by','updated_by','status'];
    const sets = [];
    const params = [];

    for (const [k,v] of Object.entries(stock)) {
      const col = camelToSnake(k);
      if (!allowed.includes(col)) continue;

      if (['rate','qty','total_value'].includes(col)) {
        const num = (v !== '' && v != null) ? Number(v) : null;
        sets.push(`\`${col}\` = ?`);
        params.push(num !== null && Number.isFinite(num) ? num : null);
      } else {
        sets.push(`\`${col}\` = ?`);
        params.push(v != null && v !== '' ? v : null);
      }
    }

    // attach scan image if provided
    if (scanImagePath) {
      sets.push('`scan_image` = ?');
      params.push(scanImagePath);
    }

    if (!sets.length) return 0;

    params.push(id);
    const sql = `UPDATE stock_entries SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    console.info('updateStock SQL:', sql);
    console.info('updateStock params:', params);

    const [result] = await pool.execute(sql, params);
    return result.affectedRows || 0;
  } catch (err) {
    console.error('updateStock DB error:', err);
    throw err;
  }
};

export const deleteStock = async (id) => {
  try {
    const sql = `DELETE FROM stock_entries WHERE id = ?`;
    const [result] = await pool.execute(sql, [id]);
    return result.affectedRows || 0;
  } catch (err) {
    console.error('deleteStock DB error:', err);
    throw err;
  }
};

// -----------------------------
// Express handlers
// -----------------------------

export const createStockHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    // handle multipart/form-data file if present (Multer sets req.file)
    let scanImagePath = null;
    if (req.file) {
      // store relative path for public serving, e.g. /uploads/stock/scans/filename.png
      scanImagePath = `/uploads/stock/scans/${req.file.filename}`;
    }

    // sanitize & coerce numeric values
    const rate = parseNumber(req.body.rate, 0);
    const qty = parseNumber(req.body.qty, 0);
    const totalValueProvided =
      req.body.totalValue != null && req.body.totalValue !== '' ? parseNumber(req.body.totalValue, null) : null;

    const payload = {
      stockId: normalizeString(req.body.stockId) || generateStockId(),
      date: normalizeString(req.body.date) || null,
      code: normalizeString(req.body.code) || null,
      productName: normalizeString(req.body.productName) || null,
      brandName: normalizeString(req.body.brandName) || null,
      rate,
      qty,
      scale: normalizeString(req.body.scale) || 'Bundle',
      totalValue: totalValueProvided != null ? totalValueProvided : (rate * qty),
      createdBy: req.body.createdBy ? Number(req.body.createdBy) : null,
      updatedBy: req.body.updatedBy ? Number(req.body.updatedBy) : null,
      status: normalizeString(req.body.status) || 'Active'
    };

    const stock = await createStock(payload, scanImagePath);
    return res.status(201).json({ success: true, message: 'Stock created', data: stock });
  } catch (err) {
    console.error('createStockHandler error:', err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const listStocksHandler = async (req, res) => {
  try {
    let limit = parseInt(req.query.limit ?? 50, 10);
    let offset = parseInt(req.query.offset ?? 0, 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 50;
    if (!Number.isFinite(offset) || offset < 0) offset = 0;
    limit = Math.min(200, limit);

    const filters = {
      limit,
      offset,
      productName: normalizeString(req.query.productName),
      brandName: normalizeString(req.query.brandName),
      dateFrom: normalizeString(req.query.dateFrom),
      dateTo: normalizeString(req.query.dateTo),
      search: normalizeString(req.query.search)
    };

    const rows = await getAllStocks(filters);
    const data = Array.isArray(rows) ? rows : [];
    return res.json({ success: true, data, meta: { limit, offset } });
  } catch (err) {
    console.error('listStocksHandler error:', err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const getStockHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid stock id' });

    const row = await getStockById(id);
    if (!row) return res.status(404).json({ success: false, message: 'Stock not found' });

    // if scan_image missing, for demo return local preview you uploaded
    if (!row.scan_image) row.scan_image = DEMO_PREVIEW_LOCAL;

    return res.json({ success: true, data: row });
  } catch (err) {
    console.error('getStockHandler error:', err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const updateStockHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid stock id' });

    // sanitize numeric fields in incoming body
    const body = { ...req.body };
    if ('rate' in body) body.rate = body.rate === '' ? null : parseNumber(body.rate, null);
    if ('qty' in body) body.qty = body.qty === '' ? null : parseNumber(body.qty, null);
    if ('totalValue' in body) body.totalValue = body.totalValue === '' ? null : parseNumber(body.totalValue, null);

    // normalize string fields
    if ('productName' in body) body.productName = normalizeString(body.productName);
    if ('brandName' in body) body.brandName = normalizeString(body.brandName);
    if ('code' in body) body.code = normalizeString(body.code);
    if ('scale' in body) body.scale = normalizeString(body.scale);
    if ('status' in body) body.status = normalizeString(body.status);

    // handle file if present
    let scanImagePath = null;
    if (req.file) {
      scanImagePath = `/uploads/stock/scans/${req.file.filename}`;
    }

    const affected = await updateStock(id, body, scanImagePath);
    if (!affected) return res.status(404).json({ success: false, message: 'Stock not found or nothing changed' });
    return res.json({ success: true, message: 'Stock updated' });
  } catch (err) {
    console.error('updateStockHandler error:', err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const deleteStockHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ success: false, message: 'Invalid stock id' });

    const affected = await deleteStock(id);
    if (!affected) return res.status(404).json({ success: false, message: 'Stock not found' });
    return res.json({ success: true, message: 'Stock deleted' });
  } catch (err) {
    console.error('deleteStockHandler error:', err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

// -----------------------------
// Extra endpoints: scan lookup & reports
// -----------------------------

export const scanLookupHandler = async (req, res) => {
  try {
    const barcode = normalizeString(req.body.barcode || req.body.code);
    if (!barcode) return res.status(400).json({ success: false, message: 'Missing barcode' });

    const sql = `SELECT id, stock_id, code, product_name, brand_name, rate, qty as default_qty, scale, scan_image FROM stock_entries WHERE code = ? OR stock_id = ? ORDER BY id DESC LIMIT 1`;
    const [rows] = await pool.execute(sql, [barcode, barcode]);
    if (!rows || rows.length === 0) {
      return res.json({ success: false, found: false, message: 'Product not found' });
    }
    const product = rows[0];
    if (!product.scan_image) product.scan_image = DEMO_PREVIEW_LOCAL;
    return res.json({ success: true, found: true, autoFill: product });
  } catch (err) {
    console.error('scanLookupHandler error:', err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const dailyReportHandler = async (req, res) => {
  try {
    const sql = `
      SELECT product_name, SUM(qty) AS total_added, SUM(rate * qty) AS total_value
      FROM stock_entries
      WHERE DATE(\`date\`) = CURDATE()
      GROUP BY product_name
      ORDER BY total_added DESC
    `;
    const [rows] = await pool.execute(sql);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('dailyReportHandler error:', err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};

export const monthlyReportHandler = async (req, res) => {
  try {
    const sql = `
      SELECT product_name, SUM(qty) AS total_added, SUM(rate * qty) AS total_value
      FROM stock_entries
      WHERE MONTH(\`date\`) = MONTH(CURRENT_DATE()) AND YEAR(\`date\`) = YEAR(CURRENT_DATE())
      GROUP BY product_name
      ORDER BY total_value DESC
    `;
    const [rows] = await pool.execute(sql);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('monthlyReportHandler error:', err);
    return res.status(500).json({ success: false, ...devError(err) });
  }
};
