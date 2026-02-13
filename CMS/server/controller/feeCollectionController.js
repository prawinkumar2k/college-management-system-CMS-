// controllers/feeCollection.controller.js
import pool from '../db.js';

/**
 * Create a new fee record
 */
export const create = async (req, res) => {
  try {
    const {
      reg_no, application_no, roll_no, name, department, class: classVal,
      section, fee_types, total_amount, paid_amount, pending_amount,
      last_payment_date, status, payment_mode, branch_sec, seat_no, allocated_quota
    } = req.body;

    const sql = `INSERT INTO Fee_Collection
      (reg_no, application_no, roll_no, name, department, class, section, fee_types,
       total_amount, paid_amount, pending_amount, last_payment_date, status, payment_mode,
       branch_sec, seat_no, allocated_quota)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const params = [
      reg_no, application_no, roll_no, name, department, classVal,
      section, fee_types, total_amount, paid_amount, pending_amount,
      last_payment_date, status, payment_mode, branch_sec, seat_no, allocated_quota
    ];

    const [result] = await pool.query(sql, params);
    const insertedId = result.insertId;
    const [rows] = await pool.query("SELECT * FROM Fee_Collection WHERE id = ?", [insertedId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("create error:", err);
    res.status(500).json({ success: false, error: "Failed to create fee record" });
  }
};

/**
 * Get list with optional filters, pagination & sorting
 * Query params supported:
 *  - search (reg_no or name), status, department, class, section, fromDate, toDate,
 *  - page, limit, sortBy, sortDir
 */
export const list = async (req, res) => {
  try {
    const {
      search, status, department, class: classVal, section,
      fromDate, toDate, page = 1, limit = 50, sortBy = "id", sortDir = "DESC"
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // Base query
    let sql = "SELECT * FROM Fee_Collection WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (name LIKE ? OR reg_no LIKE ? OR roll_no LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (department) {
      sql += " AND department = ?";
      params.push(department);
    }
    if (classVal) {
      sql += " AND class = ?";
      params.push(classVal);
    }
    if (section) {
      sql += " AND section = ?";
      params.push(section);
    }
    // NOTE: last_payment_date stored as VARCHAR per schema — date comparisons with strings may be unreliable.
    if (fromDate) {
      sql += " AND (last_payment_date = '' OR last_payment_date >= ?)";
      params.push(fromDate);
    }
    if (toDate) {
      sql += " AND (last_payment_date = '' OR last_payment_date <= ?)";
      params.push(toDate);
    }

    // Total count for pagination
    const countSql = sql.replace(/^SELECT \* FROM/, "SELECT COUNT(*) as total FROM");
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total || 0;

    // Append ordering & pagination
    const allowedSortColumns = ["id","name","reg_no","department","class","status","last_payment_date"];
    const orderCol = allowedSortColumns.includes(sortBy) ? sortBy : "id";
    const dir = sortDir.toUpperCase() === "ASC" ? "ASC" : "DESC";

    sql += ` ORDER BY ${orderCol} ${dir} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);
    res.json({
      success: true,
      data: rows,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (err) {
    console.error("list error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch fee records" });
  }
};

/**
 * Get a single record by id
 */
export const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query("SELECT * FROM Fee_Collection WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: "Record not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("getOne error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch record" });
  }
};

/**
 * Update a record by id
 */
export const updateOne = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      reg_no, application_no, roll_no, name, department, class: classVal,
      section, fee_types, total_amount, paid_amount, pending_amount,
      last_payment_date, status, payment_mode, branch_sec, seat_no, allocated_quota
    } = req.body;

    const sql = `UPDATE Fee_Collection SET
      reg_no = ?, application_no = ?, roll_no = ?, name = ?, department = ?, class = ?, section = ?, fee_types = ?,
      total_amount = ?, paid_amount = ?, pending_amount = ?, last_payment_date = ?, status = ?, payment_mode = ?,
      branch_sec = ?, seat_no = ?, allocated_quota = ?
      WHERE id = ?`;

    const params = [
      reg_no, application_no, roll_no, name, department, classVal,
      section, fee_types, total_amount, paid_amount, pending_amount,
      last_payment_date, status, payment_mode, branch_sec, seat_no, allocated_quota, id
    ];

    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: "Record not found" });

    const [rows] = await pool.query("SELECT * FROM Fee_Collection WHERE id = ?", [id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("updateOne error:", err);
    res.status(500).json({ success: false, error: "Failed to update record" });
  }
};

/**
 * Delete a record by id
 */
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query("DELETE FROM Fee_Collection WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: "Record not found" });
    res.json({ success: true, message: "Record deleted" });
  } catch (err) {
    console.error("remove error:", err);
    res.status(500).json({ success: false, error: "Failed to delete record" });
  }
};
