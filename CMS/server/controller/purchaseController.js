// server/controllers/purchase.controller.js
import pool from '../db.js';
import { validationResult } from 'express-validator';

const TABLE = 'purchases';

/* -----------------------
   Low-level DB helpers (previously in models)
   ----------------------- */

function camelToSnake(key) {
  // convert camelCase to snake_case
  return key.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toLowerCase();
}

function ensureNumber(n, fallback = null) {
  if (n === '' || n == null) return fallback;
  const num = Number(n);
  return Number.isFinite(num) ? num : fallback;
}

async function createPurchaseDb(payload) {
  const sql = `INSERT INTO \`${TABLE}\`
    (purchase_id, date, product_name, brand_name, company_vendor, purchase_order_no,
     order_date, dc_no, bill_no, bill_date, qty, rate, vat_applied, tax_applied,
     total_amount, current_stock, total_stock, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;

  const params = [
    payload.purchaseId ?? null,
    payload.date ?? null,
    payload.productName ?? null,
    payload.brandName ?? null,
    payload.companyVendor ?? null,
    payload.purchaseOrderNo ?? null,
    payload.orderDate ?? null,
    payload.dcNo ?? null,
    payload.billNo ?? null,
    payload.billDate ?? null,
    payload.qty != null ? Number(payload.qty) : null,
    payload.rate != null ? Number(payload.rate) : null,
    payload.vatApplied ? 1 : 0,
    payload.taxApplied ? 1 : 0,
    payload.totalAmount != null ? Number(payload.totalAmount) : null,
    payload.currentStock != null ? Number(payload.currentStock) : null,
    payload.totalStock != null ? Number(payload.totalStock) : null
  ];

  const [result] = await pool.execute(sql, params);
  return await getPurchaseDb(result.insertId);
}

async function getAllPurchasesDb({ limit = 50, offset = 0 } = {}) {
  // sanitize and inline LIMIT/OFFSET to avoid mysql2 prepared-statement argument issues
  const safeLimit = Number.isFinite(Number(limit)) ? Math.max(0, Math.floor(Number(limit))) : 50;
  const safeOffset = Number.isFinite(Number(offset)) ? Math.max(0, Math.floor(Number(offset))) : 0;

  const sql = `SELECT * FROM \`${TABLE}\` ORDER BY created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`;
  const [rows] = await pool.execute(sql);
  return rows;
}

async function getPurchaseDb(id) {
  const sql = `SELECT * FROM \`${TABLE}\` WHERE id = ? LIMIT 1`;
  const [rows] = await pool.execute(sql, [id]);
  return rows[0] || null;
}

async function updatePurchaseDb(id, payload) {
  const allowed = [
    'purchase_id', 'date', 'product_name', 'brand_name', 'company_vendor', 'purchase_order_no',
    'order_date', 'dc_no', 'bill_no', 'bill_date', 'qty', 'rate', 'vat_applied', 'tax_applied',
    'total_amount', 'current_stock', 'total_stock'
  ];

  const sets = [];
  const params = [];

  for (const [k, v] of Object.entries(payload)) {
    const col = camelToSnake(k);
    if (!allowed.includes(col)) continue;

    if (col === 'vat_applied' || col === 'tax_applied') {
      sets.push(`\`${col}\` = ?`);
      params.push(v ? 1 : 0);
    } else if (col === 'qty' || col === 'rate' || col === 'total_amount' || col === 'current_stock' || col === 'total_stock') {
      // numeric columns
      const num = (v !== '' && v != null) ? Number(v) : null;
      sets.push(`\`${col}\` = ?`);
      params.push(num !== null && Number.isFinite(num) ? num : null);
    } else {
      sets.push(`\`${col}\` = ?`);
      params.push(v != null && v !== '' ? v : null);
    }
  }

  if (sets.length === 0) {
    return 0;
  }

  params.push(id);
  const sql = `UPDATE \`${TABLE}\` SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
  const [result] = await pool.execute(sql, params);
  return result.affectedRows || 0;
}

async function deletePurchaseDb(id) {
  const sql = `DELETE FROM \`${TABLE}\` WHERE id = ?`;
  const [result] = await pool.execute(sql, [id]);
  return result.affectedRows || 0;
}

/* -----------------------
   Controller helpers (same as before)
   ----------------------- */

const devError = (err) => (process.env.NODE_ENV === 'production' ? { message: err.message } : { message: err.message, stack: err.stack });

/* -----------------------
   Exported HTTP handlers (same names your routes expect)
   ----------------------- */

export const createPurchaseHandler = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const payload = {
      purchaseId: req.body.purchaseId || generatePurchaseId(),
      date: req.body.date || null,
      productName: req.body.productName ?? null,
      brandName: req.body.brandName ?? null,
      companyVendor: req.body.companyVendor ?? null,
      purchaseOrderNo: req.body.purchaseOrderNo ?? null,
      orderDate: req.body.orderDate ?? null,
      dcNo: req.body.dcNo ?? null,
      billNo: req.body.billNo ?? null,
      billDate: req.body.billDate ?? null,
      qty: ensureNumber(req.body.qty, 0),
      rate: ensureNumber(req.body.rate, 0),
      vatApplied: req.body.vatApplied ? 1 : 0,
      taxApplied: req.body.taxApplied ? 1 : 0,
      totalAmount: req.body.totalAmount != null ? ensureNumber(req.body.totalAmount, ensureNumber(req.body.rate, 0) * ensureNumber(req.body.qty, 0)) : ensureNumber(req.body.rate, 0) * ensureNumber(req.body.qty, 0),
      currentStock: req.body.currentStock != null ? ensureNumber(req.body.currentStock, null) : null,
      totalStock: req.body.totalStock != null ? ensureNumber(req.body.totalStock, null) : null
    };

    const purchase = await createPurchaseDb(payload);
    return res.status(201).json({ message: 'Purchase created', data: purchase });
  } catch (err) {
    console.error('createPurchaseHandler error:', err);
    return res.status(500).json({ message: 'Failed to create purchase', error: err.message, ...devError(err) });
  }
};

export const listPurchasesHandler = async (req, res) => {
  try {
    let limit = Number.isFinite(Number(req.query.limit)) ? Math.max(0, Math.floor(Number(req.query.limit))) : 50;
    let offset = Number.isFinite(Number(req.query.offset)) ? Math.max(0, Math.floor(Number(req.query.offset))) : 0;
    limit = Math.min(100, limit);

    const rows = await getAllPurchasesDb({ limit, offset });
    return res.json({ data: rows, meta: { limit, offset } });
  } catch (err) {
    console.error('listPurchasesHandler error:', err);
    return res.status(500).json({ message: 'Failed to fetch purchases', error: err.message, ...devError(err) });
  }
};

export const getPurchaseHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' });

    const row = await getPurchaseDb(id);
    if (!row) return res.status(404).json({ message: 'Purchase not found' });

    return res.json({ data: row });
  } catch (err) {
    console.error('getPurchaseHandler error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message, ...devError(err) });
  }
};

export const updatePurchaseHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' });

    const existing = await getPurchaseDb(id);
    if (!existing) return res.status(404).json({ message: 'Purchase not found' });

    const payload = {
      ...(req.body.purchaseId !== undefined && { purchaseId: req.body.purchaseId }),
      ...(req.body.date !== undefined && { date: req.body.date }),
      ...(req.body.productName !== undefined && { productName: req.body.productName }),
      ...(req.body.brandName !== undefined && { brandName: req.body.brandName }),
      ...(req.body.companyVendor !== undefined && { companyVendor: req.body.companyVendor }),
      ...(req.body.purchaseOrderNo !== undefined && { purchaseOrderNo: req.body.purchaseOrderNo }),
      ...(req.body.orderDate !== undefined && { orderDate: req.body.orderDate }),
      ...(req.body.dcNo !== undefined && { dcNo: req.body.dcNo }),
      ...(req.body.billNo !== undefined && { billNo: req.body.billNo }),
      ...(req.body.billDate !== undefined && { billDate: req.body.billDate }),
      ...(req.body.qty !== undefined && { qty: ensureNumber(req.body.qty, null) }),
      ...(req.body.rate !== undefined && { rate: ensureNumber(req.body.rate, null) }),
      ...(req.body.vatApplied !== undefined && { vatApplied: req.body.vatApplied ? 1 : 0 }),
      ...(req.body.taxApplied !== undefined && { taxApplied: req.body.taxApplied ? 1 : 0 }),
      ...(req.body.totalAmount !== undefined && { totalAmount: ensureNumber(req.body.totalAmount, null) }),
      ...(req.body.currentStock !== undefined && { currentStock: ensureNumber(req.body.currentStock, null) }),
      ...(req.body.totalStock !== undefined && { totalStock: ensureNumber(req.body.totalStock, null) })
    };

    const affected = await updatePurchaseDb(id, payload);
    if (!affected) return res.status(404).json({ message: 'Purchase not found or nothing changed' });

    const updated = await getPurchaseDb(id);
    return res.json({ message: 'Purchase updated', data: updated });
  } catch (err) {
    console.error('updatePurchaseHandler error:', err);
    return res.status(500).json({ message: 'Failed to update purchase', error: err.message, ...devError(err) });
  }
};

export const deletePurchaseHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' });

    const affected = await deletePurchaseDb(id);
    if (!affected) return res.status(404).json({ message: 'Purchase not found' });

    return res.json({ message: 'Purchase deleted' });
  } catch (err) {
    console.error('deletePurchaseHandler error:', err);
    return res.status(500).json({ message: 'Failed to delete purchase', error: err.message, ...devError(err) });
  }
};

function generatePurchaseId() {
  return 'PUR' + Date.now().toString().slice(-8);
}
