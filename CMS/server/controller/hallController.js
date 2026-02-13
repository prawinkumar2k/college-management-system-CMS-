import db from "../db.js";

/**
 * GET ALL HALLS
 * GET /hall
 */
export const getAllHalls = async (req, res) => {
  try {
    // Try to fetch with all columns first
    let rows;
    try {
      [rows] = await db.query(
        `SELECT 
          id,
          Hall_Code,
          Hall_Name,
          Total_Rows,
          Total_Columns,
          Seating_Capacity,
          Hall_Type,
          Floor_Number,
          Block_Name,
          Location_Note,
          Facilities,
          Preference,
          Status,
          CreatedAt,
          UpdatedAt
        FROM hall_master
        ORDER BY id ASC`
      );
    } catch (err) {
      // If columns don't exist, use basic query
      if (err.message && err.message.includes("Unknown column")) {
        console.warn("⚠️  Missing columns in hall_master, using fallback query");
        [rows] = await db.query(
          `SELECT 
            id,
            Hall_Name,
            Total_Rows,
            Total_Columns,
            Seating_Capacity,
            Hall_Type,
            Floor_Number,
            Block_Name,
            Preference,
            Status,
            CreatedAt,
            UpdatedAt
          FROM hall_master
          ORDER BY id ASC`
        );
      } else {
        throw err;
      }
    }

    res.json(rows);
  } catch (err) {
    console.error("getAllHalls error:", err);
    res.status(500).json({ 
      error: "Failed to fetch halls",
      details: err.message,
      hint: "Check that hall_master table exists and has required columns"
    });
  }
};

/**
 * CREATE HALL
 * POST /hall
 */
export const createHall = async (req, res) => {
  const {
    Hall_Code,
    Hall_Name,
    Total_Rows,
    Total_Columns,
    Seating_Capacity,
    Hall_Type,
    Floor_Number,
    Block_Name,
    Location_Note,
    Facilities,
    Preference,
    Status
  } = req.body;

  try {
    // Validate required fields
    if (!Hall_Name) {
      return res.status(400).json({ error: "Hall_Name is required" });
    }

    if (!Total_Rows || !Total_Columns) {
      return res.status(400).json({ error: "Total_Rows and Total_Columns are required" });
    }

    // Duplicate hall name check
    const [exists] = await db.query(
      "SELECT id FROM hall_master WHERE LOWER(Hall_Name) = LOWER(?)",
      [Hall_Name]
    );

    if (exists.length > 0) {
      return res.status(400).json({ error: "Hall name already exists" });
    }

    // Calculate capacity if not provided
    const capacity = Seating_Capacity || (parseInt(Total_Rows) * parseInt(Total_Columns)) || 0;

    try {
      // Try with all new columns first
      await db.query(
        `INSERT INTO hall_master (
          Hall_Code,
          Hall_Name,
          Total_Rows,
          Total_Columns,
          Seating_Capacity,
          Hall_Type,
          Floor_Number,
          Block_Name,
          Location_Note,
          Facilities,
          Preference,
          Status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Hall_Code || null,
          Hall_Name,
          parseInt(Total_Rows) || 0,
          parseInt(Total_Columns) || 0,
          capacity,
          Hall_Type || null,
          Floor_Number || null,
          Block_Name || null,
          Location_Note || null,
          Facilities || null,
          Preference || null,
          Status || "Active"
        ]
      );
    } catch (colErr) {
      // If columns don't exist, try with basic columns
      if (colErr.message && colErr.message.includes("Unknown column")) {
        console.log("Missing columns detected, using fallback insert...");
        await db.query(
          `INSERT INTO hall_master (
            Hall_Name,
            Total_Rows,
            Total_Columns,
            Seating_Capacity,
            Hall_Type,
            Floor_Number,
            Block_Name,
            Preference,
            Status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            Hall_Name,
            parseInt(Total_Rows) || 0,
            parseInt(Total_Columns) || 0,
            capacity,
            Hall_Type || null,
            Floor_Number || null,
            Block_Name || null,
            Preference || null,
            Status || "Active"
          ]
        );
        return res.json({ 
          message: "Hall created successfully (basic fields only)", 
          warning: "Database is missing new columns. Please run ALTER TABLE queries to add Hall_Code, Location_Note, Facilities, and Preference."
        });
      }
      throw colErr;
    }

    res.json({ message: "Hall created successfully" });
  } catch (err) {
    console.error("createHall error:", err);
    res.status(500).json({ 
      error: err.message,
      hint: "If you see 'Unknown column' error, please run the ALTER TABLE queries from database/hall_master_alter.sql"
    });
  }
};

/**
 * UPDATE HALL
 * PUT /hall/:id
 */
export const updateHall = async (req, res) => {
  const { id } = req.params;
  const {
    Hall_Code,
    Hall_Name,
    Total_Rows,
    Total_Columns,
    Seating_Capacity,
    Hall_Type,
    Floor_Number,
    Block_Name,
    Location_Note,
    Facilities,
    Preference,
    Status
  } = req.body;

  try {
    // Validate required fields
    if (!Hall_Name) {
      return res.status(400).json({ error: "Hall_Name is required" });
    }

    // Calculate capacity if not provided
    const capacity = Seating_Capacity || (parseInt(Total_Rows) * parseInt(Total_Columns)) || 0;

    await db.query(
      `UPDATE hall_master SET
        Hall_Code = ?,
        Hall_Name = ?,
        Total_Rows = ?,
        Total_Columns = ?,
        Seating_Capacity = ?,
        Hall_Type = ?,
        Floor_Number = ?,
        Block_Name = ?,
        Location_Note = ?,
        Facilities = ?,
        Preference = ?,
        Status = ?
      WHERE id = ?`,
      [
        Hall_Code || null,
        Hall_Name,
        parseInt(Total_Rows) || 0,
        parseInt(Total_Columns) || 0,
        capacity,
        Hall_Type || null,
        Floor_Number || null,
        Block_Name || null,
        Location_Note || null,
        Facilities || null,
        Preference || null,
        Status || "Active",
        id
      ]
    );

    res.json({ message: "Hall updated successfully" });
  } catch (err) {
    console.error("updateHall error:", err);
    if (err.message && (err.message.includes("Unknown column") || err.message.includes("unknown column"))) {
      return res.status(500).json({ 
        error: "Database schema mismatch. Please run the ALTER TABLE queries.",
        details: err.message 
      });
    }
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE HALL
 * DELETE /hall/:id
 */
export const deleteHall = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query(
      "DELETE FROM hall_master WHERE id = ?",
      [id]
    );

    res.json({ message: "Hall deleted successfully" });
  } catch (err) {
    console.error("deleteHall error:", err);
    res.status(500).json({ message: "Failed to delete hall", error: err.message });
  }
};
