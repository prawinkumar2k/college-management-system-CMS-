import pool from '../db.js';

// Get distinct courses where Assessment_Type = 'Unit Test'
export const getCourses = async (req, res) => {
  try {
    const [courses] = await pool.query(`
      SELECT DISTINCT Course_Name as courseName
      FROM assessment_configuration
      WHERE Assessment_Type = 'Unit Test'
      ORDER BY Course_Name
    `);
    res.json(courses);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
};

// Get distinct departments for a selected course
export const getDepartments = async (req, res) => {
  try {
    const { courseName } = req.query;

    if (!courseName) {
      return res.status(400).json({ error: 'courseName is required' });
    }

    const [departments] = await pool.query(`
      SELECT DISTINCT Dept_Name as deptName, Dept_Code as deptCode
      FROM assessment_configuration
      WHERE Assessment_Type = 'Unit Test'
        AND Course_Name = ?
      ORDER BY Dept_Name
    `, [courseName]);

    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

// Get distinct semesters for selected course and department
export const getSemesters = async (req, res) => {
  try {
    const { courseName, deptName } = req.query;

    if (!courseName || !deptName) {
      return res.status(400).json({ error: 'courseName and deptName are required' });
    }

    const [semesters] = await pool.query(`
      SELECT DISTINCT Semester as semester
      FROM assessment_configuration
      WHERE Assessment_Type = 'Unit Test'
        AND Course_Name = ?
        AND Dept_Name = ?
      ORDER BY Semester
    `, [courseName, deptName]);

    res.json(semesters);
  } catch (error) {
    console.error('Error fetching semesters:', error);
    res.status(500).json({ error: 'Failed to fetch semesters' });
  }
};

// Get distinct regulations
export const getRegulations = async (req, res) => {
  try {
    const { courseName, deptName, semester } = req.query;

    if (!courseName || !deptName || !semester) {
      return res.status(400).json({ error: 'courseName, deptName, and semester are required' });
    }

    const [regulations] = await pool.query(`
      SELECT DISTINCT Regulation as regulation
      FROM assessment_configuration
      WHERE Assessment_Type = 'Unit Test'
        AND Course_Name = ?
        AND Dept_Name = ?
        AND Semester = ?
      ORDER BY Regulation DESC
    `, [courseName, deptName, semester]);

    res.json(regulations);
  } catch (error) {
    console.error('Error fetching regulations:', error);
    res.status(500).json({ error: 'Failed to fetch regulations' });
  }
};

// Get distinct sections
export const getSections = async (req, res) => {
  try {
    const { courseName, deptName, semester, regulation } = req.query;

    if (!courseName || !deptName || !semester || !regulation) {
      return res.status(400).json({ error: 'All filter parameters are required' });
    }

    const [sections] = await pool.query(`
      SELECT DISTINCT Class_Section as section
      FROM assessment_configuration
      WHERE Assessment_Type = 'Unit Test'
        AND Course_Name = ?
        AND Dept_Name = ?
        AND Semester = ?
        AND Regulation = ?
      ORDER BY Class_Section
    `, [courseName, deptName, semester, regulation]);

    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
};

// Get distinct subjects
export const getSubjects = async (req, res) => {
  try {
    const { courseName, deptName, semester, regulation, section } = req.query;

    if (!courseName || !deptName || !semester || !regulation || !section) {
      return res.status(400).json({ error: 'All filter parameters are required' });
    }

    const [subjects] = await pool.query(`
      SELECT DISTINCT Sub_Name as subjectName, Sub_Code as subjectCode
      FROM assessment_configuration
      WHERE Assessment_Type = 'Unit Test'
        AND Course_Name = ?
        AND Dept_Name = ?
        AND Semester = ?
        AND Regulation = ?
        AND Class_Section = ?
      ORDER BY Sub_Name
    `, [courseName, deptName, semester, regulation, section]);

    res.json(subjects);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

// Get distinct unit test numbers (Test_No) with dates and max marks
export const getUnitTests = async (req, res) => {
  try {
    const { courseName, deptName, semester, regulation, section, subjectName } = req.query;

    if (!courseName || !deptName || !semester || !regulation || !section || !subjectName) {
      return res.status(400).json({ error: 'All filter parameters are required' });
    }

    const [unitTests] = await pool.query(`
      SELECT DISTINCT 
        Test_No as testNo,
        Assessment_Date as assessmentDate,
        Max_Marks as maxMarks
      FROM assessment_configuration
      WHERE Assessment_Type = 'Unit Test'
        AND Course_Name = ?
        AND Dept_Name = ?
        AND Semester = ?
        AND Regulation = ?
        AND Class_Section = ?
        AND Sub_Name = ?
      ORDER BY Test_No
    `, [courseName, deptName, semester, regulation, section, subjectName]);

    res.json(unitTests);
  } catch (error) {
    console.error('Error fetching unit tests:', error);
    res.status(500).json({ error: 'Failed to fetch unit tests' });
  }
};

// Get distinct staff names for a course and department
export const getStaff = async (req, res) => {
  try {
    const { courseName, deptName } = req.query;

    if (!courseName || !deptName) {
      return res.status(400).json({ error: 'courseName and deptName are required' });
    }

    // First get the Dept_Code from assessment_configuration based on deptName
    const [deptInfo] = await pool.query(`
      SELECT DISTINCT Dept_Code as deptCode
      FROM assessment_configuration
      WHERE Dept_Name = ?
      LIMIT 1
    `, [deptName]);

    if (deptInfo.length === 0) {
      return res.json([]);
    }

    const deptCode = deptInfo[0].deptCode;

    // Now fetch staff from staff_master table
    const [staff] = await pool.query(`
      SELECT DISTINCT Staff_Name as staffName, Staff_ID as staffId
      FROM staff_master
      WHERE Course_Name = ?
        AND Dept_Code = ?
      ORDER BY Staff_Name
    `, [courseName, deptCode]);

    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

// Check if marks are already entered
export const checkMarksEntered = async (req, res) => {
  try {
    const {
      courseName,
      deptName,
      deptCode,
      semester,
      regulation,
      section,
      subjectCode,
      unitTestNo,
      unitTestDate
    } = req.query;

    if (!courseName || !deptName || !deptCode || !semester || !regulation || !section || !subjectCode || !unitTestNo || !unitTestDate) {
      return res.status(400).json({ error: 'All filter parameters are required' });
    }

    // Check if any marks exist for this combination
    const [result] = await pool.query(`
      SELECT COUNT(*) as count
      FROM unit_test_mark_entered
      WHERE Course_Name = ?
        AND Dept_Code = ?
        AND Dept_Name = ?
        AND Semester = ?
        AND Regulation = ?
        AND Class_Section = ?
        AND Sub_Code = ?
        AND Test_No = ?
        AND Assessment_Date = ?
    `, [courseName, deptCode, deptName, semester, regulation, section, subjectCode, unitTestNo, unitTestDate]);

    const alreadyEntered = result[0].count > 0;

    res.json({ alreadyEntered });
  } catch (error) {
    console.error('Error checking marks:', error);
    res.status(500).json({ error: 'Failed to check marks status' });
  }
};

// Get students for mark entry
export const getStudents = async (req, res) => {
  try {
    const {
      courseName,
      deptName,
      deptCode,
      semester,
      regulation,
      section,
      subjectCode,
      unitTestNo,
      unitTestDate
    } = req.query;

    if (!courseName || !deptName || !semester || !regulation || !section || !unitTestNo || !unitTestDate || !subjectCode) {
      return res.status(400).json({ error: 'All filter parameters including subject code, unit test number and date are required' });
    }

    // Query assessment_students table joined with unit_test_mark_entered to get existing marks if any
    const [students] = await pool.query(`
      SELECT 
        s.Register_Number as registerNo,
        s.Student_Name as studentName,
        s.Course_Name as courseName,
        s.Dept_Code as deptCode,
        s.Dept_Name as deptName,
        s.Semester as semester,
        s.Regulation as regulation,
        s.Class_Section as section,
        m.Obtained_Mark as obtainedMark
      FROM assessment_students s
      LEFT JOIN unit_test_mark_entered m ON 
        s.Register_Number = m.Register_Number AND
        s.Course_Name = m.Course_Name AND
        s.Dept_Code = m.Dept_Code AND
        s.Semester = m.Semester AND
        s.Regulation = m.Regulation AND
        s.Class_Section = m.Class_Section AND
        m.Sub_Code = ? AND
        m.Test_No = ? AND
        m.Assessment_Date = ?
      WHERE s.Course_Name = ?
        AND s.Dept_Code = ?
        AND s.Dept_Name = ?
        AND s.Semester = ?
        AND s.Regulation = ?
        AND s.Class_Section = ?
        AND s.Assessment_Type = 'Unit Test'
        AND s.Test_No = ?
        AND s.Assessment_Date = ?
      ORDER BY s.Register_Number
    `, [
      subjectCode, unitTestNo, unitTestDate,
      courseName, deptCode, deptName, semester, regulation, section,
      unitTestNo, unitTestDate
    ]);

    // Map existing marks to 'A' or score string
    const studentsWithMarks = students.map(student => {
      let marks = '';
      if (student.obtainedMark !== null && student.obtainedMark !== undefined) {
        if (student.obtainedMark === 'A' || String(student.obtainedMark) === '-1') {
          marks = 'A';
        } else {
          marks = student.obtainedMark.toString();
        }
      }
      return {
        ...student,
        unitTestMarks: marks
      };
    });

    res.json(studentsWithMarks);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
};

// Save unit test marks
export const saveUnitTestMarks = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      courseName,
      deptCode,
      deptName,
      semester,
      regulation,
      section,
      subjectCode,
      subjectName,
      assessmentType,
      testNo,
      testDate,
      maxMarks,
      enteredBy,
      marks
    } = req.body;

    if (!marks || !Array.isArray(marks) || marks.length === 0) {
      return res.status(400).json({ error: 'marks array is required' });
    }

    if (!courseName || !deptCode || !semester || !regulation || !section || !subjectCode || !testNo || !enteredBy) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    await connection.beginTransaction();

    // Set missing/empty marks to 0 by default
    const processedMarks = marks.map(mark => {
      let val = mark.obtainedMarks;
      if (val === '' || val === null || val === undefined) {
        val = 0;
      }
      return { ...mark, obtainedMarks: val };
    });

    // For each mark, check if a record exists, then update or insert accordingly
    for (const mark of processedMarks) {
      let obtainedMarks = mark.obtainedMarks;
      // Handle 'A' for absent (save as 'A', not -1)
      if (obtainedMarks === 'A' || obtainedMarks === 'a') {
        obtainedMarks = 'A';
      } else {
        const numericMark = parseInt(obtainedMarks);
        if (isNaN(numericMark) || numericMark < 0 || numericMark > maxMarks) {
          obtainedMarks = '0'; // Default to 0 if invalid
        } else {
          obtainedMarks = numericMark.toString();
        }
      }

      // Check if record exists for this student and unit test
      const [existing] = await connection.query(`
        SELECT 1 FROM unit_test_mark_entered
        WHERE Register_Number = ?
          AND Course_Name = ?
          AND Dept_Code = ?
          AND Dept_Name = ?
          AND Semester = ?
          AND Regulation = ?
          AND Class_Section = ?
          AND Sub_Code = ?
          AND Test_No = ?
          AND Assessment_Date = ?
      `, [
        mark.registerNo,
        courseName,
        deptCode,
        deptName,
        semester,
        regulation,
        section,
        subjectCode,
        testNo,
        testDate
      ]);

      if (existing.length > 0) {
        // Update existing record
        await connection.query(`
          UPDATE unit_test_mark_entered SET
            Obtained_Mark = ?,
            Max_Marks = ?,
            Entered_By = ?,
            UpdatedAt = NOW()
          WHERE Register_Number = ?
            AND Course_Name = ?
            AND Dept_Code = ?
            AND Dept_Name = ?
            AND Semester = ?
            AND Regulation = ?
            AND Class_Section = ?
            AND Sub_Code = ?
            AND Test_No = ?
            AND Assessment_Date = ?
        `, [
          obtainedMarks,
          maxMarks,
          enteredBy,
          mark.registerNo,
          courseName,
          deptCode,
          deptName,
          semester,
          regulation,
          section,
          subjectCode,
          testNo,
          testDate
        ]);
      } else {
        // Insert new record
        await connection.query(`
          INSERT INTO unit_test_mark_entered (
            Register_Number,
            Name,
            Course_Name,
            Dept_Code,
            Dept_Name,
            Semester,
            Regulation,
            Class_Section,
            Sub_Code,
            Sub_Name,
            Assessment_Type,
            Assessment_Date,
            Test_No,
            Max_Marks,
            Obtained_Mark,
            Entered_By,
            CreatedAt,
            UpdatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          mark.registerNo,
          mark.studentName,
          courseName,
          deptCode,
          deptName,
          semester,
          regulation,
          section,
          subjectCode,
          subjectName,
          assessmentType,
          testDate,
          testNo,
          maxMarks,
          obtainedMarks,
          enteredBy
        ]);
      }
    }
    await connection.commit();

    res.json({
      message: `Unit test marks saved successfully for ${marks.length} students`,
      count: marks.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving unit test marks:', error);
    res.status(500).json({ error: 'Failed to save unit test marks' });
  } finally {
    connection.release();
  }
};
// Get unit test marks data for report
export const getUnitTestMarks = async (req, res) => {
  try {
    const {
      courseName,
      deptName,
      semester,
      regulation,
      section,
      subjectName,
      testNo
    } = req.query;

    if (!courseName || !deptName || !semester || !regulation || !section) {
      return res.status(400).json({ error: 'All filter parameters are required' });
    }

    let query = `
      SELECT 
        id,
        Register_Number as registerNo,
        Name as studentName,
        Sub_Code as subjectCode,
        Sub_Name as subjectName,
        Test_No as testNo,
        Assessment_Date as assessmentDate,
        Max_Marks as maxMarks,
        Obtained_Mark as obtainedMark,
        Entered_By as enteredBy,
        UpdatedAt as updatedAt
      FROM unit_test_mark_entered
      WHERE Course_Name = ?
        AND Dept_Name = ?
        AND Semester = ?
        AND Regulation = ?
        AND Class_Section = ?
    `;

    const params = [courseName, deptName, semester, regulation, section];

    // Add optional filters
    if (subjectName) {
      query += ' AND Sub_Name = ?';
      params.push(subjectName);
    }

    if (testNo) {
      query += ' AND Test_No = ?';
      params.push(testNo);
    }

    query += ' ORDER BY Register_Number, Test_No';

    const [marks] = await pool.query(query, params);
    res.json(marks);
  } catch (error) {
    console.error('Error fetching unit test marks:', error);
    res.status(500).json({ error: 'Failed to fetch unit test marks' });
  }
};

// Update unit test mark
export const updateUnitTestMark = async (req, res) => {
  try {
    const { id } = req.params;
    const { obtainedMark, maxMarks } = req.body;

    if (obtainedMark === undefined || obtainedMark === null) {
      return res.status(400).json({ error: 'obtainedMark is required' });
    }

    // Validate marks
    if (obtainedMark < 0) {
      return res.status(400).json({ error: 'Obtained mark cannot be negative' });
    }

    if (maxMarks && obtainedMark > maxMarks) {
      return res.status(400).json({ error: `Obtained mark cannot exceed maximum marks (${maxMarks})` });
    }

    const [result] = await pool.query(`
      UPDATE unit_test_mark_entered
      SET Obtained_Mark = ?,
          UpdatedAt = NOW()
      WHERE id = ?
    `, [obtainedMark, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Unit test mark updated successfully' });
  } catch (error) {
    console.error('Error updating unit test mark:', error);
    res.status(500).json({ error: 'Failed to update unit test mark' });
  }
};

// Delete unit test mark
export const deleteUnitTestMark = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(`
      DELETE FROM unit_test_mark_entered
      WHERE id = ?
    `, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    res.json({ message: 'Unit test mark deleted successfully' });
  } catch (error) {
    console.error('Error deleting unit test mark:', error);
    res.status(500).json({ error: 'Failed to delete unit test mark' });
  }
};

// --- Report Filter Functions (from unit_test_mark_entered table) ---

export const getReportCourses = async (req, res) => {
  try {
    const [courses] = await pool.query(`
      SELECT DISTINCT Course_Name as courseName
      FROM unit_test_mark_entered
      ORDER BY Course_Name
    `);
    res.json(courses);
  } catch (error) {
    console.error('Error fetching report courses:', error);
    res.status(500).json({ error: 'Failed to fetch report courses' });
  }
};

export const getReportDepartments = async (req, res) => {
  try {
    const { courseName } = req.query;
    if (!courseName) return res.status(400).json({ error: 'courseName is required' });
    const [departments] = await pool.query(`
      SELECT DISTINCT Dept_Name as deptName, Dept_Code as deptCode
      FROM unit_test_mark_entered
      WHERE Course_Name = ?
      ORDER BY Dept_Name
    `, [courseName]);
    res.json(departments);
  } catch (error) {
    console.error('Error fetching report departments:', error);
    res.status(500).json({ error: 'Failed to fetch report departments' });
  }
};

export const getReportSemesters = async (req, res) => {
  try {
    const { courseName, deptName } = req.query;
    if (!courseName || !deptName) return res.status(400).json({ error: 'Required parameters missing' });
    const [semesters] = await pool.query(`
      SELECT DISTINCT Semester as semester
      FROM unit_test_mark_entered
      WHERE Course_Name = ? AND Dept_Name = ?
      ORDER BY Semester
    `, [courseName, deptName]);
    res.json(semesters);
  } catch (error) {
    console.error('Error fetching report semesters:', error);
    res.status(500).json({ error: 'Failed to fetch report semesters' });
  }
};

export const getReportRegulations = async (req, res) => {
  try {
    const { courseName, deptName, semester } = req.query;
    if (!courseName || !deptName || !semester) return res.status(400).json({ error: 'Required parameters missing' });
    const [regulations] = await pool.query(`
      SELECT DISTINCT Regulation as regulation
      FROM unit_test_mark_entered
      WHERE Course_Name = ? AND Dept_Name = ? AND Semester = ?
      ORDER BY Regulation DESC
    `, [courseName, deptName, semester]);
    res.json(regulations);
  } catch (error) {
    console.error('Error fetching report regulations:', error);
    res.status(500).json({ error: 'Failed to fetch report regulations' });
  }
};

export const getReportSections = async (req, res) => {
  try {
    const { courseName, deptName, semester, regulation } = req.query;
    if (!courseName || !deptName || !semester || !regulation) return res.status(400).json({ error: 'Required parameters missing' });
    const [sections] = await pool.query(`
      SELECT DISTINCT Class_Section as section
      FROM unit_test_mark_entered
      WHERE Course_Name = ? AND Dept_Name = ? AND Semester = ? AND Regulation = ?
      ORDER BY Class_Section
    `, [courseName, deptName, semester, regulation]);
    res.json(sections);
  } catch (error) {
    console.error('Error fetching report sections:', error);
    res.status(500).json({ error: 'Failed to fetch report sections' });
  }
};

export const getReportSubjects = async (req, res) => {
  try {
    const { courseName, deptName, semester, regulation, section } = req.query;
    if (!courseName || !deptName || !semester || !regulation || !section) return res.status(400).json({ error: 'Required parameters missing' });
    const [subjects] = await pool.query(`
      SELECT DISTINCT Sub_Name as subjectName, Sub_Code as subjectCode
      FROM unit_test_mark_entered
      WHERE Course_Name = ? AND Dept_Name = ? AND Semester = ? AND Regulation = ? AND Class_Section = ?
      ORDER BY Sub_Name
    `, [courseName, deptName, semester, regulation, section]);
    res.json(subjects);
  } catch (error) {
    console.error('Error fetching report subjects:', error);
    res.status(500).json({ error: 'Failed to fetch report subjects' });
  }
};

export const getReportUnitTests = async (req, res) => {
  try {
    const { courseName, deptName, semester, regulation, section, subjectName } = req.query;
    if (!courseName || !deptName || !semester || !regulation || !section || !subjectName) return res.status(400).json({ error: 'Required parameters missing' });
    const [unitTests] = await pool.query(`
      SELECT DISTINCT 
        Test_No as testNo,
        Assessment_Date as assessmentDate,
        Max_Marks as maxMarks
      FROM unit_test_mark_entered
      WHERE Course_Name = ? AND Dept_Name = ? AND Semester = ? AND Regulation = ? AND Class_Section = ? AND Sub_Name = ?
      ORDER BY Test_No
    `, [courseName, deptName, semester, regulation, section, subjectName]);
    res.json(unitTests);
  } catch (error) {
    console.error('Error fetching report unit tests:', error);
    res.status(500).json({ error: 'Failed to fetch report unit tests' });
  }
};
