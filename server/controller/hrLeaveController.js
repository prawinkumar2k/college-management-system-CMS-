import db from '../db.js';

// Get all leave requests
export const getLeaveApplications = async (req, res) => {
    try {
        const { staffId, status, fromDate, toDate } = req.query;

        let query = `
            SELECT lr.*, sm.Staff_Name, sm.Dept_Name, sm.Designation
            FROM hr_leave_requests lr
            LEFT JOIN staff_master sm ON lr.staff_id = sm.Staff_ID
            WHERE 1=1
        `;
        const params = [];

        if (staffId) {
            query += ' AND lr.staff_id = ?';
            params.push(staffId);
        }

        if (status) {
            query += ' AND lr.status = ?';
            params.push(status);
        }

        if (fromDate && toDate) {
            query += ' AND lr.start_date BETWEEN ? AND ?';
            params.push(fromDate, toDate);
        }

        query += ' ORDER BY lr.created_at DESC';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
};

// Get leave types
export const getLeaveTypes = async (req, res) => {
    try {
        // Try to fetch from DB (using leave_configuration as per schema)
        const [rows] = await db.query(`
            SELECT 
                Config_ID as id, 
                Leave_Code as leave_code, 
                Leave_Type as leave_name, 
                Annual_Quota as max_days_per_year 
            FROM leave_configuration
        `);

        if (rows.length > 0) {
            res.json(rows);
        } else {
            // Fallback if table empty
            res.json([
                { id: 1, leave_code: 'CL', leave_name: 'Casual Leave', max_days_per_year: 12 },
                { id: 2, leave_code: 'SL', leave_name: 'Sick Leave', max_days_per_year: 10 },
                { id: 3, leave_code: 'EL', leave_name: 'Earned Leave', max_days_per_year: 15 },
                { id: 4, leave_code: 'LOP', leave_name: 'Loss of Pay', max_days_per_year: 365 },
            ]);
        }
    } catch (error) {
        console.warn('Error fetching leave types from leave_configuration, trying hr_leave_types fallback:', error.message);

        try {
            // Try alternate table name
            const [rows] = await db.query('SELECT * FROM hr_leave_types');
            if (rows.length > 0) { res.json(rows); return; }
        } catch (e) {
            // Ignore
        }

        // Final Fallback static list
        res.json([
            { id: 1, leave_code: 'CL', leave_name: 'Casual Leave', max_days_per_year: 12 },
            { id: 2, leave_code: 'SL', leave_name: 'Sick Leave', max_days_per_year: 10 },
            { id: 3, leave_code: 'EL', leave_name: 'Earned Leave', max_days_per_year: 15 },
            { id: 4, leave_code: 'LOP', leave_name: 'Loss of Pay', max_days_per_year: 365 },
        ]);
    }
};

// Create new leave request
export const createLeaveApplication = async (req, res) => {
    try {
        const {
            staff_id,
            leave_type_id,
            start_date,
            end_date,
            days_count,
            reason,
            contact_during_leave
        } = req.body;

        // Map frontend fields (from_date/to_date) to backend fields (start_date/end_date)
        const finalStartDate = start_date || req.body.from_date;
        const finalEndDate = end_date || req.body.to_date;
        const finalDaysCount = days_count || req.body.total_days;

        const query = `
            INSERT INTO hr_leave_requests 
            (staff_id, leave_type_id, start_date, end_date, days_count, reason, contact_during_leave, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        const [result] = await db.query(query, [
            staff_id,
            leave_type_id,
            finalStartDate,
            finalEndDate,
            finalDaysCount,
            reason,
            contact_during_leave
        ]);

        res.status(201).json({
            message: 'Leave request submitted successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error creating leave request:', error);
        res.status(500).json({ error: 'Failed to create leave request' });
    }
};

// Update leave request
export const updateLeaveApplication = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fields = Object.keys(updates)
            .map(key => `${key} = ?`)
            .join(', ');
        const values = [...Object.values(updates), id];

        const query = `UPDATE hr_leave_requests SET ${fields} WHERE id = ?`;
        await db.query(query, values);

        res.json({ message: 'Leave request updated successfully' });
    } catch (error) {
        console.error('Error updating leave request:', error);
        res.status(500).json({ error: 'Failed to update leave request' });
    }
};

// Delete leave request
export const deleteLeaveApplication = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM hr_leave_requests WHERE id = ?', [id]);
        res.json({ message: 'Leave request deleted successfully' });
    } catch (error) {
        console.error('Error deleting leave request:', error);
        res.status(500).json({ error: 'Failed to delete leave request' });
    }
};

// Approve leave
export const approveLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { approved_by, remarks } = req.body;

        const query = `
            UPDATE hr_leave_requests 
            SET status = 'approved', 
                approved_by = ?, 
                approved_at = NOW(),
                remarks = ?
            WHERE id = ?
        `;

        await db.query(query, [approved_by, remarks, id]);
        res.json({ message: 'Leave approved successfully' });
    } catch (error) {
        console.error('Error approving leave:', error);
        res.status(500).json({ error: 'Failed to approve leave' });
    }
};

// Reject leave
export const rejectLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejected_by, remarks } = req.body;

        const query = `
            UPDATE hr_leave_requests 
            SET status = 'rejected', 
                rejected_by = ?, 
                rejected_at = NOW(),
                remarks = ?
            WHERE id = ?
        `;

        await db.query(query, [rejected_by, remarks, id]);
        res.json({ message: 'Leave rejected successfully' });
    } catch (error) {
        console.error('Error rejecting leave:', error);
        res.status(500).json({ error: 'Failed to reject leave' });
    }
};
