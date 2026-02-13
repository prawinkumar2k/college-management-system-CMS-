import db from '../db.js';

export const getStudentProfile = async (req, res) => {
    try {
        const registerNumber = req.user.username; // From verifyToken middleware

        const [rows] = await db.query(
            `SELECT * FROM student_master WHERE Register_Number = ?`,
            [registerNumber]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Student profile not found' });
        }

        const student = rows[0];

        // Return raw date string formatted as YYYY-MM-DD for consistency and date inputs
        if (student.Dob) {
            const date = new Date(student.Dob);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            student.Dob = `${year}-${month}-${day}`;
        }

        res.json({
            success: true,
            profile: student
        });
    } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

export const updateStudentProfile = async (req, res) => {
    try {
        const registerNumber = req.user.username;
        const updateData = req.body;

        // List of fields allowed to be updated by the student
        const allowedFields = [
            // Personal Information
            'Student_Name', 'Dob', 'Gender', 'Blood_Group', 'Nationality', 'Religion', 'Community', 'Caste', 'Aadhaar_No',
            // Contact Information
            'Std_Email', 'Student_Mobile', 'Permanent_Address', 'Current_Address',
            // Guardian & Family
            'Father_Name', 'Father_Mobile', 'Mother_Name', 'Mother_Mobile', 'Guardian_Name', 'Guardian_Relation'
        ];

        const updates = {};
        Object.keys(updateData).forEach(key => {
            if (allowedFields.includes(key)) {
                updates[key] = updateData[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'No valid fields provided for update' });
        }

        const query = `UPDATE student_master SET ? WHERE Register_Number = ?`;
        const [result] = await db.query(query, [updates, registerNumber]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Student record not found' });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating student profile:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
