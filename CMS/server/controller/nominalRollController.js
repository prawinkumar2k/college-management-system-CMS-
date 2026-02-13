import db from '../db.js';

// Get all admitted students for Nominal Roll
export const getNominalRollStudents = async (req, res) => {
    try {
        const connection = await db.getConnection();
        
        // Query to fetch only admitted students from student_master table
        const [rows] = await connection.query(
            `SELECT 
                Register_Number,
                Student_Name,
                DOB,
                Photo_Path,
                Dept_Name,
                Dept_Code,
                Semester,
                Year,
                Regulation,
                S1, S2, S3, S4, S5, S6, S7, S8,
                R1, R2, R3, R4, R5, R6, R7, R8
            FROM student_master 
            WHERE Admission_Status = 'Admitted'
            ORDER BY Register_Number ASC`,
            []
        );
        
        connection.release();
        
        res.json({
            success: true,
            data: rows || [],
            message: 'Nominal roll students fetched successfully'
        });
    } catch (error) {
        console.error('Error fetching nominal roll students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch nominal roll students',
            error: error.message
        });
    }
};

// Get nominal roll students with filters
export const getNominalRollStudentsFiltered = async (req, res) => {
    try {
        const { department, subject_code, year, semester } = req.query;
        
        let query = `SELECT 
                Register_Number,
                Student_Name,
                DOB,
                Photo_Path,
                Dept_Name,
                Dept_Code,
                Semester,
                Year,
                Regulation,
                S1, S2, S3, S4, S5, S6, S7, S8,
                R1, R2, R3, R4, R5, R6, R7, R8
            FROM student_master 
            WHERE Admission_Status = 'Admitted'
            ORDER BY Register_Number ASC`;
        
        const params = [];
        
        // Apply filters if provided
        if (department && department !== 'All') {
            query += ` AND Dept_Name = ?`;
            params.push(department);
        }
        
        if (subject_code && subject_code !== 'All') {
            query += ` AND Dept_Code = ?`;
            params.push(subject_code);
        }
        
        if (year && year !== 'All') {
            query += ` AND Year = ?`;
            params.push(year);
        }
        
        if (semester && semester !== 'All') {
            query += ` AND Semester = ?`;
            params.push(semester);
        }
        
        query += ` ORDER BY Application_No ASC`;
        
        const connection = await db.getConnection();
        const [rows] = await connection.query(query, params);
        connection.release();
        
        res.json({
            success: true,
            data: rows || [],
            message: 'Filtered nominal roll students fetched successfully'
        });
    } catch (error) {
        console.error('Error fetching filtered nominal roll students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch filtered nominal roll students',
            error: error.message
        });
    }
};
