import db from '../db.js';

/* -------------------------------------------
   GET: All Courses
-------------------------------------------- */
export const getCourses = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT Course_Name FROM course_master'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

/* -------------------------------------------
   GET: Subjects filtered by dept, sem, reg
-------------------------------------------- */
export const getSubjectsFiltered = async (req, res) => {
  const { deptCode, semester, regulation } = req.query;
  try {
    const [rows] = await db.query(
      'SELECT Sub_Name, Sub_Code, Sub_Type FROM subject_master WHERE Dept_Code = ? AND Semester = ? AND Regulation = ?',
      [deptCode, semester, regulation]
    );
    res.json(rows || []);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};
/* -------------------------------------------
   GET: Check Duplicate Subject Code
-------------------------------------------- */
export const checkSubjectCode = async (req, res) => {
  try {
    const { subCode, deptCode, excludeId } = req.query;

    if (!subCode || !deptCode)
      return res.status(400).json({ exists: false });

    let sql =
      'SELECT id FROM attendance_configuration WHERE Sub_Code = ? AND Dept_Code = ?';
    let params = [subCode, deptCode];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await db.query(sql, params);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('Error checking subject code:', err);
    res.status(500).json({ error: err.message });
  }
};

/* -------------------------------------------
   GET: Departments under a Course
-------------------------------------------- */
export const getDepartmentsByCourse = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT cd.Dept_Name, cd.Dept_Code FROM course_details cd INNER JOIN course_master cm ON cd.Course_Name = cm.Course_Name WHERE cm.Course_Name = ?',
      [req.query.courseName]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

/* -------------------------------------------
   GET: Year based on Semester
-------------------------------------------- */
export const getYearAndRegulation = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT Year FROM semester_master WHERE Semester = ?',
      [req.query.semester]
    );

    if (rows.length === 0) return res.json({});
    res.json({ Year: rows[0].Year || rows[0].year || '' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch year' });
  }
};

/* -------------------------------------------
   GET: Regulations List
-------------------------------------------- */
export const getRegulations = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Regulation FROM regulation_master');
    res.json(rows.map(r => r.Regulation));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch regulations' });
  }
};

/* -------------------------------------------
   GET: Semesters List
-------------------------------------------- */
export const getSemesters = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT Semester, Year FROM semester_master'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
};

/* -------------------------------------------
   POST: Save Attendance Configuration
-------------------------------------------- */
export const saveAttendanceConfig = async (req, res) => {
  const {
    courseName, deptName, deptCode, semester, regulation,
    subCode, subName, subType, totalHours
  } = req.body;

  try {
    await db.query(
      `INSERT INTO attendance_configuration 
        (Course_Name, Dept_Name, Dept_Code, Semester, Regulation, Sub_Code, Sub_Name, Sub_Type, TotalHours, CreatedAt, UpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [courseName, deptName, deptCode, semester, regulation, subCode, subName, subType, totalHours]
    );
    res.json({ success: true, message: 'Attendance configuration saved.' });
  } catch (err) {
    console.error('Error saving attendance configuration:', err);
    res.status(500).json({ error: 'Failed to save attendance configuration' });
  }
};

/* -------------------------------------------
   GET: List All Configurations
-------------------------------------------- */
export const listAttendanceConfigs = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM attendance_configuration');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching configurations:', err);
    res.status(500).json({ error: 'Failed to fetch attendance configurations' });
  }
};

/* -------------------------------------------
   PUT: Update Attendance Configuration
-------------------------------------------- */
export const updateAttendanceConfig = async (req, res) => {
  const id = req.params.id;
  const {
    courseName, deptName, deptCode, semester, regulation,
    subCode, subName, subType, totalHours
  } = req.body;

  try {
    await db.query(
      `UPDATE attendance_configuration SET
        Course_Name = ?, Dept_Name = ?, Dept_Code = ?, Semester = ?, 
        Regulation = ?, Sub_Code = ?, Sub_Name = ?, Sub_Type = ?, 
        TotalHours = ?, UpdatedAt = NOW()
        WHERE id = ?`,
      [courseName, deptName, deptCode, semester, regulation,
       subCode, subName, subType, totalHours, id]
    );
    res.json({ success: true, message: 'Attendance configuration updated.' });
  } catch (err) {
    console.error('Error updating configuration:', err);
    res.status(500).json({ error: 'Failed to update attendance configuration' });
  }
};

/* -------------------------------------------
   DELETE: Remove Configuration
-------------------------------------------- */
export const deleteAttendanceConfig = async (req, res) => {
  try {
    await db.query('DELETE FROM attendance_configuration WHERE id = ?', [
      req.params.id
    ]);
    res.json({ success: true, message: 'Attendance configuration deleted.' });
  } catch (err) {
    console.error('Error deleting configuration:', err);
    res.status(500).json({ error: 'Failed to delete attendance configuration' });
  }
};

