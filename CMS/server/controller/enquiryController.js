import db from '../db.js';

// Get all enquiry_call_notes_tenant records
export const getAllEnquiries = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM enquiry_call_notes_tenant');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    res.status(500).json({ error: 'Failed to fetch enquiries' });
  }
};

// Get today's enquiries (server-side filtering)
export const getTodaysEnquiries = async (req, res) => {
  try {
    // Adjust '+05:30' to your local timezone if needed
    const [rows] = await db.query(
      `SELECT * FROM enquiry_call_notes_tenant 
       WHERE DATE(CONVERT_TZ(Created_Date, '+00:00', '+05:30')) = CURDATE()`
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching today\'s enquiries:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s enquiries' });
  }
};
