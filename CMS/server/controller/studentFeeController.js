// controllers/studentFee.controller.js
import pool from "../db.js";

/**
 * Helper: map request body (camelCase from frontend) → DB fields (snake_case)
 */
function mapBodyToDb(body = {}) {
  return {
    roll_no: body.rollNo || body.roll_no || null,
    reg_no: body.regNo || body.reg_no || null,
    student_name: body.name || body.studentName || body.student_name || null,

    department: body.department || null,
    sem: body.sem || null,
    fee_type: body.feeType || body.fee_type || null,

    amount: body.amount || null,
    status: body.status || null,

    academic_year: body.academicYear || body.academic_year || null,
    security_code: body.securityCode || body.security_code || null,

    created_by: body.createdBy || body.created_by || null,
  };
}

/**
 * GET /api/student-fees
 * Optional filters: ?department=&sem=&feeType=&rollNoRegNo=&academicYear=
 */
export const getStudentFees = async (req, res) => {
  try {
    const { department, sem, feeType, rollNoRegNo, academicYear } = req.query;

    let sql = `
      SELECT
        id,
        roll_no       AS rollNo,
        reg_no        AS regNo,
        student_name  AS name,
        department,
        sem,
        fee_type      AS feeType,
        amount,
        status,
        academic_year AS academicYear,
        security_code AS securityCode,
        created_at,
        updated_at
      FROM studentfee
      WHERE 1=1
    `;

    const params = [];

    if (department) {
      sql += " AND department = ?";
      params.push(department);
    }
    if (sem) {
      sql += " AND sem = ?";
      params.push(sem);
    }
    if (feeType) {
      sql += " AND fee_type = ?";
      params.push(feeType);
    }
    if (rollNoRegNo) {
      // Match either roll_no OR reg_no
      sql += " AND (roll_no = ? OR reg_no = ?)";
      params.push(rollNoRegNo, rollNoRegNo);
    }
    if (academicYear) {
      sql += " AND academic_year = ?";
      params.push(academicYear);
    }

    sql += " ORDER BY academic_year DESC, department ASC, roll_no ASC";

    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getStudentFees error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch student fees" });
  }
};

/**
 * GET /api/student-fees/:id
 */
export const getStudentFeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        id,
        roll_no       AS rollNo,
        reg_no        AS regNo,
        student_name  AS name,
        department,
        sem,
        fee_type      AS feeType,
        amount,
        status,
        academic_year AS academicYear,
        security_code AS securityCode,
        created_at,
        updated_at
      FROM studentfee
      WHERE id = ?
      `,
      [id]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Student fee record not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("getStudentFeeById error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch student fee record" });
  }
};

/**
 * POST /api/student-fees
 * Used when creating a student fee record
 */
export const createStudentFee = async (req, res) => {
  try {
    const data = mapBodyToDb(req.body);

    const sql = `
      INSERT INTO studentfee (
        roll_no,
        reg_no,
        student_name,
        department,
        sem,
        fee_type,
        amount,
        status,
        academic_year,
        security_code,
        created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `;

    const params = [
      data.roll_no,
      data.reg_no,
      data.student_name,
      data.department,
      data.sem,
      data.fee_type,
      data.amount,
      data.status,
      data.academic_year,
      data.security_code,
      data.created_by,
    ];

    const [result] = await pool.query(sql, params);

    const [savedRows] = await pool.query(
      `
      SELECT
        id,
        roll_no       AS rollNo,
        reg_no        AS regNo,
        student_name  AS name,
        department,
        sem,
        fee_type      AS feeType,
        amount,
        status,
        academic_year AS academicYear,
        security_code AS securityCode,
        created_at,
        updated_at
      FROM studentfee
      WHERE id = ?
      `,
      [result.insertId]
    );

    return res.status(201).json({ success: true, data: savedRows[0] });
  } catch (err) {
    console.error("createStudentFee error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create student fee record" });
  }
};

/**
 * PUT /api/student-fees/:id
 * Partial update (only fields provided in body)
 * Can be used from your UPDATE / Update Balance actions
 */
export const updateStudentFee = async (req, res) => {
  try {
    const { id } = req.params;
    const data = mapBodyToDb(req.body);

    const allowed = [
      "roll_no",
      "reg_no",
      "student_name",
      "department",
      "sem",
      "fee_type",
      "amount",
      "status",
      "academic_year",
      "security_code",
      "created_by",
    ];

    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    params.push(id);

    await pool.query(
      `UPDATE studentfee SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    const [rows] = await pool.query(
      `
      SELECT
        id,
        roll_no       AS rollNo,
        reg_no        AS regNo,
        student_name  AS name,
        department,
        sem,
        fee_type      AS feeType,
        amount,
        status,
        academic_year AS academicYear,
        security_code AS securityCode,
        created_at,
        updated_at
      FROM studentfee
      WHERE id = ?
      `,
      [id]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Student fee record not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("updateStudentFee error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update student fee record" });
  }
};

/**
 * DELETE /api/student-fees/:id
 */
export const deleteStudentFee = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM studentfee WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Student fee record not found" });
    }

    return res.json({ success: true, message: "Student fee record deleted" });
  } catch (err) {
    console.error("deleteStudentFee error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete student fee record" });
  }
};
