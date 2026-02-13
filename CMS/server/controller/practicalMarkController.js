import pool from '../db.js';

// Get distinct courses where Assessment_Type = 'Practical'
export const getCourses = async (req, res) => {
    try {
        const [courses] = await pool.query(`
      SELECT DISTINCT Course_Name as courseName
      FROM assessment_configuration
      WHERE Assessment_Type = 'Practical'
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
            return res.status(400).json({ error: 'Course name is required' });
        }

        const [departments] = await pool.query(`
      SELECT DISTINCT Dept_Name as deptName, Dept_Code as deptCode
      FROM assessment_configuration
      WHERE Assessment_Type = 'Practical'
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
            return res.status(400).json({ error: 'Course name and department name are required' });
        }

        const [semesters] = await pool.query(`
      SELECT DISTINCT Semester as semester
      FROM assessment_configuration
      WHERE Assessment_Type = 'Practical'
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
            return res.status(400).json({ error: 'Course name, department name, and semester are required' });
        }

        const [regulations] = await pool.query(`
      SELECT DISTINCT Regulation as regulation
      FROM assessment_configuration
      WHERE Assessment_Type = 'Practical'
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
      WHERE Assessment_Type = 'Practical'
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
      WHERE Assessment_Type = 'Practical'
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

// Get distinct practical test numbers (Test_No) with dates, max marks, and experiment count
export const getPracticals = async (req, res) => {
    try {
        const { courseName, deptName, semester, regulation, section, subjectName } = req.query;

        if (!courseName || !deptName || !semester || !regulation || !section || !subjectName) {
            return res.status(400).json({ error: 'All filter parameters are required' });
        }

        const [practicals] = await pool.query(`
      SELECT DISTINCT 
        Test_No as testNo,
        Assessment_Date as assessmentDate,
        Max_Marks as maxMarks,
        Experiment_Count as experimentCount
      FROM assessment_configuration
      WHERE Assessment_Type = 'Practical'
        AND Course_Name = ?
        AND Dept_Name = ?
        AND Semester = ?
        AND Regulation = ?
        AND Class_Section = ?
        AND Sub_Name = ?
      ORDER BY Test_No
    `, [courseName, deptName, semester, regulation, section, subjectName]);

        res.json(practicals);
    } catch (error) {
        console.error('Error fetching practicals:', error);
        res.status(500).json({ error: 'Failed to fetch practicals' });
    }
};

// Get distinct staff names for a course and department
export const getStaff = async (req, res) => {
    try {
        const { courseName, deptName } = req.query;

        if (!courseName || !deptName) {
            return res.status(400).json({ error: 'Course name and department name are required' });
        }

        // First get the Dept_Code from assessment_configuration based on deptName
        const [deptInfo] = await pool.query(`
      SELECT DISTINCT Dept_Code as deptCode
      FROM assessment_configuration
      WHERE Dept_Name = ?
      LIMIT 1
    `, [deptName]);

        if (deptInfo.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
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
            testNo,
            assessmentDate
        } = req.query;

        if (!courseName || !deptName || !semester || !regulation || !section || !testNo || !assessmentDate) {
            return res.status(400).json({ error: 'All filter parameters are required' });
        }

        // Query assessment_students table joined with practical_mark to get existing marks if any
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
        m.Obtained_Mark_Exp_1, m.Obtained_Mark_Exp_2, m.Obtained_Mark_Exp_3, m.Obtained_Mark_Exp_4, m.Obtained_Mark_Exp_5,
        m.Obtained_Mark_Exp_6, m.Obtained_Mark_Exp_7, m.Obtained_Mark_Exp_8, m.Obtained_Mark_Exp_9, m.Obtained_Mark_Exp_10,
        m.Obtained_Mark_Exp_11, m.Obtained_Mark_Exp_12, m.Obtained_Mark_Exp_13, m.Obtained_Mark_Exp_14, m.Obtained_Mark_Exp_15
      FROM assessment_students s
      LEFT JOIN practical_mark m ON 
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
        AND s.Assessment_Type = 'Practical'
        AND s.Test_No = ?
        AND s.Assessment_Date = ?
      ORDER BY s.Register_Number
    `, [
            subjectCode, testNo, assessmentDate,
            courseName, deptCode, deptName, semester, regulation, section,
            testNo, assessmentDate
        ]);

        // Map existing marks to experiments array
        const studentsWithMarks = students.map(student => {
            const experiments = [];
            for (let i = 1; i <= 20; i++) {
                let mark = student[`Obtained_Mark_Exp_${i}`];
                if (mark !== null && mark !== undefined) {
                    if (mark === 'A' || String(mark) === '-1') {
                        experiments.push({ marks: 'A' });
                    } else {
                        experiments.push({ marks: mark.toString() });
                    }
                }
            }
            return {
                ...student,
                existingExperiments: experiments.length > 0 ? experiments : null
            };
        });

        res.json(studentsWithMarks);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
};

// Save practical marks
export const savePracticalMarks = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const {
            courseName,
            deptName,
            deptCode,
            semester,
            regulation,
            section,
            subjectName,
            subjectCode,
            testNo,
            assessmentDate,
            staffName,
            staffId,
            experimentCount,
            students
        } = req.body;

        // Validate required fields
        if (!courseName || !deptName || !deptCode || !semester || !regulation ||
            !section || !subjectName || !subjectCode || !testNo || !assessmentDate
            || !staffName || !staffId || !experimentCount || !students || students.length === 0) {
            throw new Error('All required fields must be provided, including experimentCount');
        }

        // Validate experimentCount is a valid number
        const expCount = parseInt(experimentCount);
        if (isNaN(expCount) || expCount <= 0) {
            throw new Error(`Invalid experimentCount: ${experimentCount}. Must be a positive integer.`);
        }

        // Process each student's marks
        for (const student of students) {
            const {
                registerNo,
                studentName,
                experiments
            } = student;

            // Validate required student fields
            if (!registerNo || !studentName) {
                throw new Error(`Invalid student data: registerNo and studentName are required`);
            }

            // Build the data dynamically based on experiments
            const experimentMarks = {};
            const expCountNum = parseInt(experimentCount) || 0;

            if (experiments && Array.isArray(experiments)) {
                experiments.forEach((exp, index) => {
                    const expNum = index + 1;
                    let marks;
                    if (exp.marks === 'A' || exp.marks === 'a') {
                        marks = 'A';
                    } else {
                        marks = exp.marks === '' || exp.marks === null ? '0' : exp.marks.toString();
                    }
                    experimentMarks[expNum] = marks;
                });
            }

            // Check if record already exists
            const [existing] = await connection.query(`
        SELECT id FROM practical_mark
        WHERE Register_Number = ?
          AND Course_Name = ?
          AND Dept_Code = ?
          AND Semester = ?
          AND Regulation = ?
          AND Class_Section = ?
          AND Sub_Code = ?
          AND Assessment_Type = 'Practical'
          AND Test_No = ?
          AND Assessment_Date = ?
      `, [registerNo, courseName, deptCode, semester, regulation, section, subjectCode, testNo, assessmentDate]);

            if (existing.length > 0) {
                // Update existing record
                const updateFields = [
                    'Name = ?', 'Dept_Name = ?', 'Max_Marks = ?', 'Experiment_Count = ?', 'Entered_By = ?', 'UpdatedAt = NOW()'
                ];
                const updateValues = [studentName, deptName, 50, experimentCount, staffId];

                for (let expNum = 1; expNum <= expCountNum; expNum++) {
                    updateFields.push(`Obtained_Mark_Exp_${expNum} = ?`);
                    updateValues.push(experimentMarks[expNum] !== undefined ? experimentMarks[expNum] : '0');
                }

                updateValues.push(registerNo, courseName, deptCode, semester, regulation, section, subjectCode, testNo, assessmentDate);

                await connection.query(`
                    UPDATE practical_mark SET ${updateFields.join(', ')}
                    WHERE Register_Number = ?
                      AND Course_Name = ?
                      AND Dept_Code = ?
                      AND Semester = ?
                      AND Regulation = ?
                      AND Class_Section = ?
                      AND Sub_Code = ?
                      AND Test_No = ?
                      AND Assessment_Date = ?
                `, updateValues);
            } else {
                // Insert new record
                const columns = [
                    'Register_Number', 'Name', 'Course_Name', 'Dept_Name', 'Dept_Code',
                    'Semester', 'Regulation', 'Class_Section', 'Sub_Code', 'Sub_Name',
                    'Assessment_Type', 'Assessment_Date', 'Test_No', 'Max_Marks', 'Experiment_Count', 'Entered_By', 'CreatedAt', 'UpdatedAt'
                ];

                const values = [
                    registerNo, studentName, courseName, deptName, deptCode,
                    semester, regulation, section, subjectCode, subjectName,
                    'Practical', assessmentDate, testNo, 50, experimentCount, staffId, new Date(), new Date()
                ];

                for (let expNum = 1; expNum <= expCountNum; expNum++) {
                    columns.push(`Obtained_Mark_Exp_${expNum}`);
                    values.push(experimentMarks[expNum] !== undefined ? experimentMarks[expNum] : '0');
                }

                const placeholders = columns.map(() => '?').join(', ');
                await connection.query(`
                    INSERT INTO practical_mark (${columns.join(', ')})
                    VALUES (${placeholders})
                `, values);
            }
        }

        await connection.commit();
        res.json({
            success: true,
            message: 'Practical marks saved successfully',
            studentsProcessed: students.length
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error saving practical marks:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save practical marks',
            details: error.message
        });
    } finally {
        connection.release();
    }
};
// Get practical marks data for report
export const getPracticalMarks = async (req, res) => {
    try {
        const {
            courseName,
            deptName,
            semester,
            regulation,
            section,
            subjectName,
            practicalNo
        } = req.query;

        if (!courseName || !deptName || !semester || !regulation || !section) {
            return res.status(400).json({ error: 'All filter parameters are required' });
        }

        let query = `
      SELECT 
        id,
        Register_Number as registerNo,
        Name as studentName,
        Course_Name as courseName,
        Dept_Code as deptCode,
        Dept_Name as deptName,
        Semester as semester,
        Regulation as regulation,
        Class_Section as section,
        Sub_Code as subjectCode,
        Sub_Name as subjectName,
        Assessment_Type as assessmentType,
        Assessment_Date as assessmentDate,
        Test_No as practicalNo,
        Experiment_Count as experimentCount,
        Max_Marks as maxMarks,
        (CASE 
          WHEN Obtained_Mark_Exp_1 = 'A' OR Obtained_Mark_Exp_2 = 'A' OR Obtained_Mark_Exp_3 = 'A' OR 
               Obtained_Mark_Exp_4 = 'A' OR Obtained_Mark_Exp_5 = 'A' OR Obtained_Mark_Exp_6 = 'A' OR 
               Obtained_Mark_Exp_7 = 'A' OR Obtained_Mark_Exp_8 = 'A' OR Obtained_Mark_Exp_9 = 'A' OR 
               Obtained_Mark_Exp_10 = 'A' OR Obtained_Mark_Exp_11 = 'A' OR Obtained_Mark_Exp_12 = 'A' OR 
               Obtained_Mark_Exp_13 = 'A' OR Obtained_Mark_Exp_14 = 'A' OR Obtained_Mark_Exp_15 = 'A' THEN 'A'
          ELSE (
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_1, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_2, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_3, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_4, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_5, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_6, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_7, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_8, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_9, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_10, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_11, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_12, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_13, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_14, 'A') AS SIGNED), 0) +
            COALESCE(CAST(NULLIF(Obtained_Mark_Exp_15, 'A') AS SIGNED), 0)
          )
        END) as obtainedMark,
        Entered_By as enteredBy,
        CreatedAt as createdAt,
        UpdatedAt as updatedAt
      FROM practical_mark
      WHERE Course_Name = ?
        AND Dept_Name = ?
        AND Semester = ?
        AND Regulation = ?
        AND Class_Section = ?
    `;

        const params = [courseName, deptName, semester, regulation, section];

        if (subjectName) {
            query += ` AND Sub_Name = ?`;
            params.push(subjectName);
        }

        if (practicalNo) {
            query += ` AND Test_No = ?`;
            params.push(practicalNo);
        }

        query += ` ORDER BY Register_Number, Test_No`;

        const [marks] = await pool.query(query, params);

        res.json(marks);
    } catch (error) {
        console.error('Error fetching practical marks:', error);
        res.status(500).json({ error: 'Failed to fetch practical marks' });
    }
};

// Update practical mark
export const updatePracticalMark = async (req, res) => {
    try {
        const { id } = req.params;
        const { obtainedMark } = req.body;

        if (!id || obtainedMark === undefined || obtainedMark === null) {
            return res.status(400).json({ error: 'id and obtainedMark are required' });
        }

        // Validate obtained mark is not negative
        if (obtainedMark < 0) {
            return res.status(400).json({ error: 'Obtained mark cannot be negative' });
        }

        // Check if record exists and get max marks
        const [existing] = await pool.query(
            'SELECT Max_Marks FROM practical_mark WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const maxMarks = existing[0].Max_Marks;

        // Validate obtained mark doesn't exceed max marks
        if (obtainedMark > maxMarks) {
            return res.status(400).json({ error: `Obtained mark cannot exceed max marks (${maxMarks})` });
        }

        // Update the record
        await pool.query(
            'UPDATE practical_mark SET Obtained_Mark = ?, UpdatedAt = NOW() WHERE id = ?',
            [obtainedMark, id]
        );

        res.json({
            message: 'Practical mark updated successfully',
            id,
            obtainedMark
        });
    } catch (error) {
        console.error('Error updating practical mark:', error);
        res.status(500).json({ error: 'Failed to update practical mark' });
    }
};

// Delete practical mark
export const deletePracticalMark = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'id is required' });
        }

        // Check if record exists
        const [existing] = await pool.query(
            'SELECT id FROM practical_mark WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Delete the record
        await pool.query('DELETE FROM practical_mark WHERE id = ?', [id]);

        res.json({
            message: 'Practical mark deleted successfully',
            id
        });
    } catch (error) {
        console.error('Error deleting practical mark:', error);
        res.status(500).json({ error: 'Failed to delete practical mark' });
    }
};

// --- Report Filter Functions (from practical_mark table) ---

export const getReportCourses = async (req, res) => {
    try {
        const [courses] = await pool.query(`
      SELECT DISTINCT Course_Name as courseName
      FROM practical_mark
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
      FROM practical_mark
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
        if (!courseName || !deptName) return res.status(400).json({ error: 'courseName and deptName are required' });
        const [semesters] = await pool.query(`
      SELECT DISTINCT Semester as semester
      FROM practical_mark
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
      FROM practical_mark
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
      FROM practical_mark
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
      FROM practical_mark
      WHERE Course_Name = ? AND Dept_Name = ? AND Semester = ? AND Regulation = ? AND Class_Section = ?
      ORDER BY Sub_Name
    `, [courseName, deptName, semester, regulation, section]);
        res.json(subjects);
    } catch (error) {
        console.error('Error fetching report subjects:', error);
        res.status(500).json({ error: 'Failed to fetch report subjects' });
    }
};

export const getReportPracticals = async (req, res) => {
    try {
        const { courseName, deptName, semester, regulation, section, subjectName } = req.query;
        if (!courseName || !deptName || !semester || !regulation || !section || !subjectName) return res.status(400).json({ error: 'Required parameters missing' });
        const [practicals] = await pool.query(`
      SELECT DISTINCT 
        Test_No as practicalNo,
        Assessment_Date as assessmentDate,
        Max_Marks as maxMarks,
        Experiment_Count as experimentCount
      FROM practical_mark
      WHERE Course_Name = ? AND Dept_Name = ? AND Semester = ? AND Regulation = ? AND Class_Section = ? AND Sub_Name = ?
      ORDER BY Test_No
    `, [courseName, deptName, semester, regulation, section, subjectName]);
        res.json(practicals);
    } catch (error) {
        console.error('Error fetching report practicals:', error);
        res.status(500).json({ error: 'Failed to fetch report practicals' });
    }
};
