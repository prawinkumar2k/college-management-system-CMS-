import pool from '../db.js';

// Get attendance report from student_attendance_view
export const getAttendanceReport = async (req, res) => {
  try {
    const { deptCode, semester, class: classParam, fromDate, toDate, searchTerm } = req.query;

    let query = 'SELECT * FROM student_attendance_view WHERE 1=1';
    const params = [];

    // Apply filters
    if (deptCode) {
      query += ' AND dept_code = ?';
      params.push(deptCode);
    }

    if (semester) {
      query += ' AND semester = ?';
      params.push(semester);
    }

    if (classParam) {
      query += ' AND class = ?';
      params.push(classParam);
    }

    if (fromDate) {
      query += ' AND date >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND date <= ?';
      params.push(toDate);
    }

    if (searchTerm) {
      query += ' AND (register_number LIKE ? OR name LIKE ?)';
      params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }

    // Order by date and register number
    query += ' ORDER BY date DESC, register_number ASC';

    const [results] = await pool.query(query, params);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching attendance report:', error);
    res.status(500).json({ 
      error: 'Failed to fetch attendance report', 
      details: error.message 
    });
  }
};

// Get attendance summary statistics
export const getAttendanceSummary = async (req, res) => {
  try {
    const { deptCode, semester, class: classParam, fromDate, toDate, registerNumber } = req.query;

    let query = `
      SELECT 
        register_number,
        name,
        dept_code,
        dept_name,
        semester,
        class,
        COUNT(*) as total_periods,
        SUM(CASE WHEN \`1\` = 'P' OR \`2\` = 'P' OR \`3\` = 'P' OR \`4\` = 'P' OR \`5\` = 'P' OR \`6\` = 'P' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN \`1\` = 'A' OR \`2\` = 'A' OR \`3\` = 'A' OR \`4\` = 'A' OR \`5\` = 'A' OR \`6\` = 'A' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN \`1\` = 'OD' OR \`2\` = 'OD' OR \`3\` = 'OD' OR \`4\` = 'OD' OR \`5\` = 'OD' OR \`6\` = 'OD' THEN 1 ELSE 0 END) as od_count,
        SUM(CASE WHEN \`1\` = 'ML' OR \`2\` = 'ML' OR \`3\` = 'ML' OR \`4\` = 'ML' OR \`5\` = 'ML' OR \`6\` = 'ML' THEN 1 ELSE 0 END) as ml_count
      FROM student_attendance_view 
      WHERE 1=1
    `;
    const params = [];

    if (deptCode) {
      query += ' AND dept_code = ?';
      params.push(deptCode);
    }

    if (semester) {
      query += ' AND semester = ?';
      params.push(semester);
    }

    if (classParam) {
      query += ' AND class = ?';
      params.push(classParam);
    }

    if (fromDate) {
      query += ' AND date >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      query += ' AND date <= ?';
      params.push(toDate);
    }

    if (registerNumber) {
      query += ' AND register_number = ?';
      params.push(registerNumber);
    }

    query += ' GROUP BY register_number, name, dept_code, dept_name, semester, class';

    const [results] = await pool.query(query, params);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch attendance summary', 
      details: error.message 
    });
  }
};

// Get detailed attendance report (date-wise or weekly)
export const getDetailedAttendanceReport = async (req, res) => {
  try {
    const { deptCode, semester, class: classParam, date, reportType } = req.query;

    if (!deptCode || !semester || !classParam || !date || !reportType) {
      return res.status(400).json({ 
        error: 'Missing required parameters: deptCode, semester, class, date, reportType' 
      });
    }

    if (reportType === 'datewise') {
      // Date-wise report - show all records with attendance status for specific date
      let query = `
        SELECT 
          date,
          dayorder,
          register_number,
          name,
          dept_code,
          dept_name,
          semester,
          class,
          \`1\`, \`2\`, \`3\`, \`4\`, \`5\`, \`6\`
        FROM student_attendance_view 
        WHERE dept_code = ? 
          AND semester = ? 
          AND class = ? 
          AND date = ?
        ORDER BY register_number ASC
      `;
      
      const [results] = await pool.query(query, [deptCode, semester, classParam, date]);
      return res.status(200).json(results);
      
    } else if (reportType === 'weekly') {
      // Weekly report - aggregate attendance statistics
      let query = `
        SELECT 
          register_number,
          name,
          dept_code,
          dept_name,
          semester,
          class,
          COUNT(DISTINCT date) as total_days,
          SUM(
            (CASE WHEN \`1\` = 'P' THEN 1 ELSE 0 END) +
            (CASE WHEN \`2\` = 'P' THEN 1 ELSE 0 END) +
            (CASE WHEN \`3\` = 'P' THEN 1 ELSE 0 END) +
            (CASE WHEN \`4\` = 'P' THEN 1 ELSE 0 END) +
            (CASE WHEN \`5\` = 'P' THEN 1 ELSE 0 END) +
            (CASE WHEN \`6\` = 'P' THEN 1 ELSE 0 END)
          ) as present_count,
          SUM(
            (CASE WHEN \`1\` = 'A' THEN 1 ELSE 0 END) +
            (CASE WHEN \`2\` = 'A' THEN 1 ELSE 0 END) +
            (CASE WHEN \`3\` = 'A' THEN 1 ELSE 0 END) +
            (CASE WHEN \`4\` = 'A' THEN 1 ELSE 0 END) +
            (CASE WHEN \`5\` = 'A' THEN 1 ELSE 0 END) +
            (CASE WHEN \`6\` = 'A' THEN 1 ELSE 0 END)
          ) as absent_count,
          SUM(
            (CASE WHEN \`1\` = 'OD' THEN 1 ELSE 0 END) +
            (CASE WHEN \`2\` = 'OD' THEN 1 ELSE 0 END) +
            (CASE WHEN \`3\` = 'OD' THEN 1 ELSE 0 END) +
            (CASE WHEN \`4\` = 'OD' THEN 1 ELSE 0 END) +
            (CASE WHEN \`5\` = 'OD' THEN 1 ELSE 0 END) +
            (CASE WHEN \`6\` = 'OD' THEN 1 ELSE 0 END)
          ) as od_count,
          SUM(
            (CASE WHEN \`1\` = 'ML' THEN 1 ELSE 0 END) +
            (CASE WHEN \`2\` = 'ML' THEN 1 ELSE 0 END) +
            (CASE WHEN \`3\` = 'ML' THEN 1 ELSE 0 END) +
            (CASE WHEN \`4\` = 'ML' THEN 1 ELSE 0 END) +
            (CASE WHEN \`5\` = 'ML' THEN 1 ELSE 0 END) +
            (CASE WHEN \`6\` = 'ML' THEN 1 ELSE 0 END)
          ) as ml_count
        FROM student_attendance_view 
        WHERE dept_code = ? 
          AND semester = ? 
          AND class = ? 
          AND date = ?
        GROUP BY register_number, name, dept_code, dept_name, semester, class
        ORDER BY register_number ASC
      `;
      
      const [results] = await pool.query(query, [deptCode, semester, classParam, date]);
      return res.status(200).json(results);
      
    } else {
      return res.status(400).json({ 
        error: 'Invalid reportType. Must be either "datewise" or "weekly"' 
      });
    }
    
  } catch (error) {
    console.error('Error fetching detailed attendance report:', error);
    res.status(500).json({ 
      error: 'Failed to fetch detailed attendance report', 
      details: error.message 
    });
  }
};

// Get distinct classes from student_attendance_view based on dept and semester
export const getClassesByFilters = async (req, res) => {
  try {
    const { deptCode, semester } = req.query;

    if (!deptCode || !semester) {
      return res.status(400).json({ 
        error: 'Department code and semester are required' 
      });
    }

    const query = `
      SELECT DISTINCT class as Class
      FROM student_attendance_view 
      WHERE dept_code = ? AND semester = ?
      ORDER BY class
    `;
    
    const [results] = await pool.query(query, [deptCode, semester]);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ 
      error: 'Failed to fetch classes', 
      details: error.message 
    });
  }
};

// Get available months from student_weekly_attendance
export const getAvailableMonths = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT month_no, month_name
      FROM student_weekly_attendance
      ORDER BY month_no
    `;
    
    const [results] = await pool.query(query);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching months:', error);
    res.status(500).json({ 
      error: 'Failed to fetch months', 
      details: error.message 
    });
  }
};

// Get available weeks for a specific month
export const getAvailableWeeks = async (req, res) => {
  try {
    const { monthNo } = req.query;

    if (!monthNo) {
      return res.status(400).json({ 
        error: 'Month number is required' 
      });
    }

    const query = `
      SELECT DISTINCT week_no
      FROM student_weekly_attendance
      WHERE month_no = ?
      ORDER BY week_no
    `;
    
    const [results] = await pool.query(query, [monthNo]);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching weeks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weeks', 
      details: error.message 
    });
  }
};

// Get weekly attendance report from student_weekly_attendance table
export const getWeeklyAttendanceReport = async (req, res) => {
  try {
    const { deptCode, semester, class: classParam, monthNo, weekNo } = req.query;

    if (!deptCode || !semester || !classParam || !monthNo || !weekNo) {
      return res.status(400).json({ 
        error: 'Missing required parameters: deptCode, semester, class, monthNo, weekNo' 
      });
    }

    const query = `
      SELECT 
        date,
        month_no,
        month_name,
        week_no,
        dayorder,
        Dept_Code,
        Dept_Name,
        Semester,
        Regulation,
        Class,
        Register_Number,
        name,
        P1, P2, P3, P4, P5, P6
      FROM student_weekly_attendance
      WHERE Dept_Code = ? 
        AND Semester = ? 
        AND Class = ? 
        AND month_no = ?
        AND week_no = ?
      ORDER BY date ASC, Register_Number ASC
    `;
    
    const [results] = await pool.query(query, [deptCode, semester, classParam, monthNo, weekNo]);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error fetching weekly attendance report:', error);
    res.status(500).json({ 
      error: 'Failed to fetch weekly attendance report', 
      details: error.message 
    });
  }
};
