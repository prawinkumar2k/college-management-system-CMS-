// Consolidate Report for Application Issues
export const consolidateReport = async (req, res) => {
  try {
    const { fromDate, toDate, year } = req.query;
    // Example query: count applications issued per day in range
    const sql = `
      SELECT DATE(Admission_Date) as date, COUNT(*) as totalIssued
      FROM student_master
      WHERE Admission_Date BETWEEN ? AND ?
      AND YEAR(Admission_Date) = ?
      GROUP BY DATE(Admission_Date)
      ORDER BY DATE(Admission_Date)
    `;
    const params = [fromDate, toDate, year];
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("CONSOLIDATE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch consolidate report", detail: err.message });
  }
};
// server/controller/applicationIssueController.js
import db from "../db.js";

// CREATE student
export const createStudent = async (req, res) => {
  try {
    const data = req.body;
    if (!data.Application_No || !data.Student_Name) {
      return res.status(400).json({ error: "Missing required fields: Application_No, Student_Name" });
    }
    // basic validation
    if (data.Father_Mobile && !/^\d{10}$/.test(String(data.Father_Mobile))) {
      return res.status(400).json({ error: "Father_Mobile must be exactly 10 digits" });
    }
    if (data.Admission_Date && !/^\d{4}-\d{2}-\d{2}$/.test(String(data.Admission_Date))) {
      return res.status(400).json({ error: "Admission_Date must be in YYYY-MM-DD format" });
    }
    // Check duplicate Application_No
    const [exist] = await db.query(
      `SELECT id FROM student_master WHERE Application_No = ?`,
      [data.Application_No]
    );
    if (exist.length > 0) {
      return res.status(409).json({ error: "Application number already exists" });
    }
    const sql = `
      INSERT INTO student_master
      (Application_No, Course_Name, Student_Name, Gender, Qualification,
       Father_Name, Father_Mobile, Community, Current_Address,
       Admission_Date, Reference, Paid_Fees)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      data.Application_No,
      data.Course_Name || data.Course_Applied || data.courseApplied || null,
      data.Student_Name,
      data.Gender || null,
      data.Qualification || data.qualification || null,
      data.Father_Name || null,
      data.Father_Mobile || null,
      data.Community || null,
      data.Current_Address || data.address || null,
      data.Admission_Date || data.date || null,
      data.Reference || data.reference || null,
      data.Paid_Fees || data.amount || null
    ];
    const [result] = await db.query(sql, params);
    const insertId = result.insertId;
    // return the created row
    const [rows] = await db.query(`SELECT * FROM student_master WHERE id = ?`, [insertId]);
    return res.status(201).json({ message: "Student created", insertId, student: rows[0] });
  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to create student", detail: err.message });
  }
};

// READ ALL students
export const getStudents = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM student_master ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    console.error("FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch students", detail: err.message });
  }
};

// UPDATE student
export const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    if (!data.Application_No || !data.Student_Name) {
      return res.status(400).json({ error: "Missing required fields: Application_No, Student_Name" });
    }
    const sql = `
      UPDATE student_master
      SET
        Application_No=?,
        Course_Name=?,
        Student_Name=?,
        Gender=?,
        Qualification=?,
        Father_Name=?,
        Father_Mobile=?,
        Community=?,
        Current_Address=?,
        Admission_Date=?,
        Reference=?,
        Paid_Fees=?
      WHERE id=?
    `;
    const params = [
      data.Application_No,
      data.Course_Name || data.Course_Applied || data.courseApplied || null,
      data.Student_Name,
      data.Gender || null,
      data.Qualification || data.qualification || null,
      data.Father_Name || null,
      data.Father_Mobile || null,
      data.Community || null,
      data.Current_Address || data.address || null,
      data.Admission_Date || data.date || null,
      data.Reference || data.reference || null,
      data.Paid_Fees || data.amount || null,
      id
    ];
    await db.query(sql, params);
    // return updated row
    const [rows] = await db.query(`SELECT * FROM student_master WHERE id = ?`, [id]);
    res.json({ message: "Student updated", student: rows[0] });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update student", detail: err.message });
  }
};

// DELETE student
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(`DELETE FROM student_master WHERE id = ?`, [id]);
    res.json({ message: "Student deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete student", detail: err.message });
  }
};


//community_master table get community
export const getCommunity = async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT id, Community FROM community_master ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    console.error("FETCH ERROR:", err);
    res.status(500).json({ error: "Failed to fetch communities", detail: err.message });
  }
};

// Fetch students by course (for auto-populate in Application Issue)
export const getStudentsByCourse = async (req, res) => {
  try {
    const { courseName } = req.query;
    
    if (!courseName) {
      return res.status(400).json({ error: "Course name is required" });
    }

    // Query to fetch students for the specific course with Roll No and Register No
    const sql = `
      SELECT 
        id,
        Application_No,
        Student_Name,
        Roll_Number,
        Register_Number,
        Course_Name,
        Gender,
        Qualification,
        Father_Name,
        Father_Mobile,
        Community,
        Current_Address,
        Admission_Date
      FROM student_master
      WHERE Course_Name = ?
      ORDER BY Student_Name ASC
    `;
    
    const [rows] = await db.query(sql, [courseName]);
    res.json(rows);
  } catch (err) {
    console.error("FETCH STUDENTS BY COURSE ERROR:", err);
    res.status(500).json({ error: "Failed to fetch students by course", detail: err.message });
  }
};