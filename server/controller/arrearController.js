import db from '../db.js';

// Get students for arrear entry based on filters
export const getArrearStudents = async (req, res) => {
    try {
        const { deptCode, semester, regulation } = req.query;

        let sql = `SELECT Register_Number, Student_Name, Photo_Path, S1, S2, S3, S4, S5, S6, S7, S8, Id 
                   FROM student_master 
                   WHERE 1=1`;
        const params = [];

        if (deptCode) {
            sql += ` AND Dept_Code = ?`;
            params.push(deptCode);
        }
        if (semester) {
            sql += ` AND Semester = ?`;
            params.push(semester);
        }
        if (regulation) {
            sql += ` AND Regulation = ?`;
            params.push(regulation);
        }

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching arrear students:', err);
        res.status(500).json({ error: err.message });
    }
};

// Update arrear marks for students
export const updateArrearMarks = async (req, res) => {
    try {
        const { students } = req.body; // Array of student objects with S1-S8 and Id

        if (!students || !Array.isArray(students)) {
            return res.status(400).json({ error: 'Invalid students data' });
        }

        const updatePromises = students.map(student => {
            const sql = `UPDATE student_master SET 
                         S1 = ?, S2 = ?, S3 = ?, S4 = ?, S5 = ?, S6 = ?, S7 = ?, S8 = ?
                         WHERE Id = ?`;
            const values = [
                student.S1 || null,
                student.S2 || null,
                student.S3 || null,
                student.S4 || null,
                student.S5 || null,
                student.S6 || null,
                student.S7 || null,
                student.S8 || null,
                student.Id
            ];
            return db.query(sql, values);
        });

        await Promise.all(updatePromises);
        res.json({ success: true, message: 'Arrear marks updated successfully' });
    } catch (err) {
        console.error('Error updating arrear marks:', err);
        res.status(500).json({ error: err.message });
    }
};
