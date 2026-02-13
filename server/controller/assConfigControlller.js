import pool from '../db.js';

// Get all courses from course_master
export const getCourses = async (req, res) => {
  try {
    const [courses] = await pool.query(
      'SELECT id, Course_Name as name FROM course_master ORDER BY Course_Name'
    );
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Get all departments from course_details
export const getDepartments = async (req, res) => {
  try {
    const [departments] = await pool.query(
      'SELECT id, Dept_Name as name, Dept_Code as code FROM course_details ORDER BY Dept_Name'
    );
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

// Get all semesters from semester_master
export const getSemesters = async (req, res) => {
  try {
    const [semesters] = await pool.query(
      'SELECT id, Semester as semester, Year as year FROM semester_master ORDER BY Semester'
    );
    res.json(semesters);
  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
};

// Get all regulations from regulation_master
export const getRegulations = async (req, res) => {
  try {
    const [regulations] = await pool.query(
      'SELECT id, Regulation as regulation FROM regulation_master ORDER BY Regulation DESC'
    );
    res.json(regulations);
  } catch (error) {
    console.error('Error fetching regulations:', error);
    res.status(500).json({ error: 'Failed to fetch regulations' });
  }
};

// Get subjects based on dept code, semester, regulation, and assessment type
export const getSubjects = async (req, res) => {
  try {
    const { deptCode, semester, regulation, assessmentType } = req.query;
    
    if (!deptCode || !semester || !regulation) {
      return res.status(400).json({ error: 'deptCode, semester, and regulation are required' });
    }

    // Determine Sub_Type based on assessment type
    let subType = null;
    if (assessmentType === 'Practical') {
      subType = 'P';
    } else if (assessmentType === 'Assignment' || assessmentType === 'Unit Test') {
      subType = 'T';
    }

    let query = `
      SELECT id, Sub_Name as subjectName, Sub_Code as subjectCode, Sub_Type as subType
      FROM subject_master
      WHERE Dept_Code = ?
        AND Semester = ?
        AND Regulation = ?
    `;
    const params = [deptCode, semester, regulation];

    // Add Sub_Type filter if assessment type is provided
    if (subType) {
      query += ` AND Sub_Type = ?`;
      params.push(subType);
    }

    query += ` ORDER BY Sub_Name`;

    const [subjects] = await pool.query(query, params);

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

// Get sections based on dept, semester, and regulation
export const getSections = async (req, res) => {
  try {
    const { deptId, semesterId, regulationId } = req.query;
    
    if (!deptId || !semesterId || !regulationId) {
      return res.status(400).json({ error: 'deptId, semesterId, and regulationId are required' });
    }

    const [sections] = await pool.query(`
      SELECT DISTINCT sm.Class as section
      FROM student_master sm
      INNER JOIN course_details cd ON sm.Dept_Code = cd.Dept_Code
      WHERE cd.id = ?
        AND sm.Semester = (SELECT Semester FROM semester_master WHERE id = ?)
        AND sm.Regulation = (SELECT Regulation FROM regulation_master WHERE id = ?)
      ORDER BY sm.Class
    `, [deptId, semesterId, regulationId]);

    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
};

// Get next test number for assessment configuration
export const getNextTestNumber = async (req, res) => {
  try {
    const { deptCode, semester, regulation, section, subjectCode, assessmentType } = req.query;
    
    if (!deptCode || !semester || !regulation || !section || !subjectCode || !assessmentType) {
      return res.status(400).json({ 
        error: 'deptCode, semester, regulation, section, subjectCode, and assessmentType are required' 
      });
    }

    // Get the maximum test number for the given criteria
    const [result] = await pool.query(`
      SELECT COALESCE(MAX(Test_No), 0) as maxTestNo
      FROM assessment_configuration
      WHERE Dept_Code = ?
        AND Semester = ?
        AND Regulation = ?
        AND Class_Section = ?
        AND Sub_Code = ?
        AND Assessment_Type = ?
    `, [deptCode, semester, regulation, section, subjectCode, assessmentType]);

    const nextTestNo = (result[0].maxTestNo || 0) + 1;
    res.json({ nextTestNo });
  } catch (error) {
    console.error('Error fetching next test number:', error);
    res.status(500).json({ error: 'Failed to fetch next test number' });
  }
};

// Get all assessment configurations
export const getAssessmentConfigs = async (req, res) => {
  try {
    const [configs] = await pool.query(`
      SELECT 
        id,
        Course_Name as courseName,
        Dept_Name as branch,
        Dept_Code as branchCode,
        Semester as semester,
        Regulation as regulation,
        Class_Section as section,
        Sub_Code as subjectCode,
        Sub_Name as subjectName,
        Assessment_Type as assessmentType,
        Assessment_Date as assessmentDate,
        Max_Marks as maxMarks,
        Test_No as testNo,
        Experiment_Count as experimentCount
      FROM assessment_configuration
      ORDER BY id DESC
    `);
    res.json(configs);
  } catch (error) {
    console.error('Error fetching assessment configurations:', error);
    res.status(500).json({ error: 'Failed to fetch assessment configurations' });
  }
};

// Create new assessment configuration
export const createAssessmentConfig = async (req, res) => {
  try {
    const {
      deptId,
      semesterId,
      regulationId,
      courseId,
      section,
      assessmentType,
      assessmentDate,
      maxMarks,
      testNo,
      subjectName,
      subjectCode,
      experimentCount
    } = req.body;

    // First, get the actual values from the IDs
    const [courseData] = await pool.query('SELECT Course_Name FROM course_master WHERE id = ?', [courseId]);
    const [deptData] = await pool.query('SELECT Dept_Name, Dept_Code FROM course_details WHERE id = ?', [deptId]);
    const [semesterData] = await pool.query('SELECT Semester FROM semester_master WHERE id = ?', [semesterId]);
    const [regulationData] = await pool.query('SELECT Regulation FROM regulation_master WHERE id = ?', [regulationId]);

    // Only save experiment count if assessment type is Practical
    const expCount = assessmentType === 'Practical' ? (experimentCount || null) : null;

    const [result] = await pool.query(
      `INSERT INTO assessment_configuration 
      (Course_Name, Dept_Name, Dept_Code, Semester, Regulation, Class_Section, Sub_Code, Sub_Name, Assessment_Type, Assessment_Date, Max_Marks, Test_No, Experiment_Count) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        courseData[0].Course_Name,
        deptData[0].Dept_Name,
        deptData[0].Dept_Code,
        semesterData[0].Semester,
        regulationData[0].Regulation,
        section,
        subjectCode,
        subjectName,
        assessmentType,
        assessmentDate,
        maxMarks,
        testNo,
        expCount
      ]
    );

    res.status(201).json({ 
      message: 'Assessment configuration created successfully',
      id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating assessment configuration:', error);
    res.status(500).json({ error: 'Failed to create assessment configuration' });
  }
};

// Update assessment configuration
export const updateAssessmentConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      deptId,
      semesterId,
      regulationId,
      courseId,
      section,
      assessmentType,
      assessmentDate,
      maxMarks,
      testNo,
      experimentCount,
      subjectId,
      subjectName,
      subjectCode
    } = req.body;

    // First, get the actual values from the IDs
    const [courseData] = await pool.query('SELECT Course_Name FROM course_master WHERE id = ?', [courseId]);
    const [deptData] = await pool.query('SELECT Dept_Name, Dept_Code FROM course_details WHERE id = ?', [deptId]);
    const [semesterData] = await pool.query('SELECT Semester FROM semester_master WHERE id = ?', [semesterId]);
    const [regulationData] = await pool.query('SELECT Regulation FROM regulation_master WHERE id = ?', [regulationId]);

    // Only save experiment count if assessment type is Practical
    const expCount = assessmentType === 'Practical' ? (experimentCount || null) : null;

    await pool.query(
      `UPDATE assessment_configuration 
      SET Course_Name = ?, Dept_Name = ?, Dept_Code = ?, Semester = ?, Regulation = ?, 
          Class_Section = ?, Sub_Code = ?, Sub_Name = ?, Assessment_Type = ?, 
          Assessment_Date = ?, Max_Marks = ?, Test_No = ?, Experiment_Count = ?
      WHERE id = ?`,
      [
        courseData[0].Course_Name,
        deptData[0].Dept_Name,
        deptData[0].Dept_Code,
        semesterData[0].Semester,
        regulationData[0].Regulation,
        section,
        subjectCode,
        subjectName,
        assessmentType,
        assessmentDate,
        maxMarks,
        testNo,
        expCount,
        id
      ]
    );

    res.json({ message: 'Assessment configuration updated successfully' });
  } catch (error) {
    console.error('Error updating assessment configuration:', error);
    res.status(500).json({ error: 'Failed to update assessment configuration' });
  }
};

// Delete assessment configuration
export const deleteAssessmentConfig = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM assessment_configuration WHERE id = ?', [id]);
    res.json({ message: 'Assessment configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting assessment configuration:', error);
    res.status(500).json({ error: 'Failed to delete assessment configuration' });
  }
};
