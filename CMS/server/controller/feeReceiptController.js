// controllers/feeReceipt.controller.js
import pool from "../db.js";

/**
 * Sum pay_now for a given roll_no + fee_type
 * (used to compute cumulative paid and pending amounts)
 */
async function sumPayments(rollNo, feeType, excludeId = null) {
  if (!rollNo || !feeType) return 0;

  let sql = `
    SELECT IFNULL(SUM(pay_now), 0) AS s
    FROM fee_recipt
    WHERE roll_no = ? AND fee_type = ?
  `;
  const params = [rollNo, feeType];

  if (excludeId) {
    sql += " AND id != ?";
    params.push(excludeId);
  }

  const [rows] = await pool.query(sql, params);
  const s = rows && rows[0] ? Number(rows[0].s) : 0;
  return Math.round(s * 100) / 100;
}

/**
 * Create new payment row.
 * - Computes paid_amount, pending_amount, status on server
 * - Returns inserted row
 */
export const create = async (req, res) => {
  try {
    const {
      date,
      department,
      sem,
      fee_type,
      roll_no,
      student_name,
      total_amount = 0,
      pay_now = 0,
      security_code = "",
      academic = "",
      remarks = "",
      payment_mode = "",
      reference_no = "",
      application_no = null,
    } = req.body;

    if (!roll_no || !fee_type) {
      return res
        .status(400)
        .json({ success: false, message: "roll_no and fee_type required" });
    }

    const totalNum = Number(total_amount) || 0;
    const payNowNum = Number(pay_now) || 0;

    // Sum previous payments for this roll_no + fee_type
    const prevSum = await sumPayments(roll_no, fee_type, null);

    const paidTotal = Math.round((prevSum + payNowNum) * 100) / 100;
    const pending = Math.max(
      0,
      Math.round((totalNum - paidTotal) * 100) / 100
    );
    const status =
      paidTotal === 0 ? "Unpaid" : pending === 0 ? "Paid" : "Partially Paid";

    // Insert row into fee_recipt
    const insertSql = `
      INSERT INTO fee_recipt (
        date,
        department,
        sem,
        fee_type,
        roll_no,
        application_no,
        student_name,
        total_amount,
        pay_now,
        paid_amount,
        pending_amount,
        status,
        security_code,
        remarks,
        academic,
        payment_mode,
        reference_no
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      date || null,
      department || null,
      sem || null,
      fee_type,
      roll_no,
      application_no || null,
      student_name || null,
      totalNum,
      payNowNum,
      paidTotal,
      pending,
      status,
      security_code || null,
      remarks || null,
      academic || null,
      payment_mode || null,
      reference_no || null,
    ];

    const [result] = await pool.query(insertSql, params);
    const [rows] = await pool.query(
      "SELECT * FROM fee_recipt WHERE id = ?",
      [result.insertId]
    );

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("create error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create payment" });
  }
};

/**
 * List rows with filters
 * - supports rollNo, applicationNo, feeType, status, fromDate, toDate, search
 * - supports pagination & sorting
 * - used by your front-end & fetchPaidSoFar (GET /api/fee-receipt?...).
 */
export const list = async (req, res) => {
  try {
    const {
      rollNo,
      applicationNo,
      feeType,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 100,
      sortBy = "id",
      sortDir = "DESC",
      search,
    } = req.query;

    let sql = "SELECT * FROM fee_recipt WHERE 1=1";
    const params = [];

    if (rollNo) {
      sql += " AND roll_no = ?";
      params.push(rollNo);
    }

    if (applicationNo) {
      sql += " AND application_no = ?";
      params.push(applicationNo);
    }

    if (feeType) {
      sql += " AND fee_type = ?";
      params.push(feeType);
    }

    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }

    if (fromDate) {
      sql += " AND date >= ?";
      params.push(fromDate);
    }

    if (toDate) {
      sql += " AND date <= ?";
      params.push(toDate);
    }

    if (search) {
      sql += " AND (student_name LIKE ? OR roll_no LIKE ? OR application_no LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    // Get total count for pagination
    const countSql = sql.replace(
      /^SELECT \* FROM/,
      "SELECT COUNT(*) AS total FROM"
    );
    const [countRows] = await pool.query(countSql, params);
    const total =
      countRows && countRows[0] ? Number(countRows[0].total) : 0;

    const allowedSort = [
      "id",
      "date",
      "student_name",
      "roll_no",
      "application_no",
      "total_amount",
      "paid_amount",
      "pending_amount",
      "status",
    ];
    const orderCol = allowedSort.includes(sortBy) ? sortBy : "id";
    const dir =
      sortDir && sortDir.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` ORDER BY ${orderCol} ${dir} LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);

    return res.json({
      success: true,
      data: rows,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (err) {
    console.error("list error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch receipts" });
  }
};

/**
 * Get single row by id
 */
export const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM fee_recipt WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("getOne error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch" });
  }
};

/**
 * Update row and recompute cumulative sums for roll_no + fee_type.
 */
export const updateOne = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date,
      department,
      sem,
      fee_type,
      roll_no,
      application_no,
      student_name,
      total_amount,
      pay_now,
      security_code,
      academic,
      remarks,
      payment_mode,
      reference_no,
    } = req.body;

    const updateFields = [];
    const params = [];

    if (date !== undefined) {
      updateFields.push("date = ?");
      params.push(date || null);
    }
    if (department !== undefined) {
      updateFields.push("department = ?");
      params.push(department || null);
    }
    if (sem !== undefined) {
      updateFields.push("sem = ?");
      params.push(sem || null);
    }
    if (fee_type !== undefined) {
      updateFields.push("fee_type = ?");
      params.push(fee_type);
    }
    if (roll_no !== undefined) {
      updateFields.push("roll_no = ?");
      params.push(roll_no);
    }
    if (application_no !== undefined) {
      updateFields.push("application_no = ?");
      params.push(application_no || null);
    }
    if (student_name !== undefined) {
      updateFields.push("student_name = ?");
      params.push(student_name || null);
    }
    if (total_amount !== undefined) {
      updateFields.push("total_amount = ?");
      params.push(Number(total_amount) || 0);
    }
    if (pay_now !== undefined) {
      updateFields.push("pay_now = ?");
      params.push(Number(pay_now) || 0);
    }
    if (security_code !== undefined) {
      updateFields.push("security_code = ?");
      params.push(security_code || null);
    }
    if (academic !== undefined) {
      updateFields.push("academic = ?");
      params.push(academic || null);
    }
    if (remarks !== undefined) {
      updateFields.push("remarks = ?");
      params.push(remarks || null);
    }
    if (payment_mode !== undefined) {
      updateFields.push("payment_mode = ?");
      params.push(payment_mode || null);
    }
    if (reference_no !== undefined) {
      updateFields.push("reference_no = ?");
      params.push(reference_no || null);
    }

    if (updateFields.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    const sql = `
      UPDATE fee_recipt
      SET ${updateFields.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    params.push(id);

    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    // Recompute cumulative paid_amount & pending_amount for this roll_no + fee_type
    const [rowsAfter] = await pool.query(
      "SELECT * FROM fee_recipt WHERE id = ?",
      [id]
    );
    if (!rowsAfter.length) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to refetch" });
    }

    const updated = rowsAfter[0];
    const roll = updated.roll_no;
    const fee = updated.fee_type;
    const totalAmount = Number(updated.total_amount || 0);

    const [allRows] = await pool.query(
      "SELECT id, pay_now FROM fee_recipt WHERE roll_no = ? AND fee_type = ? ORDER BY id ASC",
      [roll, fee]
    );

    let running = 0;
    for (const r of allRows) {
      running = Math.round(
        (running + Number(r.pay_now || 0)) * 100
      ) / 100;
      const pending = Math.max(
        0,
        Math.round((totalAmount - running) * 100) / 100
      );
      const status =
        running === 0
          ? "Unpaid"
          : pending === 0
          ? "Paid"
          : "Partially Paid";

      await pool.query(
        "UPDATE fee_recipt SET paid_amount = ?, pending_amount = ?, status = ? WHERE id = ?",
        [running, pending, status, r.id]
      );
    }

    const [rowsFinal] = await pool.query(
      "SELECT * FROM fee_recipt WHERE id = ?",
      [id]
    );
    return res.json({ success: true, data: rowsFinal[0] });
  } catch (err) {
    console.error("updateOne error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update" });
  }
};

/**
 * Mark paid - optional amount in body to add a payment; otherwise auto-pay remaining.
 * Still uses fee_recipt table.
 */
export const markPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const [rows] = await pool.query(
      "SELECT * FROM fee_recipt WHERE id = ?",
      [id]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }

    const row = rows[0];
    const roll = row.roll_no;
    const fee = row.fee_type;
    const totalAmount = Number(row.total_amount || 0);
    const prevSum = await sumPayments(roll, fee, null);

    // When client sends amount, add that much payment
    if (amount != null && Number(amount) > 0) {
      const add = Number(amount);
      const newPaid = Math.round((prevSum + add) * 100) / 100;
      const pending = Math.max(
        0,
        Math.round((totalAmount - newPaid) * 100) / 100
      );
      const status = pending === 0 ? "Paid" : "Partially Paid";

      const insertSql = `
        INSERT INTO fee_recipt (
          date,
          department,
          sem,
          fee_type,
          roll_no,
          application_no,
          student_name,
          total_amount,
          pay_now,
          paid_amount,
          pending_amount,
          status,
          security_code,
          remarks,
          academic,
          payment_mode,
          reference_no
        )
        VALUES (CURRENT_DATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        row.department || null,
        row.sem || null,
        fee,
        roll,
        row.application_no || null,
        row.student_name || null,
        totalAmount,
        add,
        newPaid,
        pending,
        status,
        row.security_code || null,
        row.remarks || null,
        row.academic || null,
        row.payment_mode || null,
        row.reference_no || null,
      ];

      const [r] = await pool.query(insertSql, params);
      const [newRow] = await pool.query(
        "SELECT * FROM fee_recipt WHERE id = ?",
        [r.insertId]
      );
      return res.json({ success: true, data: newRow[0] });
    }

    // Otherwise: auto-pay remaining amount
    const needed = Math.max(0, totalAmount - prevSum);
    if (needed <= 0) {
      return res.json({ success: true, message: "Already paid" });
    }

    const add = needed;
    const newPaid = Math.round((prevSum + add) * 100) / 100;
    const pending = 0;
    const status = "Paid";

    const insertSql = `
      INSERT INTO fee_recipt (
        date,
        department,
        sem,
        fee_type,
        roll_no,
        application_no,
        student_name,
        total_amount,
        pay_now,
        paid_amount,
        pending_amount,
        status,
        security_code,
        remarks,
        academic,
        payment_mode,
        reference_no
      )
      VALUES (CURRENT_DATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      row.department || null,
      row.sem || null,
      fee,
      roll,
      row.application_no || null,
      row.student_name || null,
      totalAmount,
      add,
      newPaid,
      pending,
      status,
      row.security_code || null,
      row.remarks || null,
      row.academic || null,
      row.payment_mode || null,
      row.reference_no || null,
    ];

    const [r] = await pool.query(insertSql, params);
    const [newRow] = await pool.query(
      "SELECT * FROM fee_recipt WHERE id = ?",
      [r.insertId]
    );
    return res.json({ success: true, data: newRow[0] });
  } catch (err) {
    console.error("markPaid error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to mark paid" });
  }
};

/**
 * Delete a row
 */
export const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "DELETE FROM fee_recipt WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Not found" });
    }
    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("remove error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete" });
  }
};
