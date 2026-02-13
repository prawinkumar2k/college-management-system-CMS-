// server/controllers/admittedStudentController.js
import db from "../db.js";

// FIXED Department Code Mapping
const DEPT_CODE_MAP = {
  "D.PHARM": "1000",
  "B.PHARM": "2000",
  "M.PHARM": "3000",
  "Ph.D": "4000",
};

// ------------------------------------------------------
// GET ALL
// ------------------------------------------------------
export const getAllAdmittedStudents = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM student_master ORDER BY Id DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET ALL ERROR:", err);
    res.status(500).json({ error: "Failed to fetch students" });
  }
};

// ------------------------------------------------------
// GET ONE
// ------------------------------------------------------
export const getAdmittedStudentById = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM student_master WHERE Id = ?", [
      req.params.id,
    ]);

    if (!rows.length) return res.status(404).json({ error: "Student not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("GET BY ID ERROR:", err);
    res.status(500).json({ error: "Failed to fetch student" });
  }
};

// ------------------------------------------------------
// CREATE STUDENT
// ------------------------------------------------------
export const createAdmittedStudent = async (req, res) => {
  try {
    const data = req.body;
    
    console.log("CREATE REQUEST RECEIVED:", JSON.stringify(data, null, 2));

    // 🔥 Map frontend → DB fields
    const mapped = {
      Mode_Of_Joining: data.entry_type,
      Application_No: data.application_no,
      Student_Name: data.name,
      Admission_Status: data.status,
      Dept_Name: data.branch_sec,
      Dept_Code: data.dept_code,
      Register_No: data.reg_no,
      Community: data.community,
      Allocated_Quota: data.allocated_quota,
      Std_UID: data.student_uid,
    };

    console.log("MAPPED DATA:", JSON.stringify(mapped, null, 2));

    // --------------------------
    // AUTO-GENERATE ROLL NUMBER
    // --------------------------
    const dept = mapped.Dept_Code || "0000";
    const year = String(new Date().getFullYear()).slice(-2);
    const prefix = `${year}${dept}`;

    const [r] = await db.query(
      `SELECT Roll_Number FROM student_master WHERE Roll_Number LIKE ? ORDER BY Roll_Number DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let nextNumber = 1;
    if (r.length) {
      const num = parseInt(r[0].Roll_Number.slice(prefix.length), 10);
      if (!isNaN(num)) nextNumber = num + 1;
    }

    const rollNumber = prefix + String(nextNumber).padStart(3, "0");
    mapped.Roll_Number = rollNumber;

    // --------------------------
    // INSERT SQL
    // --------------------------
    const sql = `
      INSERT INTO student_master 
      (Mode_Of_Joining, Application_No, Student_Name, Admission_Status,
       Dept_Name, Dept_Code, Roll_Number, Register_No, Community, Allocated_Quota, Std_UID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      mapped.Mode_Of_Joining,
      mapped.Application_No,
      mapped.Student_Name,
      mapped.Admission_Status,
      mapped.Dept_Name,
      mapped.Dept_Code,
      mapped.Roll_Number,
      mapped.Register_No,
      mapped.Community,
      mapped.Allocated_Quota,
      mapped.Std_UID,
    ];

    const [result] = await db.query(sql, params);

    res.status(201).json({ id: result.insertId, ...mapped });
  } catch (err) {
    console.error("CREATE ERROR:", err.message || err);
    console.error("Full Error:", err);
    res.status(500).json({ 
      error: "Failed to create student",
      details: err.message || err.toString()
    });
  }
};

// ------------------------------------------------------
// UPDATE STUDENT
// ------------------------------------------------------
export const updateAdmittedStudent = async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    const mapped = {
      Mode_Of_Joining: data.entry_type,
      Application_No: data.application_no,
      Student_Name: data.name,
      Admission_Status: data.status,
      Dept_Name: data.branch_sec,
      Dept_Code: data.dept_code,
      Roll_Number: data.roll_no,
      Register_No: data.reg_no,
      Community: data.community,
      Allocated_Quota: data.allocated_quota,
      Std_UID: data.student_uid,
    };

    const sql = `
      UPDATE student_master SET
      Mode_Of_Joining=?, Application_No=?, Student_Name=?, Admission_Status=?,
      Dept_Name=?, Dept_Code=?, Roll_Number=?, Register_No=?, Community=?, Allocated_Quota=?, Student_UID=?
      WHERE Id=?
    `;

    const params = [
      mapped.Mode_Of_Joining,
      mapped.Application_No,
      mapped.Student_Name,
      mapped.Admission_Status,
      mapped.Dept_Name,
      mapped.Dept_Code,
      mapped.Roll_Number,
      mapped.Register_No,
      mapped.Community,
      mapped.Allocated_Quota,
      mapped.Student_UID,
      id,
    ];

    await db.query(sql, params);

    res.json({ id, ...mapped });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update student" });
  }
};

// ------------------------------------------------------
// DELETE STUDENT
// ------------------------------------------------------
export const deleteAdmittedStudent = async (req, res) => {
  try {
    await db.query("DELETE FROM student_master WHERE Id = ?", [req.params.id]);
    res.json({ message: "Student deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete student" });
  }
};

// ------------------------------------------------------
// CHECK/GENERATE STUDENT UID
// Based on application number, check if UID exists or generate new one
// UID format: {application_no}{sequence} e.g., 20235261001, 20235261002, etc.
// ------------------------------------------------------
export const checkAndGenerateUID = async (req, res) => {
  try {
    const applicationNo = req.params.applicationNo;
    
    if (!applicationNo) {
      return res.status(400).json({ error: "Application number is required" });
    }

    // Check if any student with this application number already has a UID
    const [existingUIDRow] = await db.query(
      "SELECT Std_UID FROM student_master WHERE Application_No = ? AND Std_UID IS NOT NULL AND Std_UID != '' LIMIT 1",
      [applicationNo]
    );

    if (existingUIDRow && existingUIDRow.length > 0) {
      return res.json({ 
        uid: existingUIDRow[0].Std_UID,
        isExisting: true 
      });
    }

    // No existing UID found, generate new one
    // Find the highest sequence for this application number
    const [lastUIDRow] = await db.query(
      "SELECT Std_UID FROM student_master WHERE Application_No = ? AND Std_UID LIKE ? ORDER BY Std_UID DESC LIMIT 1",
      [applicationNo, `${applicationNo}%`]
    );

    let nextSequence = 1;
    if (lastUIDRow && lastUIDRow.length > 0) {
      const lastUID = lastUIDRow[0].Std_UID;
      const sequenceStr = lastUID.substring(String(applicationNo).length);
      const sequenceNum = parseInt(sequenceStr, 10);
      if (!isNaN(sequenceNum)) {
        nextSequence = sequenceNum + 1;
      }
    }

    return res.json({ 
      uid: null,
      nextSequence: nextSequence,
      isExisting: false 
    });
  } catch (err) {
    console.error("CHECK UID ERROR:", err);
    res.status(500).json({ error: "Failed to check/generate UID" });
  }
};
