import db from '../db.js';

// Get all fee details
export const getAllFeeDetails = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM fees_details ORDER BY Created_At DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add new fee detail
export const addFeeDetail = async (req, res) => {
  try {
    const { 
      academicYear, 
      modeOfJoin, 
      type, 
      course, 
      department, 
      departmentCode, 
      feeSem, 
      year, 
      feeType, 
      amount 
    } = req.body;

    const query = `
      INSERT INTO fees_details 
      (Academic_Year, Mode_of_Join, Course_Name, Dept_Name, Dept_Code, Semester, Year, Type, Fees_Type, Amount, Created_At) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await db.query(query, [
      academicYear,
      modeOfJoin,
      course,
      department,
      departmentCode,
      feeSem,
      year,
      type,
      feeType,
      amount
    ]);

    res.json({ message: 'Fee detail added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update fee detail
export const updateFeeDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      academicYear, 
      modeOfJoin, 
      type, 
      course, 
      department, 
      departmentCode, 
      feeSem, 
      year, 
      feeType, 
      amount 
    } = req.body;

    const query = `
      UPDATE fees_details 
      SET Academic_Year=?, Mode_of_Join=?, Course_Name=?, Dept_Name=?, Dept_Code=?, 
          Semester=?, Year=?, Type=?, Fees_Type=?, Amount=?, Updated_At=NOW() 
      WHERE Id=?
    `;

    await db.query(query, [
      academicYear,
      modeOfJoin,
      course,
      department,
      departmentCode,
      feeSem,
      year,
      type,
      feeType,
      amount,
      id
    ]);

    res.json({ message: 'Fee detail updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete fee detail
export const deleteFeeDetail = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM fees_details WHERE Id=?', [id]);
    res.json({ message: 'Fee detail deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get fee detail by ID
export const getFeeDetailById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query('SELECT * FROM fees_details WHERE Id=?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Fee detail not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all departments
export const getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT Course_Name, Dept_Name, Dept_Code FROM course_details ORDER BY Course_Name, Dept_Name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get department name by department code
export const getDepartmentNameByCode = async (req, res) => {
  try {
    const { deptCode } = req.params;
    const [rows] = await db.query('SELECT Dept_Name, Dept_Code FROM course_details WHERE Dept_Code=?', [deptCode]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all semesters with year
export const getSemestersWithYear = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Semester, Year FROM semester_master ORDER BY Semester');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all academic years
export const getAcademicYears = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Academic_Year FROM academic_year_master ORDER BY Academic_Year DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};