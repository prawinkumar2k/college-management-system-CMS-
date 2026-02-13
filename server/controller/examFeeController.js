import db from '../db.js';

export const getExamFees = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM exam_fee');
    const mapped = rows.map(row => ({
      id: row.id,
      regno: row.RegNo,
      studName: row.StudName,
      course: row.Course,
      sem: row.Sem,
      fine: row.Fine,
      fee: row.Fee,
      totFee: row.TotFee,
      semCols: [row.Sem_1, row.Sem_2, row.Sem_3, row.Sem_4, row.Sem_5, row.Sem_6, row.Sem_7, row.Sem_8]
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addExamFee = async (req, res) => {
  try {
    const fee = req.body;
    const dbFee = {
      RegNo: fee.RegNo,
      StudName: fee.StudName,
      Course: fee.Course,
      Sem: fee.Sem,
      Fine: fee.Fine,
      Fee: fee.Fee,
      TotFee: fee.TotFee,
      Sem_1: fee.Sem_1,
      Sem_2: fee.Sem_2,
      Sem_3: fee.Sem_3,
      Sem_4: fee.Sem_4,
      Sem_5: fee.Sem_5,
      Sem_6: fee.Sem_6,
      Sem_7: fee.Sem_7,
      Sem_8: fee.Sem_8
    };
    const fields = Object.keys(dbFee).join(',');
    const values = Object.values(dbFee);
    const placeholders = values.map(() => '?').join(',');
    const sql = `INSERT INTO exam_fee (${fields}) VALUES (${placeholders})`;
    const [result] = await db.query(sql, values);
    // Fetch the inserted row by its new id
    const [rows] = await db.query('SELECT * FROM exam_fee WHERE id=?', [result.insertId]);
    const row = rows[0];
    res.json({
      id: row.id,
      regno: row.RegNo,
      studName: row.StudName,
      course: row.Course,
      sem: row.Sem,
      fine: row.Fine,
      fee: row.Fee,
      totFee: row.TotFee,
      semCols: [row.Sem_1, row.Sem_2, row.Sem_3, row.Sem_4, row.Sem_5, row.Sem_6, row.Sem_7, row.Sem_8]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const editExamFee = async (req, res) => {
  try {
    const id = req.params.id;
    const fee = req.body;
    const dbFee = {
      RegNo: fee.regno,
      StudName: fee.studName,
      Course: fee.course,
      Sem: fee.sem,
      Fine: fee.fine,
      Fee: fee.fee,
      TotFee: fee.totFee,
      Sem_1: fee.semCols?.[0] || '',
      Sem_2: fee.semCols?.[1] || '',
      Sem_3: fee.semCols?.[2] || '',
      Sem_4: fee.semCols?.[3] || '',
      Sem_5: fee.semCols?.[4] || '',
      Sem_6: fee.semCols?.[5] || '',
      Sem_7: fee.semCols?.[6] || '',
      Sem_8: fee.semCols?.[7] || ''
    };
    const updates = Object.keys(dbFee).map(key => `${key}=?`).join(',');
    const values = [...Object.values(dbFee), id];
    const sql = `UPDATE exam_fee SET ${updates} WHERE id=?`;
    await db.query(sql, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteExamFee = async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM exam_fee WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
