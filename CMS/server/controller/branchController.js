import db from '../db.js';

export const getBranches = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM course_details');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addBranch = async (req, res) => {
  try {
    const branch = req.body;
    // List of columns in your course_details table
    const validFields = [
      'Course_Mode', 'Dept_Code', 'Dept_Name', 'Year_Of_Course', 'Course_Name', 'Dept_Order', 'AICTE_Approval', 'AICTE_Approval_No',
      'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8',
      'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8',
      'Intake', 'AddlSeats', 'OC', 'BC', 'BCO', 'BCM', 'MBC_DNC', 'SC',
      'SCA', 'ST', 'Other', 'GoiQuota', 'MgtQuota', 'Ins_Type'
    ];
    // Only keep valid fields
    const filteredBranch = {};
    for (const key of validFields) {
      filteredBranch[key] = branch[key] ?? '';
    }
    const fields = Object.keys(filteredBranch).join(',');
    const values = Object.values(filteredBranch);
    const placeholders = values.map(() => '?').join(',');
    const sql = `INSERT INTO course_details (${fields}) VALUES (${placeholders})`;
    console.log('SQL:', sql);
    console.log('Values:', values);
    await db.query(sql, values);
    res.json({ success: true });
  } catch (err) {
    console.error('Error inserting branch:', err);
    res.status(500).json({ error: err.message, details: err });
  }
};

export const editBranch = async (req, res) => {
  try {
    const id = req.params.id;
    const branch = req.body;
    const updates = Object.keys(branch).map(key => `${key}=?`).join(',');
    const values = [...Object.values(branch), id];
    const sql = `UPDATE course_details SET ${updates} WHERE id=?`;
    await db.query(sql, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM course_details WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const checkCourseCode = async (req, res) => {
  try {
    const { courseCode, excludeId } = req.query;
    if (!courseCode) return res.status(400).json({ exists: false });
    let sql = 'SELECT id FROM course_details WHERE Dept_Code = ?';
    let params = [courseCode];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await db.query(sql, params);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
