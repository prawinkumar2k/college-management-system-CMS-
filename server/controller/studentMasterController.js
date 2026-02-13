import db from '../db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Helper function to sanitize values - handles all falsy/invalid values
const sanitize = (v) => {
    // Check for null, undefined, empty string, or the string 'null'/'undefined'
    if (v === null || v === undefined || v === '' || v === 'null' || v === 'undefined') {
        return null;
    }

    // If it's a string that looks numeric, try to convert it
    if (typeof v === 'string') {
        const trimmed = v.trim();
        // Check if it's a numeric string
        if (!isNaN(trimmed) && trimmed !== '') {
            return Number(trimmed);
        }
        // Return the trimmed string
        return trimmed;
    }

    // Return the value as-is for other types (numbers, booleans, objects, etc.)
    return v;
};

// Add Student
export const addStudent = async (req, res) => {
    try {
        console.log('========== ADD STUDENT REQUEST ==========');
        console.log('📝 Incoming student data:', req.body);
        console.log('📸 Incoming file:', req.file);

        const data = req.body;
        let photoPath = '';

        if (req.file) {
            photoPath = req.file.filename;  // Store only filename, not full path
            console.log('📷 Photo saved as:', photoPath);
            console.log('📷 File details:', {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                path: req.file.path,
                mimetype: req.file.mimetype
            });
        } else {
            console.log('⚠️ No photo provided for new student');
        }

        // ===== SAVE TO student_master table (non-education fields) =====
        const masterValues = [
            data.Application_No,
            data.Std_UID || null,
            data.Register_Number || null,
            data.Student_Name,
            data.Gender,
            data.Dob,
            data.Age,
            data.Std_Email || null,
            photoPath,
            data.Father_Name || null,
            data.Father_Mobile || null,
            data.Father_Occupation || null,
            data.Mother_Name || null,
            data.Mother_Mobile || null,
            data.Mother_Occupation || null,
            data.Guardian_Name || null,
            data.Guardian_Mobile || null,
            data.Guardian_Occupation || null,
            data.Guardian_Relation || null,
            data.Blood_Group || null,
            data.Nationality || null,
            data.Religion || null,
            data.Community || null,
            data.Caste || null,
            data.Physically_Challenged || null,
            data.Marital_Status || null,
            data.Aadhaar_No || null,
            data.Pan_No || null,
            data.Mother_Tongue || null,
            data.emisNumber || null,
            data.mediumOfInstruction || null,
            data.fatherAnnualIncome || null,
            data.motherAnnualIncome || null,
            data.guardianAnnualIncome || null,
            data.Permanent_District || null,
            data.Permanent_State || null,
            data.Permanent_Pincode || null,
            data.Permanent_Address || null,
            data.Current_District || null,
            data.Current_State || null,
            data.Current_Pincode || null,
            data.Current_Address || null,
            data.bankName || null,
            data.bankBranch || null,
            data.accountNumber || null,
            data.ifscCode || null,
            data.micrCode || null,
            data.Scholarship || null,
            data.First_Graduate || null,
            data.Bank_Loan || null,
            data.Mode_Of_Joinig || null,
            data.Reference || null,
            data.Present || null,
            data.Course_Name || null,
            data.Dept_Name || null,
            data.Dept_Code || null,
            data.Semester || null,
            data.Year || null,
            data.Admission_Date || null,
            data.Hostel_Required || null,
            data.Transport_Required || null,
            data.Admission_Status || null,
            data.Student_Mobile || null,
            data.Roll_Number || null,
            data.Regulation || null,
            data.Class_Teacher || null,
            data.Class || null,
            data.Allocated_Quota || null,
            new Date() // Created_At
        ];

        const masterColumns = `Application_No, Std_UID, Register_Number, Student_Name, Gender, Dob, Age, Std_Email, Photo_Path,
            Father_Name, Father_Mobile, Father_Occupation, Mother_Name, Mother_Mobile, Mother_Occupation,
            Guardian_Name, Guardian_Mobile, Guardian_Occupation, Guardian_Relation, Blood_Group, Nationality, Religion, Community, Caste,
            Physically_Challenged, Marital_Status, Aadhaar_No, Pan_No, Mother_Tongue, EMIS_No, Medium_Of_Instruction, Father_Annual_Income, Mother_Annual_Income, Guardian_Annual_Income,
            Permanent_District, Permanent_State, Permanent_Pincode, Permanent_Address,
            Current_District, Current_State, Current_Pincode, Current_Address,
            Bank_Name, Bank_Branch, Bank_Account_No, Bank_IFSC_Code, Bank_MICR_Code,
            Scholarship, First_Graduate, Bank_Loan, Mode_Of_Joinig, Reference, Present,
            Course_Name, Dept_Name, Dept_Code, Semester, Year, Admission_Date, Hostel_Required, Transport_Required, Admission_Status,
            Student_Mobile, Roll_Number, Regulation, Class_Teacher, Class, Allocated_Quota,
            Created_At`;

        const masterPlaceholders = masterValues.map(() => '?').join(',');
        const sqlInsertMaster = `INSERT INTO student_master (${masterColumns}) VALUES (${masterPlaceholders})`;
        const sanitizedMasterValues = masterValues.map(sanitize);

        console.log('👤 Inserting to student_master with', sanitizedMasterValues.length, 'parameters');
        console.log('📋 App No:', data.Application_No, '| Name:', data.Student_Name);
        console.log('💾 Bank Branch being saved:', data.bankBranch);
        console.log('📸 Photo Path being saved:', photoPath);
        console.log('🎓 Medium of Instruction being saved:', data.mediumOfInstruction);
        const masterResult = await db.query(sqlInsertMaster, sanitizedMasterValues);
        console.log('✅ Student master record inserted successfully');

        // ===== SAVE TO student_education_details table (education fields) =====
        console.log('📚 Now saving education details...');
        const eduResult = await saveEducationDetails(data);

        if (!eduResult) {
            throw new Error('Failed to save education details - no result returned');
        }

        console.log('✅✅ STUDENT SAVED COMPLETELY - Application_No:', data.Application_No);
        res.json({ success: true, masterResult, eduResult });

    } catch (err) {
        console.error('❌❌ ERROR IN addStudent:', err.message);
        console.error('Stack trace:', err.stack);
        res.status(500).json({ error: err.message });
    }
};

// Helper function to save education details
const saveEducationDetails = async (data) => {
    try {
        // Check if Application_No is provided
        if (!data.Application_No) {
            console.warn('⚠️ No Application_No provided to saveEducationDetails - skipping');
            return;
        }

        console.log('📚 Starting to save education details for Application_No:', data.Application_No);
        console.log('📋 Received education data keys:', Object.keys(data));
        console.log('📊 SSLC Data:', {
            schoolName: data.sslcSchoolName,
            board: data.sslcBoard,
            yearOfPassing: data.sslcYearOfPassing,
            subjects: data.sslcSubjects ? (typeof data.sslcSubjects === 'string' ? 'JSON string' : 'Object') : 'null'
        });
        console.log('📊 HSC Data:', {
            schoolName: data.hscSchoolName,
            board: data.hscBoard,
            yearOfPassing: data.hscYearOfPassing,
            subjects: data.hscSubjects ? (typeof data.hscSubjects === 'string' ? 'JSON string' : 'Object') : 'null'
        });

        // Determine which education sections are selected
        let educationSections = data.educationSections || {
            sslc: true,
            iti: false,
            vocational: false,
            hsc: false
        };

        // If educationSections is a JSON string, parse it
        if (typeof educationSections === 'string') {
            try {
                educationSections = JSON.parse(educationSections);
                console.log('✅ Parsed educationSections:', educationSections);
            } catch (e) {
                console.warn('⚠️ Failed to parse educationSections JSON, using defaults');
                educationSections = {
                    sslc: true,
                    iti: false,
                    vocational: false,
                    hsc: false
                };
            }
        }

        const eduValues = [
            data.Application_No,
            educationSections.sslc ? 'Yes' : 'No', // SSLC
            educationSections.iti ? 'Yes' : 'No', // ITI
            educationSections.vocational ? 'Yes' : 'No', // VOC
            educationSections.hsc ? 'Yes' : 'No', // HSC

            // SSLC - only if selected
            educationSections.sslc ? (data.sslcSchoolName || null) : null,
            educationSections.sslc ? (data.sslcBoard || null) : null,
            educationSections.sslc ? (data.sslcYearOfPassing || null) : null,
            educationSections.sslc ? (data.sslcRegisterNo || null) : null,
            educationSections.sslc ? (data.sslcMarksheetNo || null) : null,
        ];

        // Parse and add SSLC subjects (5 subjects max) - only if SSLC selected
        const sslcSubjects = educationSections.sslc ? safeJsonParse(data.sslcSubjects) : [];
        for (let i = 0; i < 5; i++) {
            const subject = sslcSubjects[i];
            eduValues.push(educationSections.sslc ? (subject?.subject || null) : null); // Subject name
            eduValues.push(educationSections.sslc ? (subject?.max || null) : null); // Max mark
            eduValues.push(educationSections.sslc ? (subject?.marks || null) : null); // Obtained mark
        }

        eduValues.push(educationSections.sslc ? (data.sslcTotalMax || null) : null); // SSLC_Total_Mark
        eduValues.push(educationSections.sslc ? (data.sslcTotalMarks || null) : null); // SSLC_Total_Obtained_Mark
        eduValues.push(educationSections.sslc ? (data.sslcPercentage || null) : null); // SSLC_Percentage

        // SSLC Attempts (5 attempts max) - only if SSLC selected
        const sslcAttempts = educationSections.sslc ? safeJsonParse(data.sslcExaminationAttempts) : [];
        for (let i = 0; i < 5; i++) {
            const attempt = sslcAttempts[i];
            eduValues.push(educationSections.sslc ? (attempt?.marksheetNo || null) : null);
            eduValues.push(educationSections.sslc ? (attempt?.registerNo || null) : null);
            eduValues.push(educationSections.sslc ? (attempt?.month || null) : null);
            eduValues.push(educationSections.sslc ? (attempt?.year || null) : null);
            eduValues.push(educationSections.sslc ? (attempt?.totalMarks || null) : null);
        }

        // ITI - only if selected
        eduValues.push(educationSections.iti ? (data.itiSchoolName || null) : null);
        eduValues.push(educationSections.iti ? (data.itiYearOfPassing || null) : null);

        const itiSubjects = educationSections.iti ? safeJsonParse(data.itiSubjects) : [];
        for (let i = 0; i < 5; i++) {
            const subject = itiSubjects[i];
            eduValues.push(educationSections.iti ? (subject?.subject || null) : null);
            eduValues.push(educationSections.iti ? (subject?.max || null) : null);
            eduValues.push(educationSections.iti ? (subject?.marks || null) : null);
        }

        eduValues.push(educationSections.iti ? (data.itiTotalMax || null) : null);
        eduValues.push(educationSections.iti ? (data.itiTotalMarks || null) : null);
        eduValues.push(educationSections.iti ? (data.itiPercentage || null) : null);

        // ITI Attempts (5 attempts max) - only if ITI selected
        const itiAttempts = educationSections.iti ? safeJsonParse(data.itiExaminationAttempts) : [];
        for (let i = 0; i < 5; i++) {
            const attempt = itiAttempts[i];
            eduValues.push(educationSections.iti ? (attempt?.marksheetNo || null) : null);
            eduValues.push(educationSections.iti ? (attempt?.registerNo || null) : null);
            eduValues.push(educationSections.iti ? (attempt?.month || null) : null);
            eduValues.push(educationSections.iti ? (attempt?.year || null) : null);
            eduValues.push(educationSections.iti ? (attempt?.totalMarks || null) : null);
        }

        // VOC (Vocational) - only if selected
        eduValues.push(educationSections.vocational ? (data.vocationalSchoolName || null) : null);
        eduValues.push(educationSections.vocational ? (data.vocationalYearOfPassing || null) : null);

        const vocSubjects = educationSections.vocational ? safeJsonParse(data.vocationalSubjects) : [];
        for (let i = 0; i < 6; i++) {
            const subject = vocSubjects[i];
            eduValues.push(educationSections.vocational ? (subject?.subject || null) : null);
            eduValues.push(educationSections.vocational ? (subject?.max || null) : null);
            eduValues.push(educationSections.vocational ? (subject?.marks || null) : null);
        }

        eduValues.push(educationSections.vocational ? (data.vocationalTotalMax || null) : null);
        eduValues.push(educationSections.vocational ? (data.vocationalTotalMarks || null) : null);
        eduValues.push(educationSections.vocational ? (data.vocationalPercentage || null) : null);

        // HSC - only if selected
        eduValues.push(educationSections.hsc ? (data.hscSchoolName || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscBoard || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscYearOfPassing || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscRegisterNo || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscExamType || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscMajor || null) : null);

        const hscSubjects = educationSections.hsc ? safeJsonParse(data.hscSubjects) : [];
        for (let i = 0; i < 6; i++) {
            const subject = hscSubjects[i];
            eduValues.push(educationSections.hsc ? (subject?.subject || null) : null);
            eduValues.push(educationSections.hsc ? (subject?.max || null) : null);
            eduValues.push(educationSections.hsc ? (subject?.marks || null) : null);
        }

        eduValues.push(educationSections.hsc ? (data.hscTotalMax || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscTotalMarks || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscPercentage || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscCutoff || null) : null);

        // Build education details insert query
        const eduColumns = `Application_No, SSLC, ITI, VOC, HSC,
            SSLC_School_Name, SSLC_Board, SSLC_Year_Of_Passing, SSLC_Register_No, SSLC_Marksheet_No,
            SSLC_Subject1, SSLC_Subject1_Max_Mark, SSLC_Subject1_Obtained_Mark,
            SSLC_Subject2, SSLC_Subject2_Max_Mark, SSLC_Subject2_Obtained_Mark,
            SSLC_Subject3, SSLC_Subject3_Max_Mark, SSLC_Subject3_Obtained_Mark,
            SSLC_Subject4, SSLC_Subject4_Max_Mark, SSLC_Subject4_Obtained_Mark,
            SSLC_Subject5, SSLC_Subject5_Max_Mark, SSLC_Subject5_Obtained_Mark,
            SSLC_Total_Mark, SSLC_Total_Obtained_Mark, SSLC_Percentage,
            SSLC_Att1_Marksheet_No, SSLC_Att1_Register_No, SSLC_Att1_Month, SSLC_Att1_Year, SSLC_Att1_Total_Marks,
            SSLC_Att2_Marksheet_No, SSLC_Att2_Register_No, SSLC_Att2_Month, SSLC_Att2_Year, SSLC_Att2_Total_Marks,
            SSLC_Att3_Marksheet_No, SSLC_Att3_Register_No, SSLC_Att3_Month, SSLC_Att3_Year, SSLC_Att3_Total_Marks,
            SSLC_Att4_Marksheet_No, SSLC_Att4_Register_No, SSLC_Att4_Month, SSLC_Att4_Year, SSLC_Att4_Total_Marks,
            SSLC_Att5_Marksheet_No, SSLC_Att5_Register_No, SSLC_Att5_Month, SSLC_Att5_Year, SSLC_Att5_Total_Marks,
            ITI_Institution_Name, ITI_Year_Of_Passing,
            ITI_Subject1, ITI_Subject1_Max_Mark, ITI_Subject1_Obtained_Mark,
            ITI_Subject2, ITI_Subject2_Max_Mark, ITI_Subject2_Obtained_Mark,
            ITI_Subject3, ITI_Subject3_Max_Mark, ITI_Subject3_Obtained_Mark,
            ITI_Subject4, ITI_Subject4_Max_Mark, ITI_Subject4_Obtained_Mark,
            ITI_Subject5, ITI_Subject5_Max_Mark, ITI_Subject5_Obtained_Mark,
            ITI_Total_Mark, ITI_Total_Obtained_Mark, ITI_Percentage,
            ITI_Att1_Marksheet_No, ITI_Att1_Register_No, ITI_Att1_Month, ITI_Att1_Year, ITI_Att1_Total_Marks,
            ITI_Att2_Marksheet_No, ITI_Att2_Register_No, ITI_Att2_Month, ITI_Att2_Year, ITI_Att2_Total_Marks,
            ITI_Att3_Marksheet_No, ITI_Att3_Register_No, ITI_Att3_Month, ITI_Att3_Year, ITI_Att3_Total_Marks,
            ITI_Att4_Marksheet_No, ITI_Att4_Register_No, ITI_Att4_Month, ITI_Att4_Year, ITI_Att4_Total_Marks,
            ITI_Att5_Marksheet_No, ITI_Att5_Register_No, ITI_Att5_Month, ITI_Att5_Year, ITI_Att5_Total_Marks,
            VOC_Institution_Name, VOC_Year_Of_Passing,
            VOC_Subject1, VOC_Subject1_Max_Mark, VOC_Subject1_Obtained_Mark,
            VOC_Subject2, VOC_Subject2_Max_Mark, VOC_Subject2_Obtained_Mark,
            VOC_Subject3, VOC_Subject3_Max_Mark, VOC_Subject3_Obtained_Mark,
            VOC_Subject4, VOC_Subject4_Max_Mark, VOC_Subject4_Obtained_Mark,
            VOC_Subject5, VOC_Subject5_Max_Mark, VOC_Subject5_Obtained_Mark,
            VOC_Subject6, VOC_Subject6_Max_Mark, VOC_Subject6_Obtained_Mark,
            VOC_Total_Mark, VOC_Total_Obtained_Mark, VOC_Percentage,
            HSC_School_Name, HSC_Board, HSC_Year_Of_Passing, HSC_Register_No, HSC_Exam_Type, HSC_Major_Stream,
            HSC_Subject1, HSC_Subject1_Max_Mark, HSC_Subject1_Obtained_Mark,
            HSC_Subject2, HSC_Subject2_Max_Mark, HSC_Subject2_Obtained_Mark,
            HSC_Subject3, HSC_Subject3_Max_Mark, HSC_Subject3_Obtained_Mark,
            HSC_Subject4, HSC_Subject4_Max_Mark, HSC_Subject4_Obtained_Mark,
            HSC_Subject5, HSC_Subject5_Max_Mark, HSC_Subject5_Obtained_Mark,
            HSC_Subject6, HSC_Subject6_Max_Mark, HSC_Subject6_Obtained_Mark,
            HSC_Total_Mark, HSC_Total_Obtained_Mark, HSC_Percentage, HSC_Cutoff`;

        const eduPlaceholders = eduValues.map(() => '?').join(',');
        const sqlInsertEdu = `INSERT INTO student_education_details (${eduColumns}) VALUES (${eduPlaceholders})`;
        const sanitizedEduValues = eduValues.map(sanitize);

        // Validate column/parameter count match
        const columnCount = eduColumns.split(',').length;
        const parameterCount = sanitizedEduValues.length;
        console.log(`📊 Column count: ${columnCount}, Parameter count: ${parameterCount}`);

        if (columnCount !== parameterCount) {
            throw new Error(`Column count (${columnCount}) does not match parameter count (${parameterCount}) in education details insert`);
        }

        const result = await db.query(sqlInsertEdu, sanitizedEduValues);
        console.log('✅ Education details saved successfully');
        console.log('✅ Insert result:', result);

        // Validate that insert was successful
        if (!result || (result.affectedRows !== undefined && result.affectedRows === 0)) {
            throw new Error('Education details insert returned no affected rows');
        }

        return result;
    } catch (err) {
        console.error('❌ Error saving education details for Application_No:', data.Application_No);
        console.error('❌ Error message:', err.message);
        console.error('❌ Stack trace:', err.stack);
        throw err;
    }
};

// Edit Student
export const editStudent = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        console.log('========== EDIT STUDENT REQUEST ==========');
        console.log('📝 Student ID:', id);
        console.log('📝 Incoming data:', data);
        console.log('📸 Incoming file:', req.file);

        let photoPath = data.Photo_Path;
        if (req.file) {
            photoPath = req.file.filename;  // Store only filename, not full path
            console.log('📷 Photo updated as:', photoPath);
            console.log('📷 File details:', {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                path: req.file.path,
                mimetype: req.file.mimetype
            });
        } else {
            console.log('⚠️ No new photo uploaded, keeping existing:', photoPath);
        }

        // ===== UPDATE student_master table =====
        const sql = `UPDATE student_master SET
            Std_UID=?, Register_Number=?, Student_Name=?, Gender=?, Dob=?, Age=?, Std_Email=?, Photo_Path=?,
            Father_Name=?, Father_Mobile=?, Father_Occupation=?, Mother_Name=?, Mother_Mobile=?, Mother_Occupation=?,
            Guardian_Name=?, Guardian_Mobile=?, Guardian_Occupation=?, Guardian_Relation=?, Blood_Group=?, Nationality=?, Religion=?, Community=?, Caste=?,
            Physically_Challenged=?, Marital_Status=?, Aadhaar_No=?, Pan_No=?, Mother_Tongue=?, EMIS_No=?, Medium_Of_Instruction=?, Father_Annual_Income=?, Mother_Annual_Income=?, Guardian_Annual_Income=?,
            Permanent_District=?, Permanent_State=?, Permanent_Pincode=?, Permanent_Address=?,
            Current_District=?, Current_State=?, Current_Pincode=?, Current_Address=?,
            Bank_Name=?, Bank_Branch=?, Bank_Account_No=?, Bank_IFSC_Code=?, Bank_MICR_Code=?,
            Scholarship=?, First_Graduate=?, Bank_Loan=?, Mode_Of_Joinig=?, Reference=?, Present=?,
            Course_Name=?, Dept_Name=?, Dept_Code=?, Semester=?, Year=?, Admission_Date=?, Hostel_Required=?, Transport_Required=?, Admission_Status=?,
            Student_Mobile=?, Roll_Number=?, Regulation=?, Class_Teacher=?, Class=?, Allocated_Quota=?,
            Updated_At = CURRENT_TIMESTAMP
        WHERE Id=?`;

        const values = [
            data.Std_UID || null,
            data.Register_Number || null,
            data.Student_Name,
            data.Gender,
            data.Dob,
            data.Age,
            data.Std_Email || null,
            photoPath,
            data.Father_Name || null,
            data.Father_Mobile || null,
            data.Father_Occupation || null,
            data.Mother_Name || null,
            data.Mother_Mobile || null,
            data.Mother_Occupation || null,
            data.Guardian_Name || null,
            data.Guardian_Mobile || null,
            data.Guardian_Occupation || null,
            data.Guardian_Relation || null,
            data.Blood_Group || null,
            data.Nationality || null,
            data.Religion || null,
            data.Community || null,
            data.Caste || null,
            data.Physically_Challenged || null,
            data.Marital_Status || null,
            data.Aadhaar_No || null,
            data.Pan_No || null,
            data.Mother_Tongue || null,
            data.emisNumber || null,
            data.mediumOfInstruction || null,
            data.fatherAnnualIncome || null,
            data.motherAnnualIncome || null,
            data.guardianAnnualIncome || null,
            data.Permanent_District || null,
            data.Permanent_State || null,
            data.Permanent_Pincode || null,
            data.Permanent_Address || null,
            data.Current_District || null,
            data.Current_State || null,
            data.Current_Pincode || null,
            data.Current_Address || null,
            data.bankName || null,
            data.bankBranch || null,
            data.accountNumber || null,
            data.ifscCode || null,
            data.micrCode || null,
            data.Scholarship || null,
            data.First_Graduate || null,
            data.Bank_Loan || null,
            data.Mode_Of_Joinig || null,
            data.Reference || null,
            data.Present || null,
            data.Course_Name || null,
            data.Dept_Name || null,
            data.Dept_Code || null,
            data.Semester || null,
            data.Year || null,
            data.Admission_Date || null,
            data.Hostel_Required || null,
            data.Transport_Required || null,
            data.Admission_Status || null,
            data.Student_Mobile || null,
            data.Roll_Number || null,
            data.Regulation || null,
            data.Class_Teacher || null,
            data.Class || null,
            data.Allocated_Quota || null,
            id
        ];

        const sanitizedValues = values.map(sanitize);
        console.log('========== EDIT STUDENT REQUEST ==========');
        console.log('📝 Update query with', sanitizedValues.length, 'parameters');
        console.log('📋 Student ID:', id, '| App No:', data.Application_No);
        await db.query(sql, sanitizedValues);
        console.log('✅ Student master record updated successfully');

        // ===== UPDATE student_education_details table =====
        // Only update education details if Application_No is provided
        // Handle case where Application_No might be an array (from form submission)
        let appNo = data.Application_No;
        if (Array.isArray(appNo)) {
            appNo = appNo[0]; // Extract first value if it's an array
            console.warn('⚠️ Application_No was an array, extracted first value:', appNo);
        }

        if (appNo) {
            await updateEducationDetails(data, appNo);
        } else {
            console.warn('⚠️ No Application_No provided, skipping education details update');
        }
        res.json({ success: true });
    } catch (err) {
        console.error("❌❌ ERROR IN editStudent:", err.message);
        console.error('Stack trace:', err.stack);
        res.status(500).json({ error: err.message });
    }
};

// Helper function to safely parse JSON and handle "undefined" strings
const safeJsonParse = (value, defaultValue = []) => {
    // Return default if value is null, undefined, or the string "undefined"
    if (!value || value === 'undefined') {
        return defaultValue;
    }

    try {
        // If already a string, parse it
        if (typeof value === 'string') {
            return JSON.parse(value);
        }
        // If it's an object, return as-is
        return value;
    } catch (err) {
        console.warn('⚠️ Failed to parse JSON:', err.message, '| Value:', value);
        return defaultValue;
    }
};

// Helper function to update education details
const updateEducationDetails = async (data, applicationNo) => {
    let appNo = null; // Declare outside try block so it's accessible in catch block

    try {
        // Validate and sanitize applicationNo
        appNo = applicationNo;

        // Handle array case (shouldn't happen but be defensive)
        if (Array.isArray(appNo)) {
            appNo = appNo[0];
        }

        // Convert to string and trim
        appNo = String(appNo).trim();

        // Validate applicationNo to prevent SQL injection and errors
        if (!appNo || appNo === 'null' || appNo === '') {
            console.warn('❌ Invalid applicationNo provided:', applicationNo);
            throw new Error('Invalid Application Number provided');
        }

        console.log('📚 Updating education details for Application_No:', appNo);
        const existingRecord = await db.query(
            'SELECT Application_No FROM student_education_details WHERE Application_No = ? LIMIT 1',
            [appNo]
        );

        // Only delete if record exists
        if (existingRecord && existingRecord.length > 0) {
            console.log('Found existing education details, deleting for Application_No:', appNo);
            await db.query('DELETE FROM student_education_details WHERE Application_No = ?', [appNo]);
        } else {
            console.log('No existing education details found for Application_No:', appNo);
        }

        // Then insert new record using the same logic as addStudent
        // Determine which education sections are selected
        let educationSections = data.educationSections || {
            sslc: true,
            iti: false,
            vocational: false,
            hsc: false
        };

        // If educationSections is a JSON string, parse it
        if (typeof educationSections === 'string') {
            try {
                educationSections = JSON.parse(educationSections);
                console.log('✅ Parsed educationSections:', educationSections);
            } catch (e) {
                console.warn('⚠️ Failed to parse educationSections JSON, using defaults');
                educationSections = {
                    sslc: true,
                    iti: false,
                    vocational: false,
                    hsc: false
                };
            }
        }

        const eduValues = [
            appNo,
            educationSections.sslc ? 'Yes' : 'No', // SSLC
            educationSections.iti ? 'Yes' : 'No', // ITI
            educationSections.vocational ? 'Yes' : 'No', // VOC
            educationSections.hsc ? 'Yes' : 'No', // HSC

            // SSLC - only if selected
            educationSections.sslc ? (data.sslcSchoolName || null) : null,
            educationSections.sslc ? (data.sslcBoard || null) : null,
            educationSections.sslc ? (data.sslcYearOfPassing || null) : null,
            educationSections.sslc ? (data.sslcRegisterNo || null) : null,
            educationSections.sslc ? (data.sslcMarksheetNo || null) : null,
        ];

        // Parse and add SSLC subjects (5 subjects max) - only if SSLC selected
        const sslcSubjects = educationSections.sslc ? safeJsonParse(data.sslcSubjects) : [];
        for (let i = 0; i < 5; i++) {
            const subject = sslcSubjects[i];
            eduValues.push(educationSections.sslc ? (subject?.subject || null) : null); // Subject name
            eduValues.push(educationSections.sslc ? (subject?.max || null) : null); // Max mark
            eduValues.push(educationSections.sslc ? (subject?.marks || null) : null); // Obtained mark
        }

        eduValues.push(educationSections.sslc ? (data.sslcTotalMax || null) : null);
        eduValues.push(educationSections.sslc ? (data.sslcTotalMarks || null) : null);
        eduValues.push(educationSections.sslc ? (data.sslcPercentage || null) : null);

        // SSLC Attempts (5 attempts max) - only if SSLC selected
        const sslcAttempts = educationSections.sslc ? safeJsonParse(data.sslcExaminationAttempts) : [];
        for (let i = 0; i < 5; i++) {
            const attempt = sslcAttempts[i];
            eduValues.push(educationSections.sslc ? (attempt?.marksheetNo || null) : null);
            eduValues.push(educationSections.sslc ? (attempt?.registerNo || null) : null);
            eduValues.push(educationSections.sslc ? (attempt?.month || null) : null);
            eduValues.push(educationSections.sslc ? (attempt?.year || null) : null);
            eduValues.push(educationSections.sslc ? (attempt?.totalMarks || null) : null);
        }

        // ITI - only if selected
        eduValues.push(educationSections.iti ? (data.itiSchoolName || null) : null);
        eduValues.push(educationSections.iti ? (data.itiYearOfPassing || null) : null);

        const itiSubjects = educationSections.iti ? safeJsonParse(data.itiSubjects) : [];
        for (let i = 0; i < 5; i++) {
            const subject = itiSubjects[i];
            eduValues.push(educationSections.iti ? (subject?.subject || null) : null);
            eduValues.push(educationSections.iti ? (subject?.max || null) : null);
            eduValues.push(educationSections.iti ? (subject?.marks || null) : null);
        }

        eduValues.push(educationSections.iti ? (data.itiTotalMax || null) : null);
        eduValues.push(educationSections.iti ? (data.itiTotalMarks || null) : null);
        eduValues.push(educationSections.iti ? (data.itiPercentage || null) : null);

        // ITI Attempts (5 attempts max) - only if ITI selected
        const itiAttempts = educationSections.iti ? safeJsonParse(data.itiExaminationAttempts) : [];
        for (let i = 0; i < 5; i++) {
            const attempt = itiAttempts[i];
            eduValues.push(educationSections.iti ? (attempt?.marksheetNo || null) : null);
            eduValues.push(educationSections.iti ? (attempt?.registerNo || null) : null);
            eduValues.push(educationSections.iti ? (attempt?.month || null) : null);
            eduValues.push(educationSections.iti ? (attempt?.year || null) : null);
            eduValues.push(educationSections.iti ? (attempt?.totalMarks || null) : null);
        }

        // VOC (Vocational) - only if selected
        eduValues.push(educationSections.vocational ? (data.vocationalSchoolName || null) : null);
        eduValues.push(educationSections.vocational ? (data.vocationalYearOfPassing || null) : null);

        const vocSubjects = educationSections.vocational ? safeJsonParse(data.vocationalSubjects) : [];
        for (let i = 0; i < 6; i++) {
            const subject = vocSubjects[i];
            eduValues.push(educationSections.vocational ? (subject?.subject || null) : null);
            eduValues.push(educationSections.vocational ? (subject?.max || null) : null);
            eduValues.push(educationSections.vocational ? (subject?.marks || null) : null);
        }

        eduValues.push(educationSections.vocational ? (data.vocationalTotalMax || null) : null);
        eduValues.push(educationSections.vocational ? (data.vocationalTotalMarks || null) : null);
        eduValues.push(educationSections.vocational ? (data.vocationalPercentage || null) : null);

        // HSC - only if selected
        eduValues.push(educationSections.hsc ? (data.hscSchoolName || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscBoard || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscYearOfPassing || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscRegisterNo || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscExamType || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscMajor || null) : null);

        const hscSubjects = educationSections.hsc ? safeJsonParse(data.hscSubjects) : [];
        for (let i = 0; i < 6; i++) {
            const subject = hscSubjects[i];
            eduValues.push(educationSections.hsc ? (subject?.subject || null) : null);
            eduValues.push(educationSections.hsc ? (subject?.max || null) : null);
            eduValues.push(educationSections.hsc ? (subject?.marks || null) : null);
        }

        eduValues.push(educationSections.hsc ? (data.hscTotalMax || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscTotalMarks || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscPercentage || null) : null);
        eduValues.push(educationSections.hsc ? (data.hscCutoff || null) : null);

        const eduColumns = `Application_No, SSLC, ITI, VOC, HSC,
            SSLC_School_Name, SSLC_Board, SSLC_Year_Of_Passing, SSLC_Register_No, SSLC_Marksheet_No,
            SSLC_Subject1, SSLC_Subject1_Max_Mark, SSLC_Subject1_Obtained_Mark,
            SSLC_Subject2, SSLC_Subject2_Max_Mark, SSLC_Subject2_Obtained_Mark,
            SSLC_Subject3, SSLC_Subject3_Max_Mark, SSLC_Subject3_Obtained_Mark,
            SSLC_Subject4, SSLC_Subject4_Max_Mark, SSLC_Subject4_Obtained_Mark,
            SSLC_Subject5, SSLC_Subject5_Max_Mark, SSLC_Subject5_Obtained_Mark,
            SSLC_Total_Mark, SSLC_Total_Obtained_Mark, SSLC_Percentage,
            SSLC_Att1_Marksheet_No, SSLC_Att1_Register_No, SSLC_Att1_Month, SSLC_Att1_Year, SSLC_Att1_Total_Marks,
            SSLC_Att2_Marksheet_No, SSLC_Att2_Register_No, SSLC_Att2_Month, SSLC_Att2_Year, SSLC_Att2_Total_Marks,
            SSLC_Att3_Marksheet_No, SSLC_Att3_Register_No, SSLC_Att3_Month, SSLC_Att3_Year, SSLC_Att3_Total_Marks,
            SSLC_Att4_Marksheet_No, SSLC_Att4_Register_No, SSLC_Att4_Month, SSLC_Att4_Year, SSLC_Att4_Total_Marks,
            SSLC_Att5_Marksheet_No, SSLC_Att5_Register_No, SSLC_Att5_Month, SSLC_Att5_Year, SSLC_Att5_Total_Marks,
            ITI_Institution_Name, ITI_Year_Of_Passing,
            ITI_Subject1, ITI_Subject1_Max_Mark, ITI_Subject1_Obtained_Mark,
            ITI_Subject2, ITI_Subject2_Max_Mark, ITI_Subject2_Obtained_Mark,
            ITI_Subject3, ITI_Subject3_Max_Mark, ITI_Subject3_Obtained_Mark,
            ITI_Subject4, ITI_Subject4_Max_Mark, ITI_Subject4_Obtained_Mark,
            ITI_Subject5, ITI_Subject5_Max_Mark, ITI_Subject5_Obtained_Mark,
            ITI_Total_Mark, ITI_Total_Obtained_Mark, ITI_Percentage,
            ITI_Att1_Marksheet_No, ITI_Att1_Register_No, ITI_Att1_Month, ITI_Att1_Year, ITI_Att1_Total_Marks,
            ITI_Att2_Marksheet_No, ITI_Att2_Register_No, ITI_Att2_Month, ITI_Att2_Year, ITI_Att2_Total_Marks,
            ITI_Att3_Marksheet_No, ITI_Att3_Register_No, ITI_Att3_Month, ITI_Att3_Year, ITI_Att3_Total_Marks,
            ITI_Att4_Marksheet_No, ITI_Att4_Register_No, ITI_Att4_Month, ITI_Att4_Year, ITI_Att4_Total_Marks,
            ITI_Att5_Marksheet_No, ITI_Att5_Register_No, ITI_Att5_Month, ITI_Att5_Year, ITI_Att5_Total_Marks,
            VOC_Institution_Name, VOC_Year_Of_Passing,
            VOC_Subject1, VOC_Subject1_Max_Mark, VOC_Subject1_Obtained_Mark,
            VOC_Subject2, VOC_Subject2_Max_Mark, VOC_Subject2_Obtained_Mark,
            VOC_Subject3, VOC_Subject3_Max_Mark, VOC_Subject3_Obtained_Mark,
            VOC_Subject4, VOC_Subject4_Max_Mark, VOC_Subject4_Obtained_Mark,
            VOC_Subject5, VOC_Subject5_Max_Mark, VOC_Subject5_Obtained_Mark,
            VOC_Subject6, VOC_Subject6_Max_Mark, VOC_Subject6_Obtained_Mark,
            VOC_Total_Mark, VOC_Total_Obtained_Mark, VOC_Percentage,
            HSC_School_Name, HSC_Board, HSC_Year_Of_Passing, HSC_Register_No, HSC_Exam_Type, HSC_Major_Stream,
            HSC_Subject1, HSC_Subject1_Max_Mark, HSC_Subject1_Obtained_Mark,
            HSC_Subject2, HSC_Subject2_Max_Mark, HSC_Subject2_Obtained_Mark,
            HSC_Subject3, HSC_Subject3_Max_Mark, HSC_Subject3_Obtained_Mark,
            HSC_Subject4, HSC_Subject4_Max_Mark, HSC_Subject4_Obtained_Mark,
            HSC_Subject5, HSC_Subject5_Max_Mark, HSC_Subject5_Obtained_Mark,
            HSC_Subject6, HSC_Subject6_Max_Mark, HSC_Subject6_Obtained_Mark,
            HSC_Total_Mark, HSC_Total_Obtained_Mark, HSC_Percentage, HSC_Cutoff`;

        const eduPlaceholders = eduValues.map(() => '?').join(',');
        const sqlInsertEdu = `INSERT INTO student_education_details (${eduColumns}) VALUES (${eduPlaceholders})`;
        const sanitizedEduValues = eduValues.map(sanitize);

        // Validate column/parameter count match
        const columnCount = eduColumns.split(',').length;
        const parameterCount = sanitizedEduValues.length;
        console.log(`📊 Column count: ${columnCount}, Parameter count: ${parameterCount}`);

        if (columnCount !== parameterCount) {
            throw new Error(`Column count (${columnCount}) does not match parameter count (${parameterCount}) in education details update`);
        }

        console.log('📝 Updating student_education_details for', appNo, 'with', sanitizedEduValues.length, 'parameters');
        const result = await db.query(sqlInsertEdu, sanitizedEduValues);
        console.log('✅ Successfully updated education details for Application_No:', appNo);

        // Validate that insert was successful
        if (!result || (result.affectedRows !== undefined && result.affectedRows === 0)) {
            throw new Error('Education details insert returned no affected rows');
        }

        return result;
    } catch (err) {
        console.error('❌ Error updating education details for Application_No:', appNo);
        console.error('❌ Error details:', err);
        throw new Error(`Failed to update education details: ${err.message}`);
    }
};



// Delete Student
export const deleteStudent = async (req, res) => {
    try {
        const id = req.params.id;
        await db.query('DELETE FROM student_master WHERE Id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete Student Education Details by Application_No
export const deleteStudentEducationByAppNo = async (req, res) => {
    try {
        const { appNo } = req.params;
        await db.query('DELETE FROM student_education_details WHERE Application_No = ?', [appNo]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get All Students
export const getStudents = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM student_master');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get Student by Application Number (with education details)
export const getStudentByAppNo = async (req, res) => {
    try {
        const { appNo } = req.params;
        if (!appNo) {
            return res.status(400).json({ error: 'Application number is required' });
        }

        // Fetch from both tables
        const [studentRows] = await db.query('SELECT * FROM student_master WHERE Application_No = ?', [appNo]);
        const [eduRows] = await db.query('SELECT * FROM student_education_details WHERE Application_No = ?', [appNo]);

        if (studentRows.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Merge data from both tables
        const student = studentRows[0];
        const education = eduRows.length > 0 ? eduRows[0] : null;


        res.json({
            ...student,
            education
        });
    } catch (err) {
        console.error('Error fetching student by App No:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get Student by Register Number
export const getStudentByRegNo = async (req, res) => {
    try {
        const { regNo } = req.params;
        const [rows] = await db.query('SELECT * FROM student_master WHERE Register_Number = ?', [regNo]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        res.json({ success: true, data: rows[0] });
    } catch (err) {
        console.error('Error fetching student by Reg No:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// Get Student Education Details by Application Number
export const getStudentEducationByAppNo = async (req, res) => {
    try {
        const { appNo } = req.params;
        if (!appNo) {
            return res.status(400).json({ error: 'Application number is required' });
        }

        const [rows] = await db.query('SELECT * FROM student_education_details WHERE Application_No = ?', [appNo]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Education details not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching education details:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get Courses, Departments, Semesters, Years
export const getMetaData = async (req, res) => {
    try {
        // Fetch distinct courses from course_details
        const [courses] = await db.query(`
			SELECT DISTINCT Course_Name 
			FROM course_details 
			WHERE Course_Name IS NOT NULL 
			ORDER BY Course_Name
		`);
        const [departments] = await db.query('SELECT * FROM course_details');
        const [semesters] = await db.query('SELECT * FROM semester_master');
        const [district] = await db.query('SELECT id, District, State FROM district_master');
        res.json({ courses, departments, semesters, district });
    } catch (err) {
        // Always return valid JSON, even on error
        res.status(500).json({ courses: [], departments: [], semesters: [], district: [], error: err.message });
    }
};

// Get latest serials for Application_No for a Dept_Code
export const getLatestSerials = async (req, res) => {
    try {
        const { deptCode } = req.query;
        // Latest Application_No
        const [appRows] = await db.query('SELECT Application_No FROM student_master WHERE Dept_Code = ? ORDER BY Id DESC LIMIT 1', [deptCode]);
        let lastAppNoSerial = '0000';
        if (appRows.length && appRows[0].Application_No) {
            lastAppNoSerial = appRows[0].Application_No.slice(-4);
        }
        res.json({ lastAppNoSerial });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get next roll/register numbers for a department
export const getNextIds = async (req, res) => {
    try {
        const { deptCode } = req.query;
        if (!deptCode) return res.status(400).json({ error: 'deptCode required' });

        // Try to find the most recent row for this dept
        const [rows] = await db.query('SELECT Roll_Number, Register_Number FROM student_master WHERE Dept_Code = ? ORDER BY Id DESC LIMIT 1', [deptCode]);
        let lastRoll = rows && rows[0] && rows[0].Roll_Number ? String(rows[0].Roll_Number) : '';
        let lastRegister = rows && rows[0] && rows[0].Register_Number ? String(rows[0].Register_Number) : '';

        // Helper to increment trailing numeric portion
        const nextFrom = (val) => {
            if (!val) return null;
            const m = val.match(/(\d+)$/);
            if (!m) return null;
            const num = parseInt(m[1], 10);
            const prefix = val.slice(0, m.index);
            const nextNum = (num + 1).toString().padStart(m[1].length, '0');
            return `${prefix}${nextNum}`;
        };

        const nextRoll = nextFrom(lastRoll) || null;
        const nextRegister = nextFrom(lastRegister) || null;
        res.json({ nextRoll, nextRegister });
    } catch (err) {
        console.error('Error in getNextIds:', err);
        res.status(500).json({ error: err.message });
    }
};

// Debug helper - Get database schema information
export const debugSchema = async (req, res) => {
    try {
        const [columns] = await db.query(`
			SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
			FROM INFORMATION_SCHEMA.COLUMNS 
			WHERE TABLE_NAME = 'student_master' 
			ORDER BY ORDINAL_POSITION
		`);
        console.log('Database columns:', columns);
        res.json(columns);
    } catch (err) {
        console.error('Schema error:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get Community Master data
export const getCommunityMaster = async (req, res) => {
    try {
        const [communities] = await db.query(`SELECT Community FROM community_master ORDER BY Community ASC`);
        // console.log('Fetched communities:', communities);
        res.json(communities);
    } catch (err) {
        console.error('Error fetching community master:', err);
        // Return empty array on error instead of 500
        console.error('Community Master Query Error Details:', err.message);
        res.status(500).json({ error: err.message, communities: [] });
    }
};

// Serve student image
export const getStudentImage = async (req, res) => {
    try {
        const { filename } = req.params;
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const uploadDir = path.join(__dirname, '../uploads/student');
        const defaultImage = path.join(uploadDir, 'student.png');

        if (filename && filename !== 'null' && filename !== 'undefined' && filename !== 'Image Not Available') {
            const filePath = path.join(uploadDir, filename);
            if (fs.existsSync(filePath)) {
                return res.sendFile(filePath);
            }
        }

        if (fs.existsSync(defaultImage)) {
            return res.sendFile(defaultImage);
        } else {
            return res.status(404).json({ error: 'Default image not found' });
        }
    } catch (err) {
        console.error('Error serving student image:', err);
        res.status(500).json({ error: 'Failed to serve image' });
    }
};
