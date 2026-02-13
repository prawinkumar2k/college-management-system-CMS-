import db from '../db.js';

// Get all students where Admission_status = 'Admitted'
export const getAdmittedStudents = async (req, res) => {
    try {
        const sql = `
            SELECT 
                Id,
                Dept_Name, 
                Dept_Code, 
                Semester, 
                Year, 
                Student_Name, 
                Register_Number, 
                password 
            FROM student_master 
            WHERE Admission_status = 'Admitted'
            ORDER BY Semester ASC`;

        const [rows] = await db.query(sql);

        // Process Dept_Name to show short form (e.g., "B.PHARM (BACHELOR OF PHARMACY)" -> "B.PHARM")
        const processedRows = rows.map(row => ({
            ...row,
            Dept_Name: row.Dept_Name && row.Dept_Name.includes('(')
                ? row.Dept_Name.split('(')[0].trim()
                : row.Dept_Name
        }));

        res.json(processedRows);
    } catch (err) {
        console.error('Error fetching admitted students:', err);
        res.status(500).json({ error: 'Failed to fetch admitted students' });
    }
};

// Update student password
export const updateStudentPassword = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    try {
        const sql = 'UPDATE student_master SET password = ? WHERE Id = ?';
        const [result] = await db.query(sql, [password, id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json({ success: true, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Error updating student password:', err);
        res.status(500).json({ error: 'Failed to update password' });
    }
};
