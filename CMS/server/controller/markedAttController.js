import pool from '../db.js';

// Get all marked attendance with filters
export const getMarkedAttendance = async (req, res) => {
  try {
    const { 
      deptCode, 
      semester, 
      regulation, 
      fromDate, 
      toDate, 
      searchTerm, 
      status 
    } = req.query;

    let query = `
      SELECT 
        sae.*,
        sm.Student_Name,
        cd.Dept_Name
      FROM student_attendance_entry sae
      LEFT JOIN student_master sm ON sae.Register_Number = sm.Register_Number
      LEFT JOIN course_details cd ON sae.Dept_Code = cd.Dept_Code
      WHERE 1=1
    `;
    const params = [];

    // Apply filters
    if (deptCode) {
      query += ' AND sae.Dept_Code = ?';
      params.push(deptCode);
    }

    if (semester) {
      query += ' AND sae.Semester = ?';
      params.push(semester);
    }

    if (regulation) {
      query += ' AND sae.Regulation = ?';
      params.push(regulation);
    }

    if (fromDate && toDate) {
      query += ' AND sae.Att_Date BETWEEN ? AND ?';
      params.push(fromDate, toDate);
    }

    if (searchTerm) {
      query += ' AND (sae.Register_Number LIKE ? OR sm.Student_Name LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    if (status) {
      query += ' AND sae.Att_Status = ?';
      params.push(status);
    }

    query += ' ORDER BY sae.Att_Date DESC, sae.Period';

    console.log('Executing query:', query);
    console.log('With params:', params);

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching marked attendance:', error);
    res.status(500).json({ error: 'Failed to fetch marked attendance' });
  }
};

// Get attendance by ID
export const getAttendanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT 
        sae.*,
        sm.Student_Name,
        cd.Dept_Name
      FROM student_attendance_entry sae
      LEFT JOIN student_master sm ON sae.Register_Number = sm.Register_Number
      LEFT JOIN course_details cd ON sae.Dept_Code = cd.Dept_Code
      WHERE sae.Id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching attendance by ID:', error);
    res.status(500).json({ error: 'Failed to fetch attendance record' });
  }
};

// Update attendance status
export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { attStatus } = req.body;

    if (!attStatus) {
      return res.status(400).json({ error: 'Attendance status is required' });
    }

    const [result] = await pool.query(
      'UPDATE student_attendance_entry SET Att_Status = ?, Updated_At = CURDATE() WHERE Id = ?',
      [attStatus, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json({ 
      success: true, 
      message: 'Attendance updated successfully' 
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
};

// Delete attendance record
export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM student_attendance_entry WHERE Id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json({ 
      success: true, 
      message: 'Attendance record deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
};

// Get attendance statistics
export const getAttendanceStats = async (req, res) => {
  try {
    const { deptCode, semester, regulation, fromDate, toDate } = req.query;

    let query = `
      SELECT 
        Att_Status,
        COUNT(*) as count
      FROM student_attendance_entry
      WHERE 1=1
    `;
    const params = [];

    if (deptCode) {
      query += ' AND Dept_Code = ?';
      params.push(deptCode);
    }

    if (semester) {
      query += ' AND Semester = ?';
      params.push(semester);
    }

    if (regulation) {
      query += ' AND Regulation = ?';
      params.push(regulation);
    }

    if (fromDate && toDate) {
      query += ' AND Att_Date BETWEEN ? AND ?';
      params.push(fromDate, toDate);
    }

    query += ' GROUP BY Att_Status';

    const [rows] = await pool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    res.status(500).json({ error: 'Failed to fetch attendance statistics' });
  }
};
