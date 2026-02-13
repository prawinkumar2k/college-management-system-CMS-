import db from "../db.js";

const TABLE = "quota_allocation";

// 🔥 MODEL LOGIC MERGED HERE
const quotaAllocation = {
  create: async (data) => {
    const sql = `
      INSERT INTO ${TABLE} 
      (Type, Course_Name, Dept_Code, OC, BC, BCO, BCM, MBC, SC, SCA, ST, Other, TotSeat, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const params = [
      data.type,
      data.courseName || null,
      data.deptCode || null,
      data.oc,
      data.bc,
      data.bco,
      data.bcm,
      data.mbc,
      data.sc,
      data.sca,
      data.st,
      data.other,
      data.totSeat
    ];

    return db.query(sql, params);
  },

  getAll: async () => {
    const sql = `SELECT * FROM ${TABLE}`;
    return db.query(sql);
  },

  delete: async (id) => {
    const sql = `DELETE FROM ${TABLE} WHERE id = ?`;
    return db.query(sql, [id]);
  }
};

// 🔥 CONTROLLER (kept same API response structure)
export const createQuotaAllocation = async (req, res) => {
  try {
    const {
      courseName,
      deptCode,
      type,
      oc,
      bc,
      bco,
      bcm,
      mbc,
      sc,
      sca,
      st,
      other,
      totSeat
    } = req.body;

    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }


    const result = await quotaAllocation.create({
      type,
      courseName,
      deptCode,
      oc,
      bc,
      bco,
      bcm,
      mbc,
      sc,
      sca,
      st,
      other,
      totSeat
    });

    // forward created id(s) so client can track DB rows if needed
    const insertId = Array.isArray(result) && result[0] && result[0].insertId ? result[0].insertId : null;

    res.status(201).json({ message: "Quota allocation created successfully", insertId });

  } catch (error) {
    console.error("Error creating quota allocation:", error);
    res.status(500).json({ error: "Failed to create quota allocation" });
  }
};

export const getAllQuotaAllocations = async (req, res) => {
  try {
    const [rows] = await quotaAllocation.getAll();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching quota allocations:", error);
    res.status(500).json({ error: "Failed to fetch quota allocations" });
  }
};

export const deleteQuotaAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    await quotaAllocation.delete(id);
    res.json({ message: "Quota allocation deleted successfully" });
  } catch (error) {
    console.error("Error deleting quota allocation:", error);
    res.status(500).json({ error: "Failed to delete quota allocation" });
  }
};

// Get quota and available seats for department
export const getQuotaByDept = async (req, res) => {
  try {
    const { deptCode, quotaType } = req.query;
    
    if (!deptCode || !quotaType) {
      return res.status(400).json({ error: "deptCode and quotaType are required" });
    }

    console.log(`Fetching quota for Dept: ${deptCode}, Type: ${quotaType}`);

    // Query from available_quota_seat view table
    // Column structure:
    // - Dept_Code
    // - total_gq_seats, available_gq, admitted_gq (for GQ quota)
    // - total_mq_seats, available_mq, admitted_mq (for MQ quota)
    const [quotaData] = await db.query(
      `SELECT * FROM available_quota_seat WHERE Dept_Code = ?`,
      [deptCode]
    );

    console.log('Query result from available_quota_seat:', quotaData);

    if (!quotaData || quotaData.length === 0) {
      return res.json({ 
        total: 0, 
        available: 0,
        filled: 0,
        quotaType: quotaType,
        message: "No quota data found in available_quota_seat view"
      });
    }

    const quota = quotaData[0];
    let totalSeats = 0;
    let availableSeats = 0;
    let filledSeats = 0;

    // Extract data based on quota type
    if (quotaType === 'GQ') {
      totalSeats = parseInt(quota.total_gq_seats) || 0;
      availableSeats = parseInt(quota.available_gq) || 0;
      filledSeats = parseInt(quota.admitted_gq) || 0;
    } else if (quotaType === 'MQ') {
      totalSeats = parseInt(quota.total_mq_seats) || 0;
      availableSeats = parseInt(quota.available_mq) || 0;
      filledSeats = parseInt(quota.admitted_mq) || 0;
    } else {
      // Unknown quota type
      return res.json({
        total: 0,
        available: 0,
        filled: 0,
        quotaType: quotaType,
        message: `Unknown quota type: ${quotaType}. Expected 'GQ' or 'MQ'`
      });
    }

    console.log(`Quota response: Total=${totalSeats}, Available=${availableSeats}, Filled=${filledSeats}`);

    res.json({
      total: totalSeats,
      available: availableSeats,
      filled: filledSeats,
      quotaType: quotaType,
      department: quota.Dept_Name,
      course: quota.Course_Name,
      quotaDetails: quota
    });

  } catch (error) {
    console.error("Error fetching quota data:", error);
    res.status(500).json({ error: "Failed to fetch quota data", details: error.message });
  }
};
