import db from '../db.js';

// Get all enquiry_call_notes_tenant records for report
export const getEnquiryReportData = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM enquiry_call_notes_tenant');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching enquiry report data:', error);
        res.status(500).json({ error: 'Failed to fetch enquiry report data' });
    }
};
