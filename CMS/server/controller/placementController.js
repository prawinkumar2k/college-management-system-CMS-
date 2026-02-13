import db from '../db.js';

// Get all register numbers for autocomplete
export const getRegisterNumbers = async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT DISTINCT Register_Number FROM student_master WHERE Register_Number IS NOT NULL AND Register_Number != "" ORDER BY Register_Number'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching register numbers:', error);
        res.status(500).json({ message: 'Failed to fetch register numbers', error: error.message });
    }
};

// Get student details by register number
export const getStudentByRegister = async (req, res) => {
    try {
        const { registerNumber } = req.params;
        const [rows] = await db.query(
            `SELECT 
        Register_Number as register_number,
        Student_Name as student_name,
        Dept_Name as dept_name,
        Dept_Code as dept_code,
        Semester as semester,
        Year as year,
        Regulation as regulation,
        Academic_Year as academic_year
      FROM student_master 
      WHERE Register_Number = ?`,
            [registerNumber]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching student details:', error);
        res.status(500).json({ message: 'Failed to fetch student details', error: error.message });
    }
};

// Create new placement record
export const createPlacement = async (req, res) => {
    try {
        const {
            register_number,
            student_name,
            dept_name,
            dept_code,
            semester,
            year,
            regulation,
            company_name,
            company_location,
            package_level,
            academic_year
        } = req.body;

        // Validate required fields
        if (!register_number || !student_name || !company_name) {
            return res.status(400).json({ message: 'Register number, student name, and company name are required' });
        }

        // Note: 'stduent_name' is a typo in the database column name
        const [result] = await db.query(
            `INSERT INTO placement_details 
      (register_number, stduent_name, dept_name, dept_code, semester, year, regulation, academic_year, company_name, company_location, package_level, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [register_number, student_name, dept_name, dept_code, semester, year, regulation, academic_year, company_name, company_location, package_level]
        );

        res.status(201).json({
            message: 'Placement record created successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating placement record:', error);
        res.status(500).json({ message: 'Failed to create placement record', error: error.message });
    }
};

// Get all placement records
export const getAllPlacements = async (req, res) => {
    try {
        // Note: 'stduent_name' is a typo in the database column name
        const [rows] = await db.query(
            `SELECT 
        id,
        register_number,
        stduent_name as student_name,
        dept_name,
        dept_code,
        semester,
        year,
        regulation,
        academic_year,
        company_name,
        company_location,
        package_level,
        created_at,
        updated_at
      FROM placement_details 
      ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching placement records:', error);
        res.status(500).json({ message: 'Failed to fetch placement records', error: error.message });
    }
};

// Get placement by ID
export const getPlacementById = async (req, res) => {
    try {
        const { id } = req.params;
        // Note: 'stduent_name' is a typo in the database column name
        const [rows] = await db.query(
            `SELECT 
        id,
        register_number,
        stduent_name as student_name,
        dept_name,
        dept_code,
        semester,
        year,
        regulation,
        academic_year,
        company_name,
        company_location,
        package_level,
        created_at,
        updated_at
      FROM placement_details 
      WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Placement record not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching placement record:', error);
        res.status(500).json({ message: 'Failed to fetch placement record', error: error.message });
    }
};

// Update placement record
export const updatePlacement = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            company_name,
            company_location,
            package_level
        } = req.body;

        // Validate required fields
        if (!company_name) {
            return res.status(400).json({ message: 'Company name is required' });
        }

        const [result] = await db.query(
            `UPDATE placement_details 
      SET company_name = ?, company_location = ?, package_level = ?, updated_at = NOW() 
      WHERE id = ?`,
            [company_name, company_location, package_level, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Placement record not found' });
        }

        res.json({ message: 'Placement record updated successfully' });
    } catch (error) {
        console.error('Error updating placement record:', error);
        res.status(500).json({ message: 'Failed to update placement record', error: error.message });
    }
};

// Delete placement record
export const deletePlacement = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await db.query(
            'DELETE FROM placement_details WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Placement record not found' });
        }

        res.json({ message: 'Placement record deleted successfully' });
    } catch (error) {
        console.error('Error deleting placement record:', error);
        res.status(500).json({ message: 'Failed to delete placement record', error: error.message });
    }
};

// Get placement statistics for dashboard
export const getPlacementStats = async (req, res) => {
    try {
        // Company-wise stats
        const [companyStats] = await db.query(
            `SELECT 
        company_name, 
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM placement_details), 1) as percentage
      FROM placement_details 
      GROUP BY company_name 
      ORDER BY count DESC`
        );

        // Academic Year-wise stats
        const [academicYearStats] = await db.query(
            `SELECT 
        academic_year, 
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM placement_details), 1) as percentage
      FROM placement_details 
      GROUP BY academic_year 
      ORDER BY academic_year DESC`
        );

        // Total count
        const [totalCount] = await db.query('SELECT COUNT(*) as total FROM placement_details');

        res.json({
            companyStats,
            academicYearStats,
            total: totalCount[0].total
        });
    } catch (error) {
        console.error('Error fetching placement stats:', error);
        res.status(500).json({ message: 'Failed to fetch placement stats', error: error.message });
    }
};
