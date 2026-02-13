import pool from '../db.js';

// Get all staff from staff_master table
export const getAllStaff = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT Staff_ID, Staff_Name FROM staff_master ORDER BY Staff_Name'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

// Get departments handled by a specific staff from subject_allocation
export const getDepartmentsByStaff = async (req, res) => {
  try {
    const { staffId } = req.query;

    if (!staffId) {
      return res.status(400).json({ error: 'Staff ID is required' });
    }

    const [rows] = await pool.query(
      `SELECT DISTINCT cd.Dept_Code, cd.Dept_Name 
       FROM subject_allocation sa
       JOIN course_details cd ON sa.Sub1_Dept_Code = cd.Dept_Code
       WHERE sa.Staff_Id = ?
       ORDER BY cd.Dept_Name`,
      [staffId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching departments by staff:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

// Get all departments from course_details table
export const getDepartments = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT DISTINCT Dept_Code, Dept_Name FROM course_details ORDER BY Dept_Name'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

// Get all semesters from semester_master table
export const getSemesters = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM semester_master ORDER BY Semester'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
};

// Get all regulations from regulation_master table
export const getRegulations = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM regulation_master ORDER BY Regulation'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching regulations:', error);
    res.status(500).json({ error: 'Failed to fetch regulations' });
  }
};

// Get all classes from student_master table
export const getClasses = async (req, res) => {
  try {
    const { deptCode, semester, regulation } = req.query;
    
    let query = 'SELECT DISTINCT Class FROM student_master WHERE 1=1';
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
    
    query += ' ORDER BY Class';
    
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
};

// Get subjects from timetable_period based on date, day order, staff ID, dept, semester, regulation, and class
export const getSubjects = async (req, res) => {
  try {
    const { staffId, deptCode, semester, regulation, date, dayOrder, classSection } = req.query;

    console.log('getSubjects query params:', { staffId, deptCode, semester, regulation, date, dayOrder, classSection });

    if (!staffId || !deptCode || !semester || !regulation || !date || !dayOrder || !classSection) {
      return res.status(400).json({ 
        error: 'Staff ID, department code, semester, regulation, date, day order, and class are required' 
      });
    }

    const [rows] = await pool.query(
      `SELECT DISTINCT Sub_Code, Sub_Name 
       FROM timetable_period 
       WHERE Calendar_Date = ? 
         AND Day_Order = ? 
         AND Dept_Code = ? 
         AND Semester = ? 
         AND Regulation = ? 
         AND Class_Section = ?
       ORDER BY Sub_Name`,
      [date, dayOrder, deptCode, semester, regulation, classSection]
    );

    console.log('Subjects found:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching subjects:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects', details: error.message });
  }
};

// Get staff ID from staff_master based on staff name (no longer needed but keeping for compatibility)
export const getStaffBySubject = async (req, res) => {
  try {
    const { staffName } = req.query;

    if (!staffName) {
      return res.status(400).json({ 
        error: 'Staff name is required' 
      });
    }

    const [rows] = await pool.query(
      `SELECT Staff_ID FROM staff_master 
       WHERE Staff_Name = ?
       LIMIT 1`,
      [staffName]
    );

    if (rows.length === 0) {
      return res.json({ staffId: null, message: 'Staff not found' });
    }

    res.json({ 
      staffId: rows[0].Staff_ID
    });
  } catch (error) {
    console.error('Error fetching staff ID:', error);
    res.status(500).json({ error: 'Failed to fetch staff ID' });
  }
};

// Get day order based on date from academic_calendar table
export const getDayOrder = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ 
        error: 'Date is required' 
      });
    }

    // Query to get day order from academic_calendar table
    const [rows] = await pool.query(
      `SELECT Day_Order FROM academic_calendar 
       WHERE Calendar_Date = ? 
       LIMIT 1`,
      [date]
    );

    if (rows.length === 0) {
      return res.json({ dayOrder: null, message: 'No day order configured for this date' });
    }

    res.json({ dayOrder: rows[0].Day_Order });
  } catch (error) {
    console.error('Error fetching day order:', error);
    res.status(500).json({ error: 'Failed to fetch day order' });
  }
};

// Get periods from timetable_period based on date, day order, staff ID, and subject
export const getPeriods = async (req, res) => {
  try {
    const { date, dayOrder, staffId, subjectCode, deptCode, semester, regulation, classSection } = req.query;

    if (!date || !dayOrder || !staffId || !subjectCode || !deptCode || !semester || !regulation || !classSection) {
      return res.status(400).json({ 
        error: 'Date, day order, staff ID, subject code, department, semester, regulation, and class are required' 
      });
    }

    const [rows] = await pool.query(
      `SELECT DISTINCT period_no 
       FROM timetable_period 
       WHERE Calendar_Date = ? 
         AND Day_Order = ?
         AND Sub_Code = ? 
         AND Dept_Code = ? 
         AND Semester = ? 
         AND Regulation = ? 
         AND Class_Section = ?
       ORDER BY period_no`,
      [date, dayOrder, subjectCode, deptCode, semester, regulation, classSection]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching periods:', error);
    res.status(500).json({ error: 'Failed to fetch periods' });
  }
};

// Get students for attendance filtered by dept, semester, regulation, and class
export const getStudents = async (req, res) => {
  try {
    const { deptCode, semester, regulation, classSection } = req.query;

    if (!deptCode || !semester || !regulation || !classSection) {
      return res.status(400).json({ 
        error: 'Department code, semester, regulation, and class are required' 
      });
    }

    // Query student_master table with class filter
    const [rows] = await pool.query(
      `SELECT * FROM student_master 
       WHERE Dept_Code = ? AND Semester = ? AND Regulation = ? AND Class = ?
       ORDER BY Student_Name`,
      [deptCode, semester, regulation, classSection]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Save attendance data
export const saveAttendance = async (req, res) => {
  try {
    console.log('Received attendance data:', JSON.stringify(req.body, null, 2));
    
    const {
      date,
      dayOrder,
      department,
      departmentCode,
      semester,
      regulation,
      subject,
      subjectCode,
      period,
      attendance,
      staffId,
      staffName,
      classSection
    } = req.body;

    // Validate required fields
    if (!date || !departmentCode || !semester || !regulation || !subjectCode || !period) {
      console.error('Missing required fields:', { date, departmentCode, semester, regulation, subjectCode, period });
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }

    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert one row per student with their attendance status
      // Period is comma-separated if multiple periods selected
      const insertQuery = `
        INSERT INTO student_attendance_entry 
        (Att_Date, Day_Order, Staff_ID, Staff_Name, Dept_Code, Dept_Name, 
         Semester, Regulation, Class, Subject_Code, Period, Register_Number, Att_Status, Entry_Time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
      `;

      let insertCount = 0;

      // Insert individual record for each student with attendance status
      for (const record of attendance) {
        if (record.status && record.regNo) {
          await connection.query(insertQuery, [
            date,
            dayOrder,
            staffId,
            staffName,
            departmentCode,
            department,
            semester,
            regulation,
            classSection,
            subjectCode,
            period, // Period is comma-separated from frontend (e.g., "1,2,3")
            record.regNo, // Individual student register number
            record.status // Individual student status
          ]);
          insertCount++;
        }
      }

      console.log(`Inserted ${insertCount} attendance records for subject ${subjectCode}, periods: ${period}`);

      await connection.commit();
      connection.release();

      res.json({ 
        success: true, 
        message: 'Attendance saved successfully' 
      });
    } catch (error) {
      console.error('Error in transaction:', error);
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error saving attendance:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to save attendance',
      details: error.message 
    });
  }
};

// Get attendance history (optional - for viewing past attendance)
export const getAttendanceHistory = async (req, res) => {
  try {
    const { date, deptCode, semester, regulation } = req.query;

    let query = 'SELECT * FROM daily_attendance WHERE 1=1';
    const params = [];

    if (date) {
      query += ' AND Attendance_Date = ?';
      params.push(date);
    }
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

    query += ' ORDER BY Attendance_Date DESC, Period';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
};
