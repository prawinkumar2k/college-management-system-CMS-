import db from '../db.js';

// Get all courses from course_master
export const getCourses = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT DISTINCT Course_Name FROM course_master ORDER BY Course_Name');
        res.json(rows.map(r => r.Course_Name));
    } catch (err) {
        console.error('Error fetching courses:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get departments by course from course_details
export const getDepartmentsByCourse = async (req, res) => {
    try {
        const { course } = req.query;
        let sql = 'SELECT DISTINCT Dept_Name as deptName, Dept_Code as deptCode FROM course_details';
        const params = [];

        if (course) {
            sql += ' WHERE Course_Name = ?';
            params.push(course);
        }

        sql += ' ORDER BY Dept_Name';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Error fetching departments:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get all semesters with year from semester_master
export const getSemesters = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT Semester as semester, Year as year FROM semester_master ORDER BY Semester ASC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching semesters:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get classes/sections from student_master based on filters
export const getClasses = async (req, res) => {
    try {
        const { course, department, semester } = req.query;
        let sql = "SELECT DISTINCT Class FROM student_master WHERE Class IS NOT NULL AND Class != ''";
        const params = [];

        if (course) {
            sql += " AND Course_Name = ?";
            params.push(course);
        }
        if (department) {
            sql += " AND Dept_Name = ?";
            params.push(department);
        }
        if (semester) {
            sql += " AND Semester = ?";
            params.push(semester);
        }

        sql += " ORDER BY Class";
        const [rows] = await db.query(sql, params);
        res.json(rows.map(row => row.Class));
    } catch (err) {
        console.error('Error fetching classes:', err);
        res.status(500).json({ error: err.message });
    }
};
