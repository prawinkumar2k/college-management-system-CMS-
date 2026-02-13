import db from '../db.js';

export const getStudentAcademicDetails = async (req, res) => {
    try {
        const registerNumber = req.user.username;

        // 1. Get Basic Student & Dept Info
        const [studentRows] = await db.query(
            `SELECT 
                s.Register_Number, s.Student_Name, s.Academic_Year, s.Course_Name, 
                s.Dept_Name, s.Dept_Code, s.Semester, s.Year, s.Class_Teacher as staff_id, 
                s.Class, s.Regulation,
                s.S1, s.S2, s.S3, s.S4, s.S5, s.S6, s.S7, s.S8,
                sm.Staff_Name as class_teacher_name
            FROM student_master s 
            LEFT JOIN staff_master sm ON s.Class_Teacher = sm.Staff_ID
            WHERE s.Register_Number = ?`,
            [registerNumber]
        );

        if (studentRows.length === 0) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const student = studentRows[0];

        // 2. Get Current Semester Subjects & Assigned Staff
        // Join subject_master with staff_subject to get the handling staff
        const [subjectRows] = await db.query(
            `SELECT 
                sub.Sub_Code, sub.Sub_Name, sub.Sub_Type,
                ss.Staff_Name
            FROM subject_master sub
            LEFT JOIN staff_subject ss ON 
                sub.Sub_Code = ss.Subject_Code AND 
                sub.Dept_Code = ss.Dept_Code AND 
                sub.Semester = ss.Semester
            WHERE sub.Dept_Code = ? AND sub.Semester = ?`,
            [student.Dept_Code, student.Semester]
        );

        // 3. Resolve Arrears
        // Logic: Check S1 to (CurrentSemester - 1) columns.
        // If a column has subject codes (comma separated), fetch their names.
        let arrearList = [];
        const currentSem = parseInt(student.Semester);

        for (let i = 1; i < currentSem; i++) {
            const semKey = `S${i}`;
            const arrearCodesStr = student[semKey];

            if (arrearCodesStr && arrearCodesStr.trim() !== "" && arrearCodesStr.toLowerCase() !== "null") {
                const codes = arrearCodesStr.split(',').map(c => c.trim());

                if (codes.length > 0) {
                    const [arrearSubjects] = await db.query(
                        `SELECT Sub_Code, Sub_Name FROM subject_master WHERE Sub_Code IN (?)`,
                        [codes]
                    );

                    arrearSubjects.forEach(sub => {
                        arrearList.push({
                            semester: i,
                            code: sub.Sub_Code,
                            name: sub.Sub_Name,
                            status: 'Arrear'
                        });
                    });
                }
            }
        }

        res.status(200).json({
            success: true,
            profile: {
                Register_Number: student.Register_Number,
                Student_Name: student.Student_Name,
                Dept_Name: student.Dept_Name,
                Dept_Code: student.Dept_Code,
                Semester: student.Semester,
                Year: student.Year,
                Class: student.Class,
                Class_Teacher: student.class_teacher_name || student.staff_id,
                Academic_Year: student.Academic_Year,
                Course_Name: student.Course_Name,
                Regulation: student.Regulation
            },
            subjects: subjectRows,
            arrears: arrearList
        });

    } catch (err) {
        console.error('Error in getStudentAcademicDetails:', err);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
