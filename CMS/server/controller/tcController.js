import db from '../db.js';

// Get TC data by registration number
export const getTCByRegNo = async (req, res) => {
  try {
    const { regNo } = req.query;
    if (!regNo) return res.status(400).json({ error: 'Registration number is required' });

    const sql = `
      SELECT 
        Register_Number as reg_no,
        Student_Name as name,
        Father_Name as father_name,
        Guardian_Name as guardian_name,
        DOB as dob,
        Gender as sex,
        Community as community,
        Caste as caste,
        Religion as religion,
        Nationality as nationality,
        Admission_Date as date_of_admission,
        Course_Name as course,
        Dept_Name as dept,
        Medium_of_Instruction as medium_of_instruction,
        Semester as sem,
        Year as year,
        Year_Of_Department as year_of_department,
        Leaving_Date as leaving_date,
        Reason_Leaving as reason_leaving,
        Identification_of_Student as identification,
        tc_no,
        tc_create_date as date_of_transfer,
        tc_issue_date as issue_date_tc,
        conduct_character as conduct,
        whether_completed as completed
      FROM student_master 
      WHERE Register_Number = ?
    `;

    const [rows] = await db.query(sql, [regNo]);

    if (rows.length === 0) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Update TC data in student_master
export const updateTC = async (req, res) => {
  try {
    const { id } = req.params; // id is Register_Number
    const tcData = req.body;

    if (!id) return res.status(400).json({ error: 'Registration number is required' });

    // Map incoming data to database columns if necessary
    const updateData = {
      tc_no: tcData.tc_no,
      tc_create_date: tcData.tc_create_date || tcData.tc_date || tcData.TC_Date || tcData.dateMade || tcData.date_of_transfer,
      tc_issue_date: tcData.tc_issue_date || tcData.Issue_Date_TC || tcData.dateIssue || tcData.issue_date_tc,
      reason_leaving: tcData.reason_leaving || tcData.Reason_Leaving,
      leaving_date: tcData.leaving_date || tcData.Leaving_Date || tcData.dateLeft,
      conduct_character: tcData.conduct_character || tcData.Conduct_Character || tcData.conduct,
      whether_completed: tcData.whether_completed || tcData.Whether_Qualified || tcData.completed,
      // Also allow updating student basic info if provided
      Student_Name: tcData.Student_Name || tcData.name,
      Father_Name: tcData.Father_Name || tcData.father_name,
      Guardian_Name: tcData.Guardian_Name || tcData.guardian_name,
      DOB: tcData.DOB || tcData.dob,
      Gender: tcData.Gender || tcData.sex,
      Community: tcData.Community || tcData.community,
      Caste: tcData.Caste || tcData.caste,
      Nationality: tcData.Nationality || tcData.nationality,
      Religion: tcData.Religion || tcData.religion,
      Admission_Date: tcData.Admission_Date || tcData.date_of_admission,
      Course_Name: tcData.Course_Name || tcData.course,
      Dept_Name: tcData.Dept_Name || tcData.dept,
      Semester: tcData.Semester || tcData.sem,
      Year: tcData.Year || tcData.year,
      Year_Of_Department: tcData.Year_Of_Department || tcData.year_of_department,
      Medium_of_Instruction: tcData.Medium_of_Instruction || tcData.medium_of_instruction,
      Identification_of_Student: tcData.Identification_of_Student || tcData.identification
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const sql = `UPDATE student_master SET ? WHERE Register_Number = ?`;
    const [result] = await db.query(sql, [updateData, id]);

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Student not found' });
    res.json({ success: true, message: 'TC details updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get all students with issued TCs
export const getAllTC = async (req, res) => {
  try {
    const sql = `
      SELECT * FROM student_master 
      WHERE tc_no IS NOT NULL AND tc_no != ''
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Placeholder for save (can be same as update if we assume student always exists)
export const saveTC = updateTC;
