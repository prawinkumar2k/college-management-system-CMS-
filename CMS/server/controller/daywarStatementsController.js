import db from '../db.js';

// Get daywar statement report for selected date and session
export const getDaywarReport = async (req, res) => {
	try {
		const { examDate, session } = req.query;
		
		// Validate required params
		if (!examDate || !session) {
			return res.status(400).json({ error: 'Missing examDate or session' });
		}

		// Query exam_seat_plan_report table grouped by department and subject
		const query = `
			SELECT 
				dept_code,
				dept_name,
				subject_code,
				subject_name,
				GROUP_CONCAT(CONCAT(register_number, '|', COALESCE(student_name, '')) ORDER BY register_number SEPARATOR '||') AS student_data,
				COUNT(*) AS total_strength
			FROM exam_seat_plan_report
			WHERE exam_date = ? AND session = ?
			GROUP BY dept_code, dept_name, subject_code, subject_name
			ORDER BY dept_code, subject_code
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
			
			// Parse student data string (register_number|student_name)
			const studentDataStr = String(row.student_data).trim();
			const students = studentDataStr.split('||').map(data => {
				const [regNum, studentName] = data.split('|');
				return {
					register_number: String(regNum).trim(),
					student_name: String(studentName).trim()
				};
			});
			
			deptData[deptKey].subjects.push({
				subject_code: String(row.subject_code).trim(),
				subject_name: String(row.subject_name).trim(),
				students: students,
				total_strength: parseInt(row.total_strength) || 0
			});
		});

		const result = Object.values(deptData);
		return res.json(result);
	} catch (err) {
		console.error('Error in getDaywarReport:', err);
		return res.status(500).json({ error: 'Server error', details: err.message });
	}
};

export default {
	getDaywarReport
};
