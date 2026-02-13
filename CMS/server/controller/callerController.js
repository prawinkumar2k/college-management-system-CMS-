import db from '../db.js';

// Get all caller details from total_caller_count
export const getAllCallers = async (req, res) => {
	try {
		const [rows] = await db.query('SELECT * FROM total_caller_count');
		res.json(rows);
	} catch (error) {
		console.error('Error fetching caller details:', error);
		res.status(500).json({ error: 'Failed to fetch caller details' });
	}
};
