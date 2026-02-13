import pool from '../db.js';

// Get distinct departments from course_details
export const getDepartments = async (req, res) => {
  try {
    const [departments] = await pool.query(`
      SELECT DISTINCT Dept_Name as deptName, Dept_Code as deptCode
      FROM course_details
      ORDER BY Dept_Name
    `);
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

// Get semesters from semester_master for selected department
export const getSemesters = async (req, res) => {
  try {
    const [semesters] = await pool.query(`
      SELECT DISTINCT Semester as semester, Year as year
      FROM semester_master
      WHERE Semester IS NOT NULL
      ORDER BY Semester ASC
    `);
    res.json(semesters);
  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
};

// Get regulations from regulation_master
export const getRegulations = async (req, res) => {
  try {
    const { deptCode, semester } = req.query;

    if (!deptCode || !semester) {
      return res.status(400).json({ error: 'deptCode and semester are required' });
    }

    const [regulations] = await pool.query(`
      SELECT DISTINCT Regulation as regulation
      FROM regulation_master
      WHERE Regulation IS NOT NULL
      ORDER BY Regulation DESC
    `);
    res.json(regulations);
  } catch (error) {
    console.error('Error fetching regulations:', error);
    res.status(500).json({ error: 'Failed to fetch regulations' });
  }
};

// Get subjects from subject_master filtered by dept_code, semester, and regulation
export const getSubjects = async (req, res) => {
  try {
    const { deptCode, semester, regulation } = req.query;

    if (!deptCode || !semester || !regulation) {
      return res.status(400).json({ error: 'deptCode, semester, and regulation are required' });
    }

    const [subjects] = await pool.query(`
      SELECT DISTINCT 
        Sub_Name as subjectName,
        Sub_Code as subjectCode,
        Internal_Min_Mark as internalMinMark,
        External_Min_Mark as externalMinMark,
        Internal_Max_Mark as internalMaxMark,
        External_Max_Mark as externalMaxMark
      FROM subject_master
      WHERE Dept_Code = ?
        AND Semester = ?
        AND Regulation = ?
      ORDER BY Sub_Name
    `, [deptCode, semester, regulation]);

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

// Get academic years from academic_year_master
export const getAcademicYears = async (req, res) => {
  try {
    const [academicYears] = await pool.query(`
      SELECT DISTINCT Academic_Year as academicYear
      FROM academic_year_master
      WHERE Academic_Year IS NOT NULL
      ORDER BY Academic_Year DESC
    `);
    res.json(academicYears);
  } catch (error) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({ error: 'Failed to fetch academic years' });
  }
};

// Get students from student_master filtered by all criteria
export const getStudents = async (req, res) => {
  try {
    const { deptCode, semester, regulation, academicYear, subjectCode } = req.query;

    if (!deptCode || !semester || !regulation || !academicYear || !subjectCode) {
      return res.status(400).json({ error: 'All filter parameters (including subjectCode) are required' });
    }

    const [students] = await pool.query(`
      SELECT 
        s.Register_Number as registerNo,
        s.Student_Name as studentName,
        s.Dept_Code as deptCode,
        s.Semester as semester,
        s.Regulation as regulation,
        s.Academic_Year as academicYear,
        u.Internal_Mark as internalMark,
        u.External_Mark as externalMark,
        u.Attempt_Level as attemptLevel
      FROM student_master s
      LEFT JOIN univ_mark_entered u ON 
        s.Register_Number = u.Register_Number AND 
        u.Sub_Code = ? AND 
        u.Academic_Year = ? AND
        u.Semester = ? AND
        u.Dept_Code = ?
      WHERE s.Dept_Code = ?
        AND s.Semester = ?
        AND s.Regulation = ?
        AND s.Academic_Year = ?
      ORDER BY s.Register_Number
    `, [subjectCode, academicYear, semester, deptCode, deptCode, semester, regulation, academicYear]);

    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Get subject details (min marks) for marking rules
export const getSubjectDetails = async (req, res) => {
  try {
    const { subjectCode, deptCode, semester, regulation } = req.query;

    if (!subjectCode || !deptCode || !semester || !regulation) {
      return res.status(400).json({ error: 'All parameters are required' });
    }

    const [subjectDetails] = await pool.query(`
      SELECT 
        Internal_Min_Mark as internalMinMark,
        External_Min_Mark as externalMinMark
      FROM subject_master
      WHERE Sub_Code = ?
        AND Dept_Code = ?
        AND Semester = ?
        AND Regulation = ?
      LIMIT 1
    `, [subjectCode, deptCode, semester, regulation]);

    if (subjectDetails.length === 0) {
      return res.status(404).json({ error: 'Subject details not found' });
    }

    res.json(subjectDetails[0]);
  } catch (error) {
    console.error('Error fetching subject details:', error);
    res.status(500).json({ error: 'Failed to fetch subject details' });
  }
};

// Save UNIV marks
export const saveUNIVMarks = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      deptCode,
      semester,
      regulation,
      subjectCode,
      subjectName,
      academicYear,
      enteredBy,
      marks
    } = req.body;

    if (!marks || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ error: 'marks array is required' });
    }

    if (!deptCode || !semester || !regulation || !subjectCode || !subjectName || !academicYear || !enteredBy) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    await connection.beginTransaction();

    // Mandatory mark validation removed as per request to allow NULL entries

    // Get subject min marks
    const [subjectDetails] = await connection.query(`
      SELECT Internal_Min_Mark as internalMinMark, External_Min_Mark as externalMinMark
      FROM subject_master
      WHERE Sub_Code = ? AND Dept_Code = ? AND Semester = ? AND Regulation = ?
      LIMIT 1
    `, [subjectCode, deptCode, semester, regulation]);

    if (subjectDetails.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Subject not found' });
    }

    const { internalMinMark, externalMinMark } = subjectDetails[0];

    // Prepare bulk insert data
    const insertPromises = marks.map(async mark => {
      let internalMark = mark.internalMark;
      let externalMark = mark.externalMark;

      // Default empty/null to 0
      if (internalMark === '' || internalMark === null || internalMark === undefined) internalMark = '0';
      if (externalMark === '' || externalMark === null || externalMark === undefined) externalMark = '0';

      let total = null;
      let status = null;

      // Handle Absent case
      if (internalMark === 'A' || externalMark === 'A') {
        total = 'A';
        status = 'F';
      } else {
        const intMark = parseInt(internalMark) || 0;
        const extMark = parseInt(externalMark) || 0;
        total = (intMark + extMark).toString();
        status = (intMark >= internalMinMark && extMark >= externalMinMark) ? 'P' : 'F';
      }

      const attemptLevel = mark.attemptLevel || '';

      // Validation for negative marks
      if ((internalMark !== 'A' && parseInt(internalMark) < 0) || (externalMark !== 'A' && parseInt(externalMark) < 0)) {
        throw new Error(`Invalid negative marks for student ${mark.registerNo}`);
      }

      // Check if record exists for this student and subject
      const [existing] = await connection.query(`
        SELECT id FROM univ_mark_entered 
        WHERE Register_Number = ? AND Sub_Code = ? AND Semester = ? AND Academic_Year = ? AND Dept_Code = ?
      `, [mark.registerNo, subjectCode, semester, academicYear, deptCode]);

      if (existing.length > 0) {
        // Update existing record
        return connection.query(`
          UPDATE univ_mark_entered SET
            Internal_Mark = ?,
            External_Mark = ?,
            Total_Mark = ?,
            Status = ?,
            Attempt_Level = ?,
            UpdatedAt = NOW()
          WHERE id = ?
        `, [internalMark, externalMark, total, status, attemptLevel, existing[0].id]);
      } else {
        // Insert new record
        return connection.query(`
          INSERT INTO univ_mark_entered (
            Register_Number,
            Student_Name,
            Dept_Code,
            Semester,
            Regulation,
            Sub_Code,
            Sub_Name,
            Internal_Mark,
            External_Mark,
            Total_Mark,
            Status,
            Attempt_Level,
            Academic_Year,
            Entered_By,
            CreatedAt,
            UpdatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          mark.registerNo,
          mark.studentName,
          deptCode,
          semester,
          regulation,
          subjectCode,
          subjectName,
          internalMark,
          externalMark,
          total,
          status,
          attemptLevel,
          academicYear,
          enteredBy
        ]);
      }
    });

    await Promise.all(insertPromises);
    await connection.commit();

    res.json({
      message: `UNIV marks saved successfully for ${marks.length} students`,
      count: marks.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving UNIV marks:', error);
    res.status(500).json({ error: error.message || 'Failed to save UNIV marks' });
  } finally {
    connection.release();
  }
};
