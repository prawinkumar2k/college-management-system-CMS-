import pool from '../db.js';

// =======================
// Get All Letters
// =======================
export const getAllLetters = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM send_letters ORDER BY id DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching letters:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// =======================
// Add New Letter
// =======================
export const addLetter = async (req, res) => {
  try {
    const {
      date,
      to,
      message,
      address,
      typeOfPost,
      cost,
      trackingNumber = null,   // optional
      status = "Sent"           // default
    } = req.body;

    // Validation
    if (!date || !to || !message || !address || !typeOfPost || !cost) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    const sql = `
      INSERT INTO send_letters
      (date, recipient, message, address, type_of_post, cost, tracking_number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      date,
      to,
      message,
      address,
      typeOfPost,
      cost,
      trackingNumber,
      status
    ];

    const [result] = await pool.query(sql, params);

    return res.json({
      success: true,
      id: result.insertId,
      message: "Letter saved successfully"
    });

  } catch (err) {
    console.error("Error adding letter:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
