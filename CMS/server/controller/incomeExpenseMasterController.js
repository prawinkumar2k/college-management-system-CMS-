import pool from "../db.js";

/* ==========================================
   CREATE MASTER DATA
========================================== */
export const createIncomeExpenseMaster = async (req, res) => {
  try {
    const { group, category, person } = req.body;

    if (!group) {
      return res.status(400).json({
        success: false,
        message: "Group is required"
      });
    }

    const sql = `
      INSERT IGNORE INTO income_expense_master
      (group_name, category_name, person_name)
      VALUES (?, ?, ?)
    `;

    await pool.query(sql, [
      group,
      category || null,
      person || null
    ]);

    res.json({ success: true, message: "Master data saved" });

  } catch (err) {
    console.error("Master Create Error:", err);
    res.status(500).json({ success: false });
  }
};

/* ==========================================
   GET GROUP LIST
========================================== */
export const getGroups = async (req, res) => {
  const sql = `
    SELECT DISTINCT group_name AS \`group\`
    FROM income_expense_master
    ORDER BY group_name
  `;
  const [rows] = await pool.query(sql);
  res.json(rows);
};

/* ==========================================
   GET CATEGORY BY GROUP
========================================== */
export const getCategoriesByGroup = async (req, res) => {
  const { group } = req.params;

  const sql = `
    SELECT DISTINCT category_name AS category
    FROM income_expense_master
    WHERE group_name = ?
      AND category_name IS NOT NULL
    ORDER BY category_name
  `;

  const [rows] = await pool.query(sql, [group]);
  res.json(rows);
};

/* ==========================================
   GET PERSON BY GROUP & CATEGORY
========================================== */
export const getPersonsByCategory = async (req, res) => {
  const { group, category } = req.params;

  const sql = `
    SELECT DISTINCT person_name AS person
    FROM income_expense_master
    WHERE group_name = ?
      AND category_name = ?
      AND person_name IS NOT NULL
    ORDER BY person_name
  `;

  const [rows] = await pool.query(sql, [group, category]);
  res.json(rows);
};
