import db from '../db.js';

// Get theory name list report for selected date and session
export const getTheoryNameListReport = async (req, res) => {
	try {
		const { examDate, session } = req.query;
		
		// Validate required params
		if (!examDate || !session) {
			return res.status(400).json({ error: 'Missing examDate or session' });
		}

		// Query exam_seat_plan_report table grouped by hall and subject
		const query = `
			SELECT 
				dept_code,
				dept_name,
				subject_code,
				subject_name,
				hall_code,
        hall_name,
				GROUP_CONCAT(CONCAT(register_number, '|', COALESCE(student_name, '')) ORDER BY register_number SEPARATOR '||') AS student_data,
				COUNT(*) AS total_strength
			FROM exam_seat_plan_report
			WHERE exam_date = ? AND session = ?
			GROUP BY dept_code, dept_name, subject_code, subject_name, hall_code, hall_name
			ORDER BY dept_code, subject_code, hall_code
		`;
		
		const [results] = await db.query(query, [examDate, session]);

		// Group data by department -> subject -> hall for easier display
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
			
			// Parse student data string (register_number|student_name)
			const studentDataStr = String(row.student_data).trim();
			const students = studentDataStr.split('||').map((data, idx) => {
				const [regNum, studentName] = data.split('|');
				return {
					sno: idx + 1,
					register_number: String(regNum).trim(),
					student_name: String(studentName).trim()
				};
			});
			
			subject.halls.push({
				hall_code: String(row.hall_code).trim(),
				hall_name: String(row.hall_name).trim(),
				students: students,
				total_strength: parseInt(row.total_strength) || 0
			});
		});

		const result = Object.values(deptData);
		return res.json(result);
	} catch (err) {
		console.error('Error in getTheoryNameListReport:', err);
		return res.status(500).json({ error: 'Server error', details: err.message });
	}
};

export default {
	getTheoryNameListReport
};
