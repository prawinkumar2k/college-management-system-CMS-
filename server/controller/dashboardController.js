import db from '../db.js';

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Get total students count
    const [studentResult] = await db.query(
      "SELECT COUNT(DISTINCT id) as total FROM student_master WHERE Admission_Status = 'Admitted'"
    );

    // Get total staff count
    const [staffResult] = await db.query(
      "SELECT COUNT(DISTINCT Staff_ID) as total FROM staff_master"
    );

    // Get total departments count
    const [deptResult] = await db.query(
      "SELECT COUNT(DISTINCT Dept_Code) as total FROM course_details"
    );

    // Get today's present count
    const now = new Date();
    const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [presentCountResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total FROM student_attendance_entry
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND Att_Status = 'present'
    `, [istDate]);

    // Get today's absent count
    const [absentCountResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total FROM student_attendance_entry
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND Att_Status = 'absent'
    `, [istDate]);

    // Get today's onDuty count
    const [onDutyCountResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total FROM student_attendance_entry
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND Att_Status = 'onDuty'
    `, [istDate]);

    // Get today's medicalLeave count
    const [medicalLeaveCountResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total FROM student_attendance_entry
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND Att_Status = 'medicalLeave'
    `, [istDate]);

    res.status(200).json({
      success: true,
      data: {
        totalStudents: parseInt(studentResult[0].total) || 0,
        totalStaff: parseInt(staffResult[0].total) || 0,
        departments: parseInt(deptResult[0].total) || 0,
        totalPresent: parseInt(presentCountResult[0].total) || 0,
        totalAbsent: parseInt(absentCountResult[0].total) || 0,
        totalOnDuty: parseInt(onDutyCountResult[0].total) || 0,
        totalMedicalLeave: parseInt(medicalLeaveCountResult[0].total) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
};

// Get department-wise student distribution
export const getDepartmentWiseStudents = async (req, res) => {
  try {
    const { academicYear } = req.query;

    let query = `
      SELECT 
        Dept_Code,
        Dept_Name,
        Academic_Year,
        COUNT(DISTINCT Register_Number) AS Student_Count
      FROM student_master
      WHERE Admission_Status = 'Admitted'
    `;

    // Add academic year filter if provided
    if (academicYear) {
      query += ` AND Academic_Year = ?`;
    }

    query += ` GROUP BY Dept_Code, Dept_Name, Academic_Year ORDER BY Academic_Year DESC, Student_Count DESC`;

    const [results] = academicYear
      ? await db.query(query, [academicYear])
      : await db.query(query);

    // Calculate total students per academic year for percentage calculation
    const totalsByYear = {};
    results.forEach(dept => {
      const year = dept.Academic_Year;
      totalsByYear[year] = (totalsByYear[year] || 0) + parseInt(dept.Student_Count);
    });

    // Format the data with percentage (relative to each academic year)
    const formattedData = results.map(dept => {
      const yearTotal = totalsByYear[dept.Academic_Year] || 0;
      return {
        deptCode: dept.Dept_Code,
        deptName: dept.Dept_Name ? dept.Dept_Name.split('(')[0].trim() : dept.Dept_Code,
        academicYear: dept.Academic_Year,
        studentCount: parseInt(dept.Student_Count),
        percentage: yearTotal > 0 ? Math.round((parseInt(dept.Student_Count) / yearTotal) * 100) : 0
      };
    });

    // Calculate total students for the selected academic year or all years
    const totalStudents = academicYear
      ? (totalsByYear[academicYear] || 0)
      : Object.values(totalsByYear).reduce((sum, total) => sum + total, 0);

    res.status(200).json({
      success: true,
      data: formattedData,
      totalStudents: totalStudents
    });
  } catch (error) {
    console.error('Error fetching department-wise students:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department-wise student data',
      error: error.message
    });
  }
};

// Get distinct academic years
export const getAcademicYears = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT DISTINCT Academic_Year 
      FROM student_master 
      WHERE Admission_Status = 'Admitted' 
        AND Academic_Year IS NOT NULL
        AND Academic_Year != ''
      ORDER BY Academic_Year DESC
    `);

    const years = results.map(row => row.Academic_Year);

    res.status(200).json({
      success: true,
      data: years
    });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch academic years',
      error: error.message
    });
  }
};

// Get today's attendance percentage
export const getTodayAttendance = async (req, res) => {
  try {
    // Get current date in YYYY-MM-DD format (IST timezone for India)
    const now = new Date();
    const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log('Fetching attendance for date:', istDate);

    // Try direct date match first
    const [results] = await db.query(`
      SELECT 
        overall_present_percentage,
        Att_Date
      FROM overall_att_date_wise
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
      ORDER BY Att_Date DESC
      LIMIT 1
    `, [istDate]);

    console.log('Query results:', results);
    console.log('Number of results:', results.length);

    if (results.length === 0) {
      console.log('No attendance record found for date:', istDate);
      return res.status(200).json({
        success: true,
        data: {
          attendancePercentage: 0,
          date: istDate
        }
      });
    }

    const record = results[0];
    const presentPercent = parseInt(record.overall_present_percentage) || 0;

    console.log('Attendance percentage:', presentPercent);

    res.status(200).json({
      success: true,
      data: {
        attendancePercentage: presentPercent,
        date: record.Att_Date
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance data',
      error: error.message
    });
  }
};

// Get department-wise attendance by date
export const getDeptAttendanceByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    console.log('Fetching department-wise attendance for date:', date);

    const [results] = await db.query(`
      SELECT 
        Att_Date,
        Dept_Code,
        Dept_Name,
        present_count,
        absent_count,
        total_students,
        present_percentage,
        absent_percentage
      FROM dept_attendance_date_wise
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
      ORDER BY Dept_Code, Dept_Name
    `, [date]);

    console.log('Query results:', results);

    if (results.length === 0) {
      console.log('No attendance record found for date:', date);
      return res.status(200).json({
        success: true,
        data: [],
        message: 'No attendance data available for this date'
      });
    }

    // Format the data
    const formattedData = results.map(row => ({
      deptCode: row.Dept_Code,
      deptName: row.Dept_Name ? row.Dept_Name.split('(')[0].trim() : row.Dept_Code,
      totalStudents: parseInt(row.total_students) || 0,
      presentCount: parseInt(row.present_count) || 0,
      absentCount: parseInt(row.absent_count) || 0,
      presentPercentage: parseInt(row.present_percentage) || 0,
      absentPercentage: parseInt(row.absent_percentage) || 0,
      date: row.Att_Date
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
      date: date
    });
  } catch (error) {
    console.error('Error fetching department attendance by date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department attendance data',
      error: error.message
    });
  }
};

// Get dashboard stats for a specific date
export const getDashboardStatsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Get present count for the date
    const [presentCountResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total FROM student_attendance_entry
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND Att_Status = 'present'
    `, [date]);

    // Get absent count for the date
    const [absentCountResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total FROM student_attendance_entry
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND Att_Status = 'absent'
    `, [date]);

    // Get onDuty count for the date
    const [onDutyCountResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total FROM student_attendance_entry
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND Att_Status = 'onDuty'
    `, [date]);

    // Get medicalLeave count for the date
    const [medicalLeaveCountResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total FROM student_attendance_entry
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND Att_Status = 'medicalLeave'
    `, [date]);

    // Get attendance percentage for the date
    const [attendanceResult] = await db.query(`
      SELECT overall_present_percentage
      FROM overall_att_date_wise
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
      LIMIT 1
    `, [date]);

    const presentCount = parseInt(presentCountResult[0].total) || 0;
    const absentCount = parseInt(absentCountResult[0].total) || 0;
    const onDutyCount = parseInt(onDutyCountResult[0].total) || 0;
    const medicalLeaveCount = parseInt(medicalLeaveCountResult[0].total) || 0;
    const attendancePercentage = attendanceResult.length > 0
      ? parseInt(attendanceResult[0].overall_present_percentage) || 0
      : 0;

    res.status(200).json({
      success: true,
      data: {
        totalPresent: presentCount,
        totalAbsent: absentCount,
        totalOnDuty: onDutyCount,
        totalMedicalLeave: medicalLeaveCount,
        attendance: attendancePercentage,
        date
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats by date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats for date',
      error: error.message
    });
  }
};

// Get present and absent student lists and counts by date
export const getAttendanceDetailsByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Query for present students
    const [presentRows] = await db.query(`
      SELECT sa.Register_Number, sm.Student_Name, sm.Dept_Code, sm.Dept_Name, sm.Father_Mobile, sm.Guardian_Mobile
      FROM student_attendance_entry sa
      JOIN student_master sm ON sa.Register_Number = sm.Register_Number
      WHERE DATE(sa.Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND sa.Att_Status = 'present'
    `, [date]);

    // Query for absent students
    const [absentRows] = await db.query(`
      SELECT sa.Register_Number, sm.Student_Name, sm.Dept_Code, sm.Dept_Name, sm.Father_Mobile, sm.Guardian_Mobile
      FROM student_attendance_entry sa
      JOIN student_master sm ON sa.Register_Number = sm.Register_Number
      WHERE DATE(sa.Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND sa.Att_Status ='absent'
    `, [date]);

    res.status(200).json({
      success: true,
      data: {
        present: {
          count: presentRows.length,
          students: presentRows
        },
        absent: {
          count: absentRows.length,
          students: absentRows
        },
        date
      }
    });
  } catch (error) {
    console.error('Error fetching attendance details by date:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance details',
      error: error.message
    });
  }
};

// Get onDuty and medicalLeave student lists and counts by date
export const getAttendanceDetailsByType = async (req, res) => {
  try {
    const { date, type } = req.query;
    if (!date || !type) {
      return res.status(400).json({
        success: false,
        message: 'Date and type parameters are required'
      });
    }

    let attStatus;
    let typeName;

    if (type === 'onDuty') {
      attStatus = 'onDuty';
      typeName = 'onDuty';
    } else if (type === 'medicalLeave') {
      attStatus = 'medicalLeave';
      typeName = 'medicalLeave';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid type parameter'
      });
    }

    // Query for students with specific status
    const [rows] = await db.query(`
      SELECT sa.Register_Number, sm.Student_Name, sm.Dept_Code, sm.Dept_Name, sm.Father_Mobile, sm.Guardian_Mobile
      FROM student_attendance_entry sa
      JOIN student_master sm ON sa.Register_Number = sm.Register_Number
      WHERE DATE(sa.Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND sa.Att_Status = ?
    `, [date, attStatus]);

    res.status(200).json({
      success: true,
      data: {
        [typeName]: {
          count: rows.length,
          students: rows
        },
        date
      }
    });
  } catch (error) {
    console.error('Error fetching attendance details by type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance details',
      error: error.message
    });
  }
};

// NEW: Get library statistics
export const getLibraryStats = async (req, res) => {
  try {
    // Total books in library (if you have a books table)
    const [totalBooksResult] = await db.query(`
      SELECT COUNT(*) as total FROM book_master
    `).catch(() => [{ total: 0 }]);

    // Books currently issued
    const [issuedBooksResult] = await db.query(`
      SELECT COUNT(*) as total FROM book_issue 
      WHERE return_date IS NULL OR return_date = '0000-00-00'
    `).catch(() => [{ total: 0 }]);

    // Overdue books (due date passed and not returned)
    const [overdueBooksResult] = await db.query(`
      SELECT COUNT(*) as total FROM book_issue 
      WHERE (return_date IS NULL OR return_date = '0000-00-00')
        AND due_date < CURDATE()
    `).catch(() => [{ total: 0 }]);

    const totalBooks = parseInt(totalBooksResult[0]?.total) || 0;
    const issuedBooks = parseInt(issuedBooksResult[0]?.total) || 0;
    const overdueBooks = parseInt(overdueBooksResult[0]?.total) || 0;
    const availableBooks = totalBooks - issuedBooks;

    res.status(200).json({
      success: true,
      data: {
        totalBooks,
        issuedBooks,
        overdueBooks,
        availableBooks
      }
    });
  } catch (error) {
    console.error('Error fetching library stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch library statistics',
      error: error.message
    });
  }
};

// NEW: Get fee collection metrics
export const getFeeMetrics = async (req, res) => {
  try {
    const now = new Date();
    const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];
    const currentMonth = istDate.substring(0, 7); // YYYY-MM

    // Today's collection
    const [todayResult] = await db.query(`
      SELECT COALESCE(SUM(Amount_Paid), 0) as total 
      FROM fee_collection 
      WHERE DATE(Payment_Date) = STR_TO_DATE(?, '%Y-%m-%d')
    `, [istDate]).catch(() => [{ total: 0 }]);

    // This month's collection
    const [monthResult] = await db.query(`
      SELECT COALESCE(SUM(Amount_Paid), 0) as total 
      FROM fee_collection 
      WHERE DATE_FORMAT(Payment_Date, '%Y-%m') = ?
    `, [currentMonth]).catch(() => [{ total: 0 }]);

    // Pending fees count (students with balance > 0)
    const [pendingResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total 
      FROM fee_ledger 
      WHERE Balance > 0
    `).catch(() => [{ total: 0 }]);

    res.status(200).json({
      success: true,
      data: {
        todayCollection: parseInt(todayResult[0]?.total) || 0,
        monthCollection: parseInt(monthResult[0]?.total) || 0,
        pendingCount: parseInt(pendingResult[0]?.total) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching fee metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fee metrics',
      error: error.message
    });
  }
};

// NEW: Get exam analytics
export const getExamAnalytics = async (req, res) => {
  try {
    // Average marks across all exams
    const [avgResult] = await db.query(`
      SELECT AVG(Marks_Obtained) as average 
      FROM unit_test_marks 
      WHERE Marks_Obtained IS NOT NULL
    `).catch(() => [{ average: 0 }]);

    // Pass/Fail statistics (assuming pass mark is 50)
    const [passFailResult] = await db.query(`
      SELECT 
        SUM(CASE WHEN Marks_Obtained >= 50 THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN Marks_Obtained < 50 THEN 1 ELSE 0 END) as failed
      FROM unit_test_marks 
      WHERE Marks_Obtained IS NOT NULL
    `).catch(() => [{ passed: 0, failed: 0 }]);

    res.status(200).json({
      success: true,
      data: {
        averageMarks: parseFloat(avgResult[0]?.average || 0).toFixed(2),
        passed: parseInt(passFailResult[0]?.passed) || 0,
        failed: parseInt(passFailResult[0]?.failed) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching exam analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch exam analytics',
      error: error.message
    });
  }
};

// NEW: Get health center statistics
export const getHealthStats = async (req, res) => {
  try {
    const now = new Date();
    const istDate = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Today's health center visits
    const [todayVisitsResult] = await db.query(`
      SELECT COUNT(*) as total 
      FROM health_records 
      WHERE DATE(visit_date) = STR_TO_DATE(?, '%Y-%m-%d')
    `, [istDate]).catch(() => [{ total: 0 }]);

    // Medical leave count for today
    const [medicalLeaveResult] = await db.query(`
      SELECT COUNT(DISTINCT Register_Number) as total 
      FROM student_attendance_entry
      WHERE DATE(Att_Date) = STR_TO_DATE(?, '%Y-%m-%d')
        AND Att_Status = 'medicalLeave'
    `, [istDate]);

    res.status(200).json({
      success: true,
      data: {
        todayVisits: parseInt(todayVisitsResult[0]?.total) || 0,
        medicalLeaveToday: parseInt(medicalLeaveResult[0]?.total) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching health stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch health statistics',
      error: error.message
    });
  }
};

// NEW: Get attendance trends (last 30 days)
export const getAttendanceTrends = async (req, res) => {
  try {
    const [results] = await db.query(`
      SELECT 
        DATE(Att_Date) as date,
        overall_present_percentage as percentage
      FROM overall_att_date_wise
      WHERE Att_Date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      ORDER BY Att_Date ASC
    `);

    const formattedData = results.map(row => ({
      date: row.date,
      percentage: parseInt(row.percentage) || 0
    }));

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('Error fetching attendance trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance trends',
      error: error.message
    });
  }
};

// NEW: Get quick stats for dashboard
export const getQuickStats = async (req, res) => {
  try {
    // Active transport routes
    const [transportResult] = await db.query(`
      SELECT COUNT(DISTINCT Route_No) as total 
      FROM transport_master
    `).catch(() => [{ total: 0 }]);

    // Pending applications (if you have an applications table)
    const [applicationsResult] = await db.query(`
      SELECT COUNT(*) as total 
      FROM student_enquiry 
      WHERE last_status = 'Pending'
    `).catch(() => [{ total: 0 }]);

    res.status(200).json({
      success: true,
      data: {
        transportRoutes: parseInt(transportResult[0]?.total) || 0,
        pendingApplications: parseInt(applicationsResult[0]?.total) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick statistics',
      error: error.message
    });
  }
};