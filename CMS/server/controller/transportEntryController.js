// controllers/transportEntry.controller.js
import pool from "../db.js";

/**
 * Helper: map request body (camelCase) → DB fields (snake_case)
 */
function mapBodyToDb(body = {}) {
  return {
    entry_date: body.date || null,
    shift: body.shift || null,

    bus_number: body.busNumber || null,
    vehicle_type: body.vehicleType || null,
    capacity: body.capacity || null,
    registration_no: body.registrationNo || null,
    fitness_expiry: body.fitnessExpiry || null,
    permit_expiry: body.permitExpiry || null,
    insurance_expiry: body.insuranceExpiry || null,

    route_name: body.routeName || null,
    route_no: body.routeNo || null,
    stage_no: body.stageNo || null,
    stage_name: body.stageName || null,
    amount: body.amount || null,

    driver: body.driver || null,
    driver_id: body.driverId || null,

    gate_entry_time: body.gateEntryTime || null,
    gate_exit_time: body.gateExitTime || null,

    start_odo: body.startOdo || null,
    end_odo: body.endOdo || null,
    distance: body.distance || null,
    collected_amount: body.collectedAmount || null,

    fuel_issued: body.fuelIssued || null,
    fuel_type: body.fuelType || null,
    mileage: body.mileage || null,

    issues: body.issues || null,
    remarks: body.remarks || null,

    created_by: body.createdBy || null,
  };
}

/**
 * GET /api/transport/entries
 * Optional filters: ?date=...&busNumber=...&routeName=...&shift=...
 */
export const getTransportEntries = async (req, res) => {
  try {
    const { date, busNumber, routeName, shift } = req.query;

    let sql = "SELECT * FROM transport_entry WHERE 1=1";
    const params = [];

    if (date) {
      sql += " AND entry_date = ?";
      params.push(date);
    }
    if (busNumber) {
      sql += " AND bus_number = ?";
      params.push(busNumber);
    }
    if (routeName) {
      sql += " AND route_name = ?";
      params.push(routeName);
    }
    if (shift) {
      sql += " AND shift = ?";
      params.push(shift);
    }

    sql += " ORDER BY entry_date DESC, id DESC";

    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getTransportEntries error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch entries" });
  }
};

/**
 * GET /api/transport/entries/:id
 */
export const getTransportEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      "SELECT * FROM transport_entry WHERE id = ?",
      [id]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("getTransportEntryById error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch entry" });
  }
};

/**
 * POST /api/transport/entries
 * Used by TransportEntry frontend form SUBMIT
 */
export const createTransportEntry = async (req, res) => {
  try {
    const data = mapBodyToDb(req.body);

    const sql = `
      INSERT INTO transport_entry (
        entry_date, shift,
        bus_number, vehicle_type, capacity, registration_no,
        fitness_expiry, permit_expiry, insurance_expiry,
        route_name, route_no, stage_no, stage_name, amount,
        driver, driver_id,
        gate_entry_time, gate_exit_time,
        start_odo, end_odo, distance, collected_amount,
        fuel_issued, fuel_type, mileage,
        issues, remarks,
        created_by
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const params = [
      data.entry_date,
      data.shift,
      data.bus_number,
      data.vehicle_type,
      data.capacity,
      data.registration_no,
      data.fitness_expiry,
      data.permit_expiry,
      data.insurance_expiry,
      data.route_name,
      data.route_no,
      data.stage_no,
      data.stage_name,
      data.amount,
      data.driver,
      data.driver_id,
      data.gate_entry_time,
      data.gate_exit_time,
      data.start_odo,
      data.end_odo,
      data.distance,
      data.collected_amount,
      data.fuel_issued,
      data.fuel_type,
      data.mileage,
      data.issues,
      data.remarks,
      data.created_by,
    ];

    const [result] = await pool.query(sql, params);

    const [savedRows] = await pool.query(
      "SELECT * FROM transport_entry WHERE id = ?",
      [result.insertId]
    );
    return res.status(201).json({ success: true, data: savedRows[0] });
  } catch (err) {
    console.error("createTransportEntry error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create entry" });
  }
};

/**
 * PUT /api/transport/entries/:id
 * Partial update (only fields provided in body)
 */
export const updateTransportEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const data = mapBodyToDb(req.body);

    const allowed = [
      "entry_date",
      "shift",
      "bus_number",
      "vehicle_type",
      "capacity",
      "registration_no",
      "fitness_expiry",
      "permit_expiry",
      "insurance_expiry",
      "route_name",
      "route_no",
      "stage_no",
      "stage_name",
      "amount",
      "driver",
      "driver_id",
      "gate_entry_time",
      "gate_exit_time",
      "start_odo",
      "end_odo",
      "distance",
      "collected_amount",
      "fuel_issued",
      "fuel_type",
      "mileage",
      "issues",
      "remarks",
      "created_by",
    ];

    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    if (fields.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    params.push(id);

    await pool.query(
      `UPDATE transport_entry SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params
    );

    const [rows] = await pool.query(
      "SELECT * FROM transport_entry WHERE id = ?",
      [id]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("updateTransportEntry error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update entry" });
  }
};

/**
 * DELETE /api/transport/entries/:id
 */
export const deleteTransportEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.query(
      "DELETE FROM transport_entry WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Entry not found" });
    }

    return res.json({ success: true, message: "Entry deleted" });
  } catch (err) {
    console.error("deleteTransportEntry error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete entry" });
  }
};
