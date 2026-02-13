import db from '../db.js';

// Get all courses from course_master
export const getAllCourses = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM course_master ORDER BY Course_Name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all departments from course_details
export const getAllDepartments = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT Dept_Name, Dept_Code FROM course_details ORDER BY Dept_Name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get departments by course
export const getDepartmentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const [rows] = await db.query(
      'SELECT DISTINCT Dept_Name, Dept_Code FROM course_details WHERE Course_Mode = ? ORDER BY Dept_Name',
      [courseId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all semesters from semester_master
export const getAllSemesters = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM semester_master ORDER BY Semester');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all years from semester_master
export const getAllYears = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT Year FROM semester_master ORDER BY Year');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all regulations from regulation_master
export const getAllRegulations = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM regulation_master ORDER BY Regulation DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get classes from student_master based on filters
export const getClasses = async (req, res) => {
  try {
    const { courseName, deptName, deptCode, semester, year, regulation } = req.query;
    
    let query = 'SELECT DISTINCT class FROM student_master WHERE 1=1';
    const params = [];
    
    if (courseName) {
      query += ' AND course_name = ?';
      params.push(courseName);
    }
    
    if (deptName) {
      query += ' AND Dept_Name = ?';
      params.push(deptName);
    }
    
    if (deptCode) {
      query += ' AND Dept_Code = ?';
      params.push(deptCode);
    }
    
    if (semester) {
      query += ' AND semester = ?';
      params.push(semester);
    }
    
    if (year) {
      query += ' AND year = ?';
      params.push(year);
    }
    
    if (regulation) {
      query += ' AND regulation = ?';
      params.push(regulation);
    }
    
    query += ' ORDER BY class';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get subjects by department, semester, and regulation
export const getSubjects = async (req, res) => {
  try {
    const { deptCode, semester, regulation } = req.query;
    
    let query = 'SELECT Sub_Name, Sub_Code FROM subject_master WHERE 1=1';
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
    
    query += ' ORDER BY Sub_Name';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get timetable by filters
export const getTimetable = async (req, res) => {
  try {
    const { course, deptCode, semester, year, regulation, className } = req.query;
    
    let query = `
      SELECT * FROM class_timetable 
      WHERE 1=1
    `;
    const params = [];
    
    if (course) {
      query += ' AND Course_Name = ?';
      params.push(course);
    }
    
    if (deptCode) {
      query += ' AND Dept_Code = ?';
      params.push(deptCode);
    }
    
    if (semester) {
      query += ' AND Semester = ?';
      params.push(semester);
    }
    
    if (year) {
      query += ' AND Year = ?';
      params.push(year);
    }
    
    if (regulation) {
      query += ' AND Regulation = ?';
      params.push(regulation);
    }
    
    if (className) {
      query += ' AND Class_Section = ?';
      params.push(className);
    }
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Save or update timetable
export const saveTimetable = async (req, res) => {
  try {
    const { 
      course, 
      deptCode, 
      deptName,
      semester, 
      year, 
      regulation, 
      className, 
      timetableData 
    } = req.body;

    // First, delete existing timetable for this combination
    await db.query(
      `DELETE FROM class_timetable 
       WHERE Course_Name = ? AND Dept_Code = ? AND Semester = ? AND Year = ? AND Regulation = ? AND Class_Section = ?`,
      [course, deptCode, semester, year, regulation, className]
    );

    // Group timetable data by day
    if (timetableData && timetableData.length > 0) {
      const dayMap = {};
      
      timetableData.forEach(entry => {
        if (!dayMap[entry.day]) {
          dayMap[entry.day] = {
            day: entry.day,
            periods: {}
          };
        }
        dayMap[entry.day].periods[entry.period] = entry.subjectCode;
      });

      // Insert one row per day
      for (const day in dayMap) {
        const dayData = dayMap[day];
        await db.query(
          `INSERT INTO class_timetable 
           (Course_Name, Dept_Code, Dept_Name, Semester, Year, Regulation, Class_Section, Day_Order, Period_1, Period_2, Period_3, Period_4, Period_5, Period_6) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            course,
            deptCode,
            deptName,
            semester,
            year,
            regulation,
            className,
            day,
            dayData.periods[1] || null,
            dayData.periods[2] || null,
            dayData.periods[3] || null,
            dayData.periods[4] || null,
            dayData.periods[5] || null,
            dayData.periods[6] || null
          ]
        );
      }
    }

    res.json({ message: 'Timetable saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete timetable
export const deleteTimetable = async (req, res) => {
  try {
    const { course, deptCode, semester, year, regulation, className } = req.body;
    
    await db.query(
      `DELETE FROM timetable 
       WHERE Course = ? AND Dept_Code = ? AND Semester = ? AND Year = ? AND Regulation = ? AND Class = ?`,
      [course, deptCode, semester, year, regulation, className]
    );
    
    res.json({ message: 'Timetable deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update single cell in timetable
export const updateTimetableCell = async (req, res) => {
  try {
    const { 
      course, 
      deptCode, 
      semester, 
      year, 
      regulation, 
      className,
      day,
      period,
      subjectCode,
      subjectName
    } = req.body;

    // Check if entry exists
    const [existing] = await db.query(
      `SELECT * FROM class_timetable 
       WHERE Course_Name = ? AND Dept_Code = ? AND Semester = ? AND Year = ? 
       AND Regulation = ? AND Class_Section = ? AND Day_Order = ?`,
      [course, deptCode, semester, year, regulation, className, day]
    );

    if (existing.length > 0) {
      // Update existing entry - update the specific period column
      const periodColumn = `Period_${period}`;
      await db.query(
        `UPDATE class_timetable 
         SET ${periodColumn} = ?
         WHERE Course_Name = ? AND Dept_Code = ? AND Semester = ? AND Year = ? 
         AND Regulation = ? AND Class_Section = ? AND Day_Order = ?`,
        [subjectCode, course, deptCode, semester, year, regulation, className, day]
      );
    } else {
      // Insert new entry
      const [deptInfo] = await db.query(
        'SELECT Dept_Name FROM course_details WHERE Dept_Code = ? LIMIT 1',
        [deptCode]
      );
      
      const deptName = deptInfo.length > 0 ? deptInfo[0].Dept_Name : '';
      
      // Insert new entry with the period in the correct column
      const periodColumn = `Period_${period}`;
      await db.query(
        `INSERT INTO class_timetable 
         (Course_Name, Dept_Code, Dept_Name, Semester, Year, Regulation, Class_Section, Day_Order, ${periodColumn})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [course, deptCode, deptName, semester, year, regulation, className, day, subjectCode]
      );
    }

    res.json({ message: 'Timetable cell updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
