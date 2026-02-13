import db from '../db.js';

export const getStudentAttendance = async (req, res) => {
    try {
        const registerNumber = req.user.staff_id;

        if (!registerNumber) {
            return res.status(400).json({ error: 'Student registration number not found in token' });
        }

        // 1. Fetch overall attendance records (for stats and logs)
        const [rows] = await db.query(
            `SELECT * FROM student_attendance_view 
             WHERE register_number = ? 
             ORDER BY date DESC`,
            [registerNumber]
        );

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const calculateStats = (records) => {
            let totalPeriodAttendanceTakenCount = 0;
            let totalPresent = 0;
            let totalAbsent = 0;
            const periodCols = ['1', '2', '3', '4', '5', '6'];

            records.forEach(row => {
                periodCols.forEach(col => {
                    const status = row[col];
                    if (status && status.trim() !== '') {
                        totalPeriodAttendanceTakenCount++;
                        if (status === 'Pr' || status === 'OD') {
                            totalPresent++;
                        } else if (status === 'Ab' || status === 'ML') {
                            totalAbsent++;
                        }
                    }
                });
            });

            const averagePercentage = totalPeriodAttendanceTakenCount > 0
                ? parseFloat(((totalPresent / totalPeriodAttendanceTakenCount) * 100).toFixed(1))
                : 0;

            return {
                totalPeriodAttendanceTakenCount,
                totalPresent,
                totalAbsent,
                averagePercentage
            };
        };

        // All-time stats
        const overallStats = calculateStats(rows);

        // Previous month initialization for trends
        const lastMonthDate = new Date(currentYear, currentMonth, 1);
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastYear = lastMonthDate.getFullYear();

        // Current Month records
        const currentMonthRecords = rows.filter(row => {
            const d = new Date(row.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const currentMonthStats = calculateStats(currentMonthRecords);

        // Previous Month records
        const lastMonthRecords = rows.filter(row => {
            const d = new Date(row.date);
            return d.getMonth() === lastMonth && d.getFullYear() === lastYear;
        });
        const lastMonthStats = calculateStats(lastMonthRecords);

        // Calculate trends
        const calculateTrendValue = (current, last) => {
            if (last === 0) return current > 0 ? 100 : 0;
            return parseFloat((((current - last) / last) * 100).toFixed(1));
        };

        const trends = {
            totalPeriodAttendanceTakenCount: calculateTrendValue(currentMonthStats.totalPeriodAttendanceTakenCount, lastMonthStats.totalPeriodAttendanceTakenCount),
            totalPresent: calculateTrendValue(currentMonthStats.totalPresent, lastMonthStats.totalPresent),
            totalAbsent: calculateTrendValue(currentMonthStats.totalAbsent, lastMonthStats.totalAbsent),
            averagePercentage: calculateTrendValue(currentMonthStats.averagePercentage, lastMonthStats.averagePercentage)
        };

        // 2. 5-Month Trend Calculation
        const monthlyTrend = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 4; i >= 0; i--) {
            const targetDate = new Date(currentYear, currentMonth, 1);
            targetDate.setMonth(targetDate.getMonth() - i);
            const m = targetDate.getMonth();
            const y = targetDate.getFullYear();

            const monthRecords = rows.filter(row => {
                const rd = new Date(row.date);
                return rd.getMonth() === m && rd.getFullYear() === y;
            });

            const monthStats = calculateStats(monthRecords);
            monthlyTrend.push({
                month: monthNames[m],
                percentage: monthStats.averagePercentage
            });
        }

        // 3. Subject-wise stats calculation (Current Month)
        // Querying student_attendance_entry joined with subject_master
        const [subjectRows] = await db.query(
            `SELECT 
                COALESCE(sm.Sub_Name, sae.Subject_Code) as subject,
                sae.Subject_Code,
                COUNT(*) as total,
                SUM(CASE WHEN sae.Att_Status IN ('present', 'Pr', 'OD') THEN 1 ELSE 0 END) as present
             FROM student_attendance_entry sae
             LEFT JOIN subject_master sm ON sae.Subject_Code = sm.Sub_Code
             WHERE sae.Register_Number = ? 
             AND MONTH(sae.Att_Date) = ? 
             AND YEAR(sae.Att_Date) = ?
             GROUP BY sae.Subject_Code, sm.Sub_Name`,
            [registerNumber, currentMonth + 1, currentYear]
        );

        const subjectWiseStats = subjectRows.map(row => ({
            name: row.subject,
            value: row.total > 0 ? parseFloat(((row.present / row.total) * 100).toFixed(1)) : 0,
            present: row.present,
            total: row.total
        }));

        res.json({
            success: true,
            stats: overallStats,
            trends: trends,
            monthlyTrend: monthlyTrend,
            subjectWiseStats: subjectWiseStats,
            attendanceRecords: rows
        });

    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance records' });
    }
};
