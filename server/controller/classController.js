import db from '../db.js';


// Get students based on class allocation details
export const getStudentsByAllocation = async (req, res) => {
  try {
    const { Course_Name, Dept_Code, Semester, Year, Regulation } = req.query;
    
    if (!Course_Name || !Dept_Code || !Semester || !Year || !Regulation) {
      return res.status(400).json({ error: 'All parameters are required' });
    }

    const sql = `
      SELECT Roll_Number, Register_Number, Student_Name, Class, Class_Teacher 
      FROM student_master 
      WHERE Course_Name = ? 
        AND Dept_Code = ? 
        AND Semester = ? 
        AND Year = ? 
        AND Regulation = ? 
        AND Admission_Status = 'Admitted'
      ORDER BY Roll_Number
    `;
    
    const [rows] = await db.query(sql, [Course_Name, Dept_Code, Semester, Year, Regulation]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get staff based on course and department
export const getStaffByDepartment = async (req, res) => {
  try {
    const { Course_Name, Dept_Code } = req.query;
    
    if (!Course_Name || !Dept_Code) {
      return res.status(400).json({ error: 'Course_Name and Dept_Code are required' });
    }

    const sql = `
      SELECT DISTINCT Staff_ID, Staff_Name, Designation
      FROM staff_master
      WHERE Course_Name = ? 
        AND Dept_Code = ?
      ORDER BY Staff_ID
    `;
    
    const [rows] = await db.query(sql, [Course_Name, Dept_Code]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get distinct classes from class_master
export const getDistinctClasses = async (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT Class_Name 
      FROM class_master 
      ORDER BY Class_Name
    `;
    
    const [rows] = await db.query(sql);
    res.json(rows.map(row => row.Class_Name));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create new class in class_master
export const createClass = async (req, res) => {
  try {
    const { className } = req.body;
    
    if (!className) {
      return res.status(400).json({ error: 'Class name is required' });
    }

    // Check if class already exists (case-insensitive)
    const [existingClasses] = await db.query(
      'SELECT Class_Name FROM class_master WHERE LOWER(Class_Name) = LOWER(?)',
      [className]
    );

    if (existingClasses.length > 0) {
      return res.status(400).json({ 
        error: 'Class already exists. Please select from existing classes.' 
      });
    }

    const [result] = await db.query(
      'INSERT INTO class_master (Class_Name) VALUES (?)',
      [className]
    );

    res.status(201).json({ 
      success: true, 
      id: result.insertId,
      className 
    });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ error: 'Failed to create class' });
  }
};

// Update students with section and class teacher
export const updateStudentsClassInfo = async (req, res) => {
  try {
    const { rollNumbers, section, classTeacher, courseName, deptCode } = req.body;
    
    if (!rollNumbers || !Array.isArray(rollNumbers) || rollNumbers.length === 0) {
      return res.status(400).json({ error: 'Roll numbers array is required' });
    }
    
    if (!section || !classTeacher || !courseName || !deptCode) {
      return res.status(400).json({ error: 'Section, Class Teacher (Staff ID), Course Name, and Dept Code are required' });
    }

    const placeholders = rollNumbers.map(() => '?').join(',');
    const sql = `
      UPDATE student_master 
      SET Class = ?, Class_Teacher = ?
      WHERE Roll_Number IN (${placeholders})
        AND Course_Name = ?
        AND Dept_Code = ?
    `;
    
    const params = [section, classTeacher, ...rollNumbers, courseName, deptCode];
    const [result] = await db.query(sql, params);
    
    res.json({ 
      message: 'Students updated successfully',
      affectedRows: result.affectedRows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
