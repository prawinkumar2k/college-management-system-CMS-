import db from '../db.js';

// Get staff attendance
export const getStaffAttendance = async (req, res) => {
    try {
        const { date, staffId, department } = req.query;

        let query = `
            SELECT sa.*, sm.Staff_Name, sm.Dept_Name, sm.Designation
            FROM hr_staff_attendance sa
            LEFT JOIN staff_master sm ON sa.staff_id = sm.Staff_ID
            WHERE 1=1
        `;
        const params = [];

        if (date) {
            query += ' AND sa.attendance_date = ?';
            params.push(date);
        }

        if (staffId) {
            query += ' AND sa.staff_id = ?';
            params.push(staffId);
        }

        if (department) {
            query += ' AND sm.Dept_Name = ?';
            params.push(department);
        }

        query += ' ORDER BY sa.attendance_date DESC, sm.Staff_Name';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching staff attendance:', error);
        res.status(500).json({ error: 'Failed to fetch staff attendance' });
    }
};

// Mark staff attendance
export const markStaffAttendance = async (req, res) => {
    try {
        const attendanceRecords = req.body;

        if (!Array.isArray(attendanceRecords)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }

        const values = attendanceRecords.map(record => [
            record.staff_id,
            record.attendance_date,
            record.status,
            record.check_in_time,
            record.check_out_time,
            record.working_hours,
            record.remarks
        ]);

        const query = `
            INSERT INTO hr_staff_attendance 
            (staff_id, attendance_date, status, check_in_time, check_out_time, working_hours, remarks)
            VALUES ?
            ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                check_in_time = VALUES(check_in_time),
                check_out_time = VALUES(check_out_time),
                working_hours = VALUES(working_hours),
                remarks = VALUES(remarks)
        `;

        await db.query(query, [values]);
        res.status(201).json({ message: 'Attendance marked successfully' });
    } catch (error) {
        console.error('Error marking attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
};

// Update staff attendance
export const updateStaffAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const fields = Object.keys(updates)
            .map(key => `${key} = ?`)
            .join(', ');
        const values = [...Object.values(updates), id];

        const query = `UPDATE hr_staff_attendance SET ${fields} WHERE id = ?`;
        await db.query(query, values);

        res.json({ message: 'Attendance updated successfully' });
    } catch (error) {
        console.error('Error updating attendance:', error);
        res.status(500).json({ error: 'Failed to update attendance' });
    }
};

// Get attendance report
export const getAttendanceReport = async (req, res) => {
    try {
        const { fromDate, toDate, staffId, department } = req.query;

        let query = `
            SELECT 
                sm.Staff_ID,
                sm.Staff_Name,
                sm.Dept_Name,
                sm.Designation,
                COUNT(CASE WHEN sa.status = 'present' THEN 1 END) as present_days,
                COUNT(CASE WHEN sa.status = 'absent' THEN 1 END) as absent_days,
                COUNT(CASE WHEN sa.status = 'half_day' THEN 1 END) as half_days,
                COUNT(CASE WHEN sa.status = 'on_leave' THEN 1 END) as leave_days,
                SUM(sa.working_hours) as total_hours
            FROM staff_master sm
            LEFT JOIN hr_staff_attendance sa ON sm.Staff_ID = sa.staff_id
            WHERE 1=1
        `;
        const params = [];

        if (fromDate && toDate) {
            query += ' AND sa.attendance_date BETWEEN ? AND ?';
            params.push(fromDate, toDate);
        }

        if (staffId) {
            query += ' AND sm.Staff_ID = ?';
            params.push(staffId);
        }

        if (department) {
            query += ' AND sm.Dept_Name = ?';
            params.push(department);
        }

        query += ' GROUP BY sm.Staff_ID ORDER BY sm.Staff_Name';

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching attendance report:', error);
        res.status(500).json({ error: 'Failed to fetch attendance report' });
    }
};

// Get attendance summary
export const getAttendanceSummary = async (req, res) => {
    try {
        const { date } = req.query;
        const attendanceDate = date || new Date().toISOString().split('T')[0];

        const query = `
            SELECT 
                COUNT(DISTINCT sm.Staff_ID) as total_staff,
                COUNT(CASE WHEN sa.status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN sa.status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN sa.status = 'half_day' THEN 1 END) as half_day,
                COUNT(CASE WHEN sa.status = 'on_leave' THEN 1 END) as on_leave
            FROM staff_master sm
            LEFT JOIN hr_staff_attendance sa ON sm.Staff_ID = sa.staff_id AND sa.attendance_date = ?
            WHERE sm.Reliving_Date IS NULL OR sm.Reliving_Date = ''
        `;

        const [rows] = await db.query(query, [attendanceDate]);
        res.json(rows[0] || {});
    } catch (error) {
        console.error('Error fetching attendance summary:', error);
        res.status(500).json({ error: 'Failed to fetch attendance summary' });
    }
};
