import db from '../db.js';

// Get all communities
export const getAllCommunities = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM community_master ORDER BY Community');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching communities:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all districts
export const getAllDistricts = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM district_master ORDER BY District');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching districts:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};


// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM category_master ORDER BY category_name');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Add new category
export const addCategory = async (req, res) => {
  try {
    const { category_name } = req.body;
    
    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    // Check if category already exists
    const [existing] = await db.query('SELECT category_id FROM category_master WHERE category_name = ?', [category_name.trim()]);
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    // Insert new category
    const [result] = await db.query('INSERT INTO category_master (category_name) VALUES (?)', [category_name.trim()]);
    
    res.json({ 
      success: true, 
      message: 'Category added successfully',
      data: { category_id: result.insertId, category_name: category_name.trim() }
    });
  } catch (err) {
    console.error('Error adding category:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all sources
export const getAllSources = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, source FROM source_master ORDER BY source');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching sources:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all course details (departments)
export const getAllCourseDetails = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Dept_Code, Dept_Name FROM course_details ORDER BY Dept_Name');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching course details:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};