import pool from '../db.js';

// Get all consolidated report data with optional filters
export const getReportData = async (req, res) => {
    try {
        const { deptName, semester, regulation, subName } = req.query;

        let query = `SELECT * FROM student_subject_consolidated_report WHERE 1=1`;
        const params = [];

        if (deptName) {
            query += ` AND Dept_Name = ?`;
            params.push(deptName);
        }
        if (semester) {
            query += ` AND Semester = ?`;
            params.push(semester);
        }
        if (regulation) {
            query += ` AND Regulation = ?`;
            params.push(regulation);
        }
        if (subName) {
            query += ` AND Sub_Name = ?`;
            params.push(subName);
        }

        query += ` ORDER BY Register_Number, Sub_Code`;

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching consolidated report data:', error);
        res.status(500).json({ error: 'Failed to fetch report data' });
    }
};

// Get unique filter options
export const getFilterOptions = async (req, res) => {
    try {
        // Fetch unique departments
        const [departments] = await pool.query(`
      SELECT DISTINCT Dept_Name as deptName, Dept_Code as deptCode 
      FROM student_subject_consolidated_report 
      ORDER BY Dept_Name
    `);

        // Fetch unique semesters and their corresponding years
        const [semesters] = await pool.query(`
      SELECT DISTINCT Semester as semester, Year as year 
      FROM student_subject_consolidated_report 
      ORDER BY Semester
    `);

        // Fetch unique regulations
        const [regulations] = await pool.query(`
      SELECT DISTINCT Regulation as regulation 
      FROM student_subject_consolidated_report 
      ORDER BY Regulation DESC
    `);

        // Fetch unique subjects
        const [subjects] = await pool.query(`
      SELECT DISTINCT Sub_Name as subName, Sub_Code as subCode 
      FROM student_subject_consolidated_report 
      ORDER BY Sub_Name
    `);

        res.json({
            departments,
            semesters,
            regulations,
            subjects
        });
    } catch (error) {
        console.error('Error fetching filter options:', error);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
};
