import db from '../db.js';

// Get seat allocation report for selected date and session
export const getSeatAllocationReport = async (req, res) => {
	try {
		const { examDate, session } = req.query;
		
		// Validate required params
		if (!examDate || !session) {
			return res.status(400).json({ error: 'Missing examDate or session' });
		}

		// Query exam_seat_plan_report table grouped by department, subject and hall
		const query = `
			SELECT 
				dept_code,
				dept_name,
				subject_code,
				subject_name,
				hall_code,
				GROUP_CONCAT(register_number ORDER BY seat_label SEPARATOR ' ') AS register_numbers,
				COUNT(*) AS hall_strength
			FROM exam_seat_plan_report
			WHERE exam_date = ? AND session = ?
			GROUP BY dept_code, dept_name, subject_code, subject_name, hall_code
			ORDER BY dept_code, subject_code, hall_code
		`;
		
		const [results] = await db.query(query, [examDate, session]);

		// Group data by department -> subject for easier display
		const deptData = {};
		results.forEach(row => {
			const deptKey = String(row.dept_code).trim();
			if (!deptData[deptKey]) {
				deptData[deptKey] = {
					dept_code: String(row.dept_code).trim(),
					dept_name: String(row.dept_name).trim(),
					subjects: []
				};
			}
			
			let subject = deptData[deptKey].subjects.find(s => String(s.subject_code).trim() === String(row.subject_code).trim());
			if (!subject) {
				subject = {
					subject_code: String(row.subject_code).trim(),
					subject_name: String(row.subject_name).trim(),
					halls: []
				};
				deptData[deptKey].subjects.push(subject);
			}
			
			subject.halls.push({
				hall_id: String(row.hall_code).trim(),
				hall_name: String(row.hall_code).trim(),
				register_numbers: String(row.register_numbers).trim(),
				hall_strength: parseInt(row.hall_strength) || 0
			});
		});

		const result = Object.values(deptData);
		return res.json(result);
	} catch (err) {
		console.error('Error in getSeatAllocationReport:', err);
		return res.status(500).json({ error: 'Server error', details: err.message });
	}
};

export default {
	getSeatAllocationReport
};
