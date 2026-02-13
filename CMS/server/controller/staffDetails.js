import db from '../db.js'; // adjust import if your db connection is elsewhere
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fetch all designations
export const getAllDesignations = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM designation_master');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch designations' });
  }
};

// Fetch all religions
export const getAllReligions = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM religion_matser');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch religions' });
  }
};

// Fetch all communities
export const getAllCommunities = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM community_master');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch communities' });
  }
};

// Fetch all unique Dept_Name names from course_details
export const getAllDept_Names = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Dept_Name, Dept_Code, Course_Name FROM course_details');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Dept_Names' });
  }
};

// Get next staff ID for a Dept_Name code
export const getNextStaffId = async (req, res) => {
  const { deptCode } = req.query;
  if (!deptCode) return res.status(400).json({ error: 'deptCode is required' });
  try {
    // Find the max Staff_ID for this Dept_Name
    const [rows] = await db.query(
      'SELECT Staff_ID FROM staff_master WHERE Staff_ID LIKE ? ORDER BY Staff_ID DESC LIMIT 1',
      [`${deptCode}%`]
    );
    let nextId;
    if (rows.length === 0) {
      // First staff for this Dept_Name
      nextId = `${deptCode}0001`;
    } else {
      const lastId = rows[0].Staff_ID;
      // Extract the numeric part after the Dept_Name code
      const numericPart = lastId.substring(deptCode.length);
      const nextNum = parseInt(numericPart, 10) + 1;
      // Pad the number to 4 digits
      nextId = `${deptCode}${String(nextNum).padStart(4, '0')}`;
    }
    res.json({ staffId: nextId });
  } catch (err) {
    console.error('Error generating staff ID:', err);
    res.status(500).json({ error: 'Failed to generate staff ID', details: err.message });
  }
};

// Insert a new staff details record
export const insertStaffDetails = async (req, res) => {
  try {
    // Helper to handle empty string as null for date fields
    const parseDate = (val) => val === '' || val === null || val === undefined ? null : val;

    const {
      Staff_ID,
      Staff_Name,
      Designation,
      Qualification,
      Category,
      Course_Name,
      Dept_Name,
      Dept_Code,
      DOB,
      Gender,
      Mobile,
      Email,
      Religion,
      Community,
      Caste,
      Temporary_Address,
      Permanent_Address,
      Basic_Pay,
      PF_Number,
      Joining_Date,
      Reliving_Date,
      Account_Number,
      Bank_Name,
      PAN_Number,
      Aadhar_Number
    } = req.body;

    let Photo = null;
    if (req.file) {
      Photo = req.file.filename;
    }

    await db.query(
      `INSERT INTO staff_master (
        Staff_ID, Staff_Name, Designation, Qualification, Category, Course_Name, Dept_Name, Dept_Code, DOB, Gender, Mobile, Email,
        Religion, Community, Caste, Temporary_Address, Permanent_Address, Basic_Pay, PF_Number, Joining_Date, Reliving_Date,
        Account_Number, Bank_Name, PAN_Number, Aadhar_Number, Photo
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        Staff_ID, Staff_Name, Designation, Qualification, Category, Course_Name, Dept_Name, Dept_Code,
        parseDate(DOB), Gender, Mobile, Email,
        Religion, Community, Caste, Temporary_Address, Permanent_Address, Basic_Pay, PF_Number,
        parseDate(Joining_Date), parseDate(Reliving_Date),
        Account_Number, Bank_Name, PAN_Number, Aadhar_Number, Photo
      ]
    );
    // Return the photo path if uploaded
    res.status(201).json({
      message: 'Staff details inserted successfully',
      photoPath: Photo ? `/assets/master/${Photo}` : null
    });
  } catch (err) {
    // Log the error for debugging
    console.error('Error inserting staff details:', err);
    res.status(500).json({ error: 'Failed to insert staff details', details: err.message });
  }
};

export const getAllStaff = async (req, res) => {
  try {
    // Return the real id column, not alias
    const [rows] = await db.query('SELECT * FROM staff_master ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching staff records:', err);
    res.status(500).json({ error: 'Failed to fetch staff records', message: err.message });
  }
};

// Update staff details
export const updateStaffDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // Helper to handle empty string as null for date fields
    function parseDate(val) {
      return val === '' ? null : val;
    }

    const {
      Staff_ID,
      Staff_Name,
      Designation,
      Qualification,
      Category,
      Course_Name,
      Dept_Name,
      Dept_Code,
      DOB,
      Gender,
      Mobile,
      Email,
      Religion,
      Community,
      Caste,
      Temporary_Address,
      Permanent_Address,
      Basic_Pay,
      PF_Number,
      Joining_Date,
      Reliving_Date,
      Account_Number,
      Bank_Name,
      PAN_Number,
      Aadhar_Number
    } = req.body;

    let query = `UPDATE staff_master SET 
      Staff_ID = ?, Staff_Name = ?, Designation = ?, Qualification = ?, Category = ?, Course_Name = ?, Dept_Name = ?, Dept_Code = ?, 
      DOB = ?, Gender = ?, Mobile = ?, Email = ?, Religion = ?, Community = ?, Caste = ?, 
      Temporary_Address = ?, Permanent_Address = ?, Basic_Pay = ?, PF_Number = ?, Joining_Date = ?, Reliving_Date = ?, 
      Account_Number = ?, Bank_Name = ?, PAN_Number = ?, Aadhar_Number = ?`;

    const values = [
      Staff_ID,
      Staff_Name,
      Designation,
      Qualification,
      Category,
      Course_Name,
      Dept_Name,
      Dept_Code,
      parseDate(DOB),
      Gender,
      Mobile,
      Email,
      Religion,
      Community,
      Caste,
      Temporary_Address,
      Permanent_Address,
      Basic_Pay,
      PF_Number,
      parseDate(Joining_Date),
      parseDate(Reliving_Date),
      Account_Number,
      Bank_Name,
      PAN_Number,
      Aadhar_Number
    ];

    if (req.file) {
      query += `, Photo = ?`;
      values.push(req.file.filename);
    }

    query += ` WHERE id = ?`;
    values.push(id);

    const [result] = await db.query(query, values);

    if (result.affectedRows === 0) {
      res.status(200).json({ message: 'No changes made to staff details' });
    } else {
      res.json({ message: 'Staff details updated successfully' });
    }
  } catch (err) {
    console.error('Error updating staff details:', err);
    res.status(500).json({ error: 'Failed to update staff details', details: err.message });
  }
};

// Delete staff details
export const deleteStaffDetails = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM staff_master WHERE id = ?', [id]); // <-- use id column
    res.json({ message: 'Staff deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete staff', details: err.message });
  }
};
// Serve staff image with fallback
export const getStaffImage = async (req, res) => {
  try {
    const { filename } = req.params;
    const uploadDir = path.join(__dirname, '../uploads/staff');
    const defaultImage = path.join(uploadDir, 'staff.png');

    // Check if filename is actually valid and not a placeholder
    if (filename && filename !== 'null' && filename !== 'undefined' && filename !== 'Image Not Available') {
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    // Fallback to default image
    if (fs.existsSync(defaultImage)) {
      return res.sendFile(defaultImage);
    } else {
      return res.status(404).json({ error: 'Default image not found' });
    }
  } catch (err) {
    console.error('Error serving staff image:', err);
    res.status(500).json({ error: 'Failed to serve image' });
  }
};
