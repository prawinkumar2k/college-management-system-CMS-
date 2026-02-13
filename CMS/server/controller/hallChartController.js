import db from '../db.js';

// Get distinct exam dates from exam_seat_plan_report
export const getExamDates = async (req, res) => {
	try {
		const query = `
			SELECT DISTINCT exam_date 
			FROM exam_seat_plan_report 
			WHERE exam_date IS NOT NULL 
			ORDER BY exam_date DESC
		`;
		const [results] = await db.query(query);
		const dates = results.map(r => r.exam_date).filter(Boolean);
		return res.json(dates);
	} catch (err) {
		console.error('Error in getExamDates:', err);
		return res.status(500).json({ error: 'Server error', details: err.message });
	}
};

// Get hall chart data for selected date and session
export const getSeatAssignments = async (req, res) => {
	try {
		const { examDate, session } = req.query;
		
		// Validate required params
		if (!examDate || !session) {
			return res.status(400).json({ error: 'Missing examDate or session' });
		}

		// Query exam_seat_plan_report table
		const query = `
			SELECT 
				exam_date,
				day_order,
				session,
				hall_code,
				seat_label,
				register_number,
				subject_code,
				subject_name,
				dept_code,
				dept_name,
				dept_short,
				semester,
				col_letter
			FROM exam_seat_plan_report
			WHERE exam_date = ? AND session = ?
			ORDER BY hall_code, seat_label ASC
		`;
		
		const [results] = await db.query(query, [examDate, session]);

		// Group data by hall for easier display
		const hallData = {};
		results.forEach(row => {
			if (!hallData[row.hall_code]) {
				hallData[row.hall_code] = {
					hall_code: String(row.hall_code),
					exam_date: row.exam_date,
					day_order: row.day_order,
					session: String(row.session),
					students: []
				};
			}
			
			// Extract column letter and seat number from seat_label (e.g., "A1" -> col="A", num=1)
			const seatLabelStr = String(row.seat_label).trim();
			const colMatch = seatLabelStr.match(/^([A-Z]+)/);
			const numMatch = seatLabelStr.match(/(\d+)$/);
			const seatCol = colMatch ? colMatch[1] : (String(row.col_letter).trim() || 'A');
			const seatNum = numMatch ? parseInt(numMatch[1]) : 0;
			
			hallData[row.hall_code].students.push({
			    seat_column: seatCol,
				seat_label: seatNum,
				seat_label_full: seatLabelStr,
				register_number: String(row.register_number).trim(),
				subject_code: String(row.subject_code).trim(),
				subject_name: String(row.subject_name).trim(),
				dept_code: String(row.dept_code).trim(),
				dept_name: String(row.dept_name).trim(),
				dept_short: String(row.dept_short).trim(),
				semester: parseInt(row.semester) || 0
			});
		});

		return res.json(Object.values(hallData));
	} catch (err) {
		console.error('Error in getSeatAssignments:', err);
		return res.status(500).json({ error: 'Server error', details: err.message });
	}
};
