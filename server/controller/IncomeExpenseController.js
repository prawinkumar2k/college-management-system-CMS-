import pool from "../db.js";

/* ==========================================
   CREATE INCOME / EXPENSE ENTRY
========================================== */
export const createIncomeExpense = async (req, res) => {
  try {
    const {
      date,
      group,
      category,
      person,
      authorization,
      paymentMode,
      detail,
      sno,
      income,
      expense,
      suspense
    } = req.body;

    if (!date || !group) {
      return res.status(400).json({
        success: false,
        message: "Date and Group are required"
      });
    }

    const sql = `
      INSERT INTO income_expense_entries
      (entry_date, group_name, category_name, person_name,
       authorization, payment_mode, detail,
       bill_no, income, expense, suspense)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
      date,
      group,
      category || null,
      person || null,
      authorization || null,
      paymentMode || null,
      detail || null,
      sno || null,
      income || 0,
      expense || 0,
      suspense ? 1 : 0
    ]);

    res.status(201).json({
      success: true,
      message: "Income/Expense entry saved",
      id: result.insertId
    });

  } catch (err) {
    console.error("Create Entry Error:", err);
    res.status(500).json({ success: false });
  }
};

/* ==========================================
   GET ALL ENTRIES
========================================== */
export const getIncomeExpenseList = async (req, res) => {
  try {
    const sql = `
      SELECT
        id,
        entry_date AS date,
        group_name AS \`group\`,
        category_name AS category,
        person_name AS person,
        authorization,
        payment_mode AS paymentMode,
        detail,
        bill_no AS sno,
        income,
        expense,
        suspense
      FROM income_expense_entries
      ORDER BY entry_date DESC
    `;

    const [rows] = await pool.query(sql);
    res.json(rows);

  } catch (err) {
    console.error("Fetch Entries Error:", err);
    res.status(500).json([]);
  }
};

/* ==========================================
   DELETE ENTRY
========================================== */
export const deleteIncomeExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "DELETE FROM income_expense_entries WHERE id = ?",
      [id]
    );
    res.json({ success: true });

  } catch (err) {
    console.error("Delete Entry Error:", err);
    res.status(500).json({ success: false });
  }
};
