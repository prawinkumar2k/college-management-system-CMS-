import db from '../db.js';

// Get all courses
export const getAllCourses = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM course_master');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add new course
export const addCourse = async (req, res) => {
  try {
    const { Course_Name } = req.body;
    await db.query('INSERT INTO course_master (Course_Name) VALUES (?)', [Course_Name]);
    res.json({ message: 'Course added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Edit course
export const editCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { Course_Name } = req.body;
    await db.query('UPDATE course_master SET Course_Name=? WHERE id=?', [Course_Name, id]);
    res.json({ message: 'Course updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete course
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM course_master WHERE id=?', [id]);
    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
