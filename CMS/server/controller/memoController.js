import db from '../db.js';

// =======================
// STAFF MEMO CONTROLLERS
// =======================

// Get all staff memos
export const getStaffMemos = async (req, res) => {
    try {
        const query = "SELECT * FROM staff_memos ORDER BY created_at DESC";
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching staff memos:', error);
        // Fallback or empty if table doesn't exist to prevent crash? 
        // Better to error so user knows to create table.
        res.status(500).json({ error: 'Failed to fetch staff memos' });
    }
};

// Get distinct departments from staff_master
export const getStaffDepartments = async (req, res) => {
    try {
        const query = "SELECT DISTINCT Dept_Name FROM staff_master WHERE Dept_Name IS NOT NULL AND Dept_Name != '' ORDER BY Dept_Name";
        const [rows] = await db.query(query);
        // Return array of strings
        res.json(rows.map(row => row.Dept_Name));
    } catch (error) {
        console.error('Error fetching staff departments:', error);
        res.status(500).json({ error: 'Failed to fetch staff departments' });
    }
};

// Get staff list with optional filters
export const getStaffList = async (req, res) => {
    try {
        const { department, search } = req.query;
        let query = "SELECT id, Staff_Name as name, Mobile as mobile, Dept_Name as department FROM staff_master WHERE 1=1";
        const params = [];

        if (department) {
            query += " AND Dept_Name = ?";
            params.push(department);
        }

        if (search) {
            query += " AND (Staff_Name LIKE ? OR Mobile LIKE ? OR Dept_Name LIKE ?)";
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        query += " ORDER BY Staff_Name";

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching staff list:', error);
        res.status(500).json({ error: 'Failed to fetch staff list' });
    }
};

// Create a new staff memo
export const createStaffMemo = async (req, res) => {
    try {
        const { title, content, priority, date, departments, staff } = req.body;

        // Ensure arrays are stringified for JSON/Text columns
        const deptStr = Array.isArray(departments) ? JSON.stringify(departments) : departments;
        const staffStr = Array.isArray(staff) ? JSON.stringify(staff) : staff;

        const query = `
            INSERT INTO staff_memos (title, content, priority, date, departments, staff, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        `;

        await db.query(query, [title, content, priority, date, deptStr, staffStr]);
        res.status(201).json({ message: 'Staff memo created successfully' });
    } catch (error) {
        console.error('Error creating staff memo:', error);
        res.status(500).json({ error: 'Failed to create staff memo' });
    }
};

// Delete a staff memo
export const deleteStaffMemo = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM staff_memos WHERE id = ?", [id]);
        res.json({ message: 'Staff memo deleted successfully' });
    } catch (error) {
        console.error('Error deleting staff memo:', error);
        res.status(500).json({ error: 'Failed to delete staff memo' });
    }
};


// =========================
// STUDENT MEMO CONTROLLERS
// =========================

// Get all student memos
export const getStudentMemos = async (req, res) => {
    try {
        const query = "SELECT * FROM student_memos ORDER BY created_at DESC";
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching student memos:', error);
        res.status(500).json({ error: 'Failed to fetch student memos' });
    }
};

// Create a new student memo
export const createStudentMemo = async (req, res) => {
    try {
        const { title, content, priority, date, courses, departments, students, semester, year, section } = req.body;

        const coursesStr = Array.isArray(courses) ? JSON.stringify(courses) : courses;
        const deptStr = Array.isArray(departments) ? JSON.stringify(departments) : departments;
        const studentStr = Array.isArray(students) ? JSON.stringify(students) : students;

        const query = `
            INSERT INTO student_memos (title, content, priority, date, courses, departments, students, semester, year, section, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        await db.query(query, [title, content, priority, date, coursesStr, deptStr, studentStr, semester, year, section]);
        res.status(201).json({ message: 'Student memo created successfully' });
    } catch (error) {
        console.error('Error creating student memo:', error);
        res.status(500).json({ error: 'Failed to create student memo' });
    }
};

// Delete a student memo
export const deleteStudentMemo = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("DELETE FROM student_memos WHERE id = ?", [id]);
        res.json({ message: 'Student memo deleted successfully' });
    } catch (error) {
        console.error('Error deleting student memo:', error);
        res.status(500).json({ error: 'Failed to delete student memo' });
    }
};
