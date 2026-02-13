import db from '../db.js';
import path from 'path';
import fs from 'fs';

// Helper to convert DD-MM-YYYY or similar to YYYY-MM-DD
function toMysqlDate(dateStr) {
  if (!dateStr) return null;
  // If already in YYYY-MM-DD, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // Convert DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
  const parts = dateStr.split(/[-\/]/);
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

// Get all students
export const getAllStudents = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM StudentDetails ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get student by id
export const getStudentById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM StudentDetails WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add a student (with photo upload)
export const addStudent = async (req, res) => {
  try {
    const data = req.body;
    let photoPath = '';
    if (req.file) {
      // Save photo to /client/public/assets/lib/studentborrower
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!['.jpeg', '.jpg', '.png', '.webp'].includes(ext)) {
        return res.status(400).json({ error: 'Invalid image format. Only jpeg, jpg, png, webp allowed.' });
      }
      const destDir = path.join(process.cwd(), 'client', 'public', 'assets', 'lib', 'studentborrower');
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      const fileName = `${data.BorrowerID}${ext}`;
      const destPath = path.join(destDir, fileName);
      fs.writeFileSync(destPath, req.file.buffer);
      photoPath = `/assets/lib/studentborrower/${fileName}`;
    }
    // Convert dates to MySQL format
    const dob = toMysqlDate(data.DateOfBirth);
    const joining = toMysqlDate(data.JoiningDate);
    // Check for future dates in DateOfBirth and JoiningDate
    const today = new Date();
    if (dob && new Date(dob) > today) {
      return res.status(400).json({ success: false, message: 'Date of Birth cannot be in the future.' });
    }
    if (joining && new Date(joining) > today) {
      return res.status(400).json({ success: false, message: 'Joining Date cannot be in the future.' });
    }
    // Log errors in detail
    try {
      const [result] = await db.query(
        `INSERT INTO StudentDetails (BorrowerID, StudentName, RegisterNumber, Department, Year, Section, Gender, DateOfBirth, JoiningDate, PhoneNumber, EmailID, Address, BorrowLimit, Status, Remarks, PhotoPath) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.BorrowerID,
          data.StudentName,
          data.RegisterNumber,
          data.Department,
          data.Year,
          data.Section,
          data.Gender,
          dob,
          joining,
          data.PhoneNumber,
          data.EmailID || '',
          data.Address || '',
          data.BorrowLimit || 3,
          data.Status || 'Active',
          data.Remarks || '',
          photoPath
        ]
      );
      res.json({ id: result.insertId, photoPath });
    } catch (error) {
      console.error('Error saving student:', error);
      return res.status(500).json({ success: false, message: 'Failed to save student', error: error.message, details: error });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a student
export const updateStudent = async (req, res) => {
  try {
    const data = req.body;
    let photoPath = data.PhotoPath || '';
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      if (!['.jpeg', '.jpg', '.png', '.webp'].includes(ext)) {
        return res.status(400).json({ error: 'Invalid image format. Only jpeg, jpg, png, webp allowed.' });
      }
      const destDir = path.join(process.cwd(), 'client', 'public', 'assets', 'lib', 'studentborrower');
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      const fileName = `${data.BorrowerID}${ext}`;
      const destPath = path.join(destDir, fileName);
      fs.writeFileSync(destPath, req.file.buffer);
      photoPath = `/assets/lib/studentborrower/${fileName}`;
    }
    const [result] = await db.query(
      `UPDATE StudentDetails SET StudentName=?, RegisterNumber=?, Department=?, Year=?, Section=?, Gender=?, DateOfBirth=?, JoiningDate=?, PhoneNumber=?, EmailID=?, Address=?, BorrowLimit=?, Status=?, Remarks=?, PhotoPath=? WHERE id=?`,
      [
        data.StudentName,
        data.RegisterNumber,
        data.Department,
        data.Year,
        data.Section,
        data.Gender,
        data.DateOfBirth,
        data.JoiningDate,
        data.PhoneNumber,
        data.EmailID,
        data.Address,
        data.BorrowLimit || 3,
        data.Status,
        data.Remarks,
        photoPath,
        req.params.id
      ]
    );
    res.json({ affectedRows: result.affectedRows, photoPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a student
export const deleteStudent = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM StudentDetails WHERE id = ?', [req.params.id]);
    res.json({ affectedRows: result.affectedRows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
