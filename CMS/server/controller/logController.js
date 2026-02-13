import db from '../db.js';

/**
 * Get all activity logs with pagination
 */
export const getAllLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Get total count
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM log_details');
    const total = countResult[0].total;
    
    // Get paginated logs
    const [logs] = await db.query(
      `SELECT id, username, role, login_date, action, CreatedAt, UpdatedAt 
       FROM log_details 
       ORDER BY CreatedAt DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

/**
 * Get logs for a specific user
 */
export const getUserLogs = async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    
    // Get total count for user
    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM log_details WHERE username = ?',
      [username]
    );
    const total = countResult[0].total;
    
    // Get paginated logs for user
    const [logs] = await db.query(
      `SELECT id, username, role, login_date, action, CreatedAt, UpdatedAt 
       FROM log_details 
       WHERE username = ?
       ORDER BY CreatedAt DESC 
       LIMIT ? OFFSET ?`,
      [username, limit, offset]
    );
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user logs:', error);
    res.status(500).json({ error: 'Failed to fetch user logs' });
  }
};

/**
 * Get logs by date range
 */
export const getLogsByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const [logs] = await db.query(
      `SELECT id, username, role, login_date, action, CreatedAt, UpdatedAt 
       FROM log_details 
       WHERE login_date BETWEEN ? AND ?
       ORDER BY CreatedAt DESC`,
      [startDate, endDate]
    );
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching logs by date range:', error);
    res.status(500).json({ error: 'Failed to fetch logs by date range' });
  }
};

/**
 * Get recent login activities
 */
export const getRecentLogins = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const [logs] = await db.query(
      `SELECT id, username, role, login_date, action, CreatedAt 
       FROM log_details 
       WHERE action = 'Logged in'
       ORDER BY CreatedAt DESC 
       LIMIT ?`,
      [limit]
    );
    
    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching recent logins:', error);
    res.status(500).json({ error: 'Failed to fetch recent logins' });
  }
};

/**
 * Delete old logs (cleanup)
 */
export const deleteOldLogs = async (req, res) => {
  try {
    const { daysOld } = req.query;
    
    if (!daysOld || isNaN(daysOld)) {
      return res.status(400).json({ error: 'Please provide valid number of days' });
    }
    
    const [result] = await db.query(
      `DELETE FROM log_details 
       WHERE CreatedAt < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [parseInt(daysOld)]
    );
    
    res.json({
      success: true,
      message: `Deleted ${result.affectedRows} old log entries`,
      deletedCount: result.affectedRows
    });
  } catch (error) {
    console.error('Error deleting old logs:', error);
    res.status(500).json({ error: 'Failed to delete old logs' });
  }
};

export default {
  getAllLogs,
  getUserLogs,
  getLogsByDateRange,
  getRecentLogins,
  deleteOldLogs
};
