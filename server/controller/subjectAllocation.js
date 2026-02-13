import db from '../db.js';

// Helper: build mapped allocation using canonical DB column names
const toCamel = (s = '') => s.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase()).replace(/^([A-Z])/, m => m.toLowerCase());
const buildMappedAlloc = (alloc, columns, intFields = []) => {
	const mapped = {};
	columns.forEach(col => {
		// accept either snake_case (col) or camelCase variant
		const camel = toCamel(col);
		let val = undefined;
		if (Object.prototype.hasOwnProperty.call(alloc, col)) val = alloc[col];
		else if (Object.prototype.hasOwnProperty.call(alloc, camel)) val = alloc[camel];
		// if value is still undefined, skip including this column
		if (typeof val === 'undefined') return;
		if (intFields.includes(col)) {
			val = val === '' ? null : (val === null ? null : Number(val));
		}
		mapped[col] = val;
	});
	return mapped;
};

// Get all allocations
export const getAllocations = async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM subject_allocation');
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Create allocation
export const createAllocation = async (req, res) => {
	try {
		const alloc = req.body;
		// canonical DB columns we accept for insert
		const columns = [
			'Staff_Id','Staff_Name','Academic_Year','Sem_Type','Course_Name',
			'Dept_Name','Dept_Code','Semester','Regulation',
			'Sub1_Name','Sub1_Code','Sub1_Dept_Code','Sub1_Dept_Name','Sub1_Semester','Sub1_Regulation',
			'Sub2_Name','Sub2_Code','Sub2_Dept_Code','Sub2_Dept_Name','Sub2_Semester','Sub2_Regulation',
			'Sub3_Name','Sub3_Code','Sub3_Dept_Code','Sub3_Dept_Name','Sub3_Semester','Sub3_Regulation',
			'Sub4_Name','Sub4_Code','Sub4_Dept_Code','Sub4_Dept_Name','Sub4_Semester','Sub4_Regulation',
			'Sub5_Name','Sub5_Code','Sub5_Dept_Code','Sub5_Dept_Name','Sub5_Semester','Sub5_Regulation',
			'Sub6_Name','Sub6_Code','Sub6_Dept_Code','Sub6_Dept_Name','Sub6_Semester','Sub6_Regulation',
			'Sub7_Name','Sub7_Code','Sub7_Dept_Code','Sub7_Dept_Name','Sub7_Semester','Sub7_Regulation'
		];
		const intFields = ['Semester','Sub1_Semester','Sub1_Semester','Sub2_Semester','Sub3_Semester','Sub4_Semester','Sub5_Semester','Sub6_Semester','Sub7_Semester'];
		const mappedAlloc = buildMappedAlloc(alloc, columns, intFields);
		const fields = Object.keys(mappedAlloc);
		if (fields.length === 0) return res.status(400).json({ error: 'No valid fields provided' });
		const placeholders = fields.map(() => '?').join(',');
		const sql = `INSERT INTO subject_allocation (${fields.join(',')}) VALUES (${placeholders})`;
		const values = fields.map(f => mappedAlloc[f]);
		await db.query(sql, values);
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Update allocation
export const updateAllocation = async (req, res) => {
	try {
		const id = req.params.id;
		const alloc = req.body;
		const columns = [
			'Staff_Id','Staff_Name','Academic_Year','Sem_Type','Course_Name',
			'Dept_Name','Dept_Code','Semester','Regulation',
			'Sub1_Name','Sub1_Code','Sub1_Dept_Code','Sub1_Dept_Name','Sub1_Semester','Sub1_Regulation',
			'Sub2_Name','Sub2_Code','Sub2_Dept_Code','Sub2_Dept_Name','Sub2_Semester','Sub2_Regulation',
			'Sub3_Name','Sub3_Code','Sub3_Dept_Code','Sub3_Dept_Name','Sub3_Semester','Sub3_Regulation',
			'Sub4_Name','Sub4_Code','Sub4_Dept_Code','Sub4_Dept_Name','Sub4_Semester','Sub4_Regulation',
			'Sub5_Name','Sub5_Code','Sub5_Dept_Code','Sub5_Dept_Name','Sub5_Semester','Sub5_Regulation',
			'Sub6_Name','Sub6_Code','Sub6_Dept_Code','Sub6_Dept_Name','Sub6_Semester','Sub6_Regulation',
			'Sub7_Name','Sub7_Code','Sub7_Dept_Code','Sub7_Dept_Name','Sub7_Semester','Sub7_Regulation'
		];
		const intFields = ['Sub1_Semester','Sub2_Semester','Sub3_Semester','Sub4_Semester','Sub5_Semester','Sub6_Semester','Sub7_Semester','Semester'];
		const mappedAlloc = buildMappedAlloc(alloc, columns, intFields);
		const keys = Object.keys(mappedAlloc);
		if (keys.length === 0) return res.status(400).json({ error: 'No valid fields provided for update' });
		const updates = keys.map(k => `${k}=?`).join(',');
		const values = [...keys.map(k => mappedAlloc[k]), id];
		const sql = `UPDATE subject_allocation SET ${updates} WHERE Id=?`;
		await db.query(sql, values);
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Delete allocation
export const deleteAllocation = async (req, res) => {
	try {
		const id = req.params.id;
		await db.query('DELETE FROM subject_allocation WHERE Id=?', [id]);
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Masters: staff list
export const getStaffs = async (req, res) => {
	try {
		const [rows] = await db.query('SELECT Staff_ID, Staff_Name FROM staff_master');
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Masters: academic year
export const getAcademicYears = async (req, res) => {
	try {
		const [rows] = await db.query('SELECT Academic_Year FROM academic_year_master ORDER BY Academic_Year DESC');
		res.json(rows.map(r => r.Academic_Year));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Masters: courses (from course_master table)
export const getCourses = async (req, res) => {
	try {
		const [rows] = await db.query('SELECT Course_Name FROM course_master ORDER BY Course_Name');
		res.json(rows.map(r => r.Course_Name));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Masters: departments (from course_details table, filtered by course name)
export const getDepartments = async (req, res) => {
	try {
		const { course_name } = req.query;
		let sql = 'SELECT DISTINCT Dept_Code, Dept_Name FROM course_details WHERE 1=1';
		const params = [];
		if (course_name) {
			sql += ' AND Course_Name = ?';
			params.push(course_name);
		}
		sql += ' ORDER BY Dept_Name';
		const [rows] = await db.query(sql, params);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Masters: semesters
export const getSemesters = async (req, res) => {
	try {
		const [rows] = await db.query('SELECT Semester FROM semester_master');
		res.json(rows.map(r => r.Semester));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Masters: regulation
export const getRegulations = async (req, res) => {
	try {
		const [rows] = await db.query('SELECT Regulation FROM regulation_master');
		res.json(rows.map(r => r.Regulation));
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};

// Subjects filtered by Dept_Code, Semester, Regulation
export const getSubjectsFiltered = async (req, res) => {
	try {
		const { dept_code, semester, regulation } = req.query;
		let sql = 'SELECT Sub_Name, Sub_Code FROM subject_master WHERE 1=1';
		const params = [];
		if (dept_code) { sql += ' AND Dept_Code = ?'; params.push(dept_code); }
		if (semester) { sql += ' AND Semester = ?'; params.push(semester); }
		if (regulation) { sql += ' AND Regulation = ?'; params.push(regulation); }
		const [rows] = await db.query(sql, params);
		res.json(rows);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
};
