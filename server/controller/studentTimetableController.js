import db from '../db.js';

export const getStudentTimetable = async (req, res) => {
    try {
        // req.user is populated by verifyToken middleware
        const registerNumber = req.user.staff_id; // For students, staff_id holds Register_Number

        if (!registerNumber) {
            return res.status(400).json({ error: 'Student registration number not found in token' });
        }

        // 1. Get student's current academic details
        const [studentDetails] = await db.query(
            `SELECT Dept_Code, Semester, Year, Regulation, Class, Dept_Name
             FROM student_master 
             WHERE Register_Number = ?`,
            [registerNumber]
        );

        if (studentDetails.length === 0) {
            return res.status(404).json({ error: 'Student details not found' });
        }

        const student = studentDetails[0];

        // 2. Fetch the timetable for this student's section
        const [timetableRows] = await db.query(
            `SELECT * FROM class_timetable 
             WHERE Dept_Code = ? 
             AND Semester = ? 
             AND Year = ? 
             AND Regulation = ? 
             AND Class_Section = ?`,
            [student.Dept_Code, student.Semester, student.Year, student.Regulation, student.Class]
        );

        // 3. Extract all unique subject codes from the timetable rows
        const subjectCodesSet = new Set();
        timetableRows.forEach(row => {
            ['Period_1', 'Period_2', 'Period_3', 'Period_4', 'Period_5', 'Period_6'].forEach(col => {
                const val = row[col];
                if (val && val !== 'Free') {
                    // Split by '/' if multiple subjects exist in one period
                    val.split('/').forEach(code => subjectCodesSet.add(code.trim()));
                }
            });
        });

        const subjectCodes = Array.from(subjectCodesSet);

        // Fetch subject names for all codes found
        let subjectMap = {};
        if (subjectCodes.length > 0) {
            const [subjects] = await db.query(
                `SELECT Sub_Code, Sub_Name FROM subject_master WHERE Sub_Code IN (?)`,
                [subjectCodes]
            );
            subjects.forEach(sub => {
                subjectMap[sub.Sub_Code] = sub.Sub_Name;
            });
        }

        // Helper function to resolve subject names (handles multiple codes separated by /)
        const resolveSubjectData = (rawVal) => {
            if (!rawVal || rawVal === 'Free') return { code: 'Free', name: 'Free' };

            const codes = rawVal.split('/').map(c => c.trim());
            const resolvedNames = codes.map(code => subjectMap[code] || code);

            return {
                code: rawVal, // Keep the original BP302T / BP301T format for the code display
                name: resolvedNames.join(' / ') // Result: PHARMACEUTICS / PHARM CHEMISTRY
            };
        };

        // 4. Formulate the response
        const formattedTimetable = timetableRows.map(row => {
            return {
                dayOrder: row.Day_Order,
                periods: [
                    resolveSubjectData(row.Period_1),
                    resolveSubjectData(row.Period_2),
                    resolveSubjectData(row.Period_3),
                    resolveSubjectData(row.Period_4),
                    resolveSubjectData(row.Period_5),
                    resolveSubjectData(row.Period_6)
                ]
            };
        });

        res.json({
            success: true,
            studentInfo: {
                registerNumber: registerNumber,
                deptCode: student.Dept_Code,
                deptName: student.Dept_Name,
                semester: student.Semester,
                year: student.Year,
                regulation: student.Regulation,
                className: student.Class
            },
            timetable: formattedTimetable
        });

    } catch (error) {
        console.error('Error fetching student timetable:', error);
        res.status(500).json({ error: 'Failed to fetch timetable' });
    }
};
