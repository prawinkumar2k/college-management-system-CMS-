import pool from '../db.js';

export const getStudentMarkDetails = async (req, res) => {
    try {
        const registerNumber = req.user.username; // From verifyToken middleware

        // 1. Fetch Assignment Marks
        const [assignments] = await pool.query(
            `SELECT Sub_Code, Sub_Name, Assignment_No, Max_Marks, Obtained_Mark, Assessment_Date 
             FROM assignment_mark_entered 
             WHERE Register_Number = ? 
             ORDER BY Assessment_Date DESC`,
            [registerNumber]
        );

        // 2. Fetch Unit Test Marks
        const [unitTests] = await pool.query(
            `SELECT Sub_Code, Sub_Name, Test_No, Max_Marks, Obtained_Mark, Assessment_Date 
             FROM unit_test_mark_entered 
             WHERE Register_Number = ? 
             ORDER BY Assessment_Date DESC`,
            [registerNumber]
        );

        // 3. Fetch Practical Marks
        const [practicals] = await pool.query(
            `SELECT * 
             FROM practical_mark 
             WHERE Register_Number = ? 
             ORDER BY Assessment_Date DESC`,
            [registerNumber]
        );

        // 4. Fetch University Marks
        const [universityMarks] = await pool.query(
            `SELECT Sub_Code, Sub_Name, Internal_Mark, External_Mark, Total_Mark, Status, Semester, Academic_Year, Regulation
             FROM univ_mark_entered 
             WHERE Register_Number = ? 
             ORDER BY Semester DESC, Sub_Code ASC`,
            [registerNumber]
        );

        res.json({
            success: true,
            data: {
                assignments,
                unitTests,
                practicals,
                universityMarks
            }
        });
    } catch (error) {
        console.error('Error fetching student marks:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
