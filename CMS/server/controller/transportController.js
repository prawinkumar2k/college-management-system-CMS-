// controllers/transport.controller.js
import pool from "../db.js";
import { v4 as uuidv4 } from "uuid";

/**
 * Helper utilities
 */
const now = () => new Date().toISOString().slice(0, 19).replace("T", " ");

function mkId(prefix = "") {
  return (prefix ? prefix + "_" : "") + uuidv4().replace(/-/g, "").slice(0, 20);
}

/**
 * VEHICLES
 */
export const getVehicles = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM vehicles ORDER BY created_at DESC");
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getVehicles error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch vehicles" });
  }
};

export const createVehicle = async (req, res) => {
  try {
    const {
      id = mkId("V"),
      vehicle_number,
      vehicle_type,
      registration_no,
      reg_expiry,
      seating_capacity,
      fuel_type,
      assigned_driver_id = null,
      status = "Active",
      remarks = null
    } = req.body;

    if (!vehicle_number) return res.status(400).json({ success: false, message: "vehicle_number required" });

    await pool.query(
      `INSERT INTO vehicles (id, vehicle_number, vehicle_type, registration_no, reg_expiry, seating_capacity, fuel_type, assigned_driver_id, status, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, vehicle_number, vehicle_type || null, registration_no || null, reg_expiry || null, seating_capacity || null, fuel_type || null, assigned_driver_id || null, status, remarks]
    );

    const [rows] = await pool.query("SELECT * FROM vehicles WHERE id = ?", [id]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("createVehicle error:", err);
    // duplicate vehicle_number
    if (err && err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ success: false, message: "vehicle_number already exists" });
    }
    return res.status(500).json({ success: false, message: "Failed to create vehicle" });
  }
};

export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const params = [];

    const allowed = ["vehicle_number","vehicle_type","registration_no","reg_expiry","seating_capacity","fuel_type","assigned_driver_id","status","remarks"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        fields.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: "No fields to update" });
    params.push(id);
    await pool.query(`UPDATE vehicles SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    const [rows] = await pool.query("SELECT * FROM vehicles WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Vehicle not found" });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("updateVehicle error:", err);
    return res.status(500).json({ success: false, message: "Failed to update vehicle" });
  }
};

export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    // because of FK cascade on maintenance_records and stages referencing routes, we handle vehicles relationships:
    await pool.query("DELETE FROM vehicles WHERE id = ?", [id]);
    // unlink in drivers and routes if assigned
    await pool.query("UPDATE drivers SET assigned_vehicle_id = NULL WHERE assigned_vehicle_id = ?", [id]);
    await pool.query("UPDATE routes SET assigned_vehicle_id = NULL WHERE assigned_vehicle_id = ?", [id]);
    return res.json({ success: true, message: "Vehicle deleted" });
  } catch (err) {
    console.error("deleteVehicle error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete vehicle" });
  }
};

/**
 * DRIVERS
 */
export const getDrivers = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM drivers ORDER BY created_at DESC");
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getDrivers error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch drivers" });
  }
};

export const createDriver = async (req, res) => {
  try {
    const {
      id = mkId("D"),
      driver_name,
      phone = null,
      license_no = null,
      license_valid_till = null,
      assigned_vehicle_id = null,
      status = "Active"
    } = req.body;

    if (!driver_name) return res.status(400).json({ success: false, message: "driver_name required" });

    await pool.query(
      `INSERT INTO drivers (id, driver_name, phone, license_no, license_valid_till, assigned_vehicle_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, driver_name, phone, license_no, license_valid_till, assigned_vehicle_id, status]
    );

    const [rows] = await pool.query("SELECT * FROM drivers WHERE id = ?", [id]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("createDriver error:", err);
    return res.status(500).json({ success: false, message: "Failed to create driver" });
  }
};

export const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const params = [];
    const allowed = ["driver_name","phone","license_no","license_valid_till","assigned_vehicle_id","status"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        fields.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: "No fields to update" });
    params.push(id);
    await pool.query(`UPDATE drivers SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    const [rows] = await pool.query("SELECT * FROM drivers WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Driver not found" });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("updateDriver error:", err);
    return res.status(500).json({ success: false, message: "Failed to update driver" });
  }
};

export const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM drivers WHERE id = ?", [id]);
    await pool.query("UPDATE vehicles SET assigned_driver_id = NULL WHERE assigned_driver_id = ?", [id]);
    return res.json({ success: true, message: "Driver deleted" });
  } catch (err) {
    console.error("deleteDriver error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete driver" });
  }
};

/**
 * ROUTES (+ STAGES)
 */
export const getRoutes = async (req, res) => {
  try {
    const [routes] = await pool.query("SELECT * FROM routes ORDER BY created_at DESC");
    const [stages] = await pool.query("SELECT * FROM stages ORDER BY route_id, sequence_no ASC");
    // attach stages
    const grouped = routes.map(r => ({
      ...r,
      stages: stages.filter(s => s.route_id === r.id)
    }));
    return res.json({ success: true, data: grouped });
  } catch (err) {
    console.error("getRoutes error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch routes" });
  }
};

export const createRoute = async (req, res) => {
  try {
    const {
      id = mkId("R"),
      route_name,
      start_point = null,
      end_point = null,
      total_distance_km = null,
      shift = null,
      assigned_vehicle_id = null,
      status = "Active",
      stages = []
    } = req.body;

    if (!route_name) return res.status(400).json({ success: false, message: "route_name required" });

    await pool.query(
      `INSERT INTO routes (id, route_name, start_point, end_point, total_distance_km, shift, assigned_vehicle_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, route_name, start_point, end_point, total_distance_km || null, shift || null, assigned_vehicle_id || null, status]
    );

    // insert stages if provided
    for (const s of stages || []) {
      const sid = s.id || mkId("S");
      await pool.query(
        `INSERT INTO stages (id, route_id, stage_name, sequence_no, distance_from_start_km, stage_fee)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sid, id, s.stage_name || s.stageName || "", s.sequence_no || s.sequenceNo || 1, s.distance_from_start_km || s.distanceFromStartKm || 0, s.stage_fee || s.stageFee || 0]
      );
    }

    const [rows] = await pool.query("SELECT * FROM routes WHERE id = ?", [id]);
    const [stRows] = await pool.query("SELECT * FROM stages WHERE route_id = ? ORDER BY sequence_no ASC", [id]);
    return res.status(201).json({ success: true, data: { ...rows[0], stages: stRows } });
  } catch (err) {
    console.error("createRoute error:", err);
    return res.status(500).json({ success: false, message: "Failed to create route" });
  }
};

export const updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const params = [];
    const allowed = ["route_name","start_point","end_point","total_distance_km","shift","assigned_vehicle_id","status"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        fields.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    }
    if (fields.length > 0) {
      params.push(id);
      await pool.query(`UPDATE routes SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    }

    // If stages provided, replace them (simple approach: delete existing -> insert new)
    if (Array.isArray(req.body.stages)) {
      await pool.query("DELETE FROM stages WHERE route_id = ?", [id]);
      for (const s of req.body.stages) {
        const sid = s.id || mkId("S");
        await pool.query(
          `INSERT INTO stages (id, route_id, stage_name, sequence_no, distance_from_start_km, stage_fee)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [sid, id, s.stage_name || s.stageName || "", s.sequence_no || s.sequenceNo || 1, s.distance_from_start_km || s.distanceFromStartKm || 0, s.stage_fee || s.stageFee || 0]
        );
      }
    }

    const [rows] = await pool.query("SELECT * FROM routes WHERE id = ?", [id]);
    const [stRows] = await pool.query("SELECT * FROM stages WHERE route_id = ? ORDER BY sequence_no ASC", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Route not found" });
    return res.json({ success: true, data: { ...rows[0], stages: stRows } });
  } catch (err) {
    console.error("updateRoute error:", err);
    return res.status(500).json({ success: false, message: "Failed to update route" });
  }
};

export const deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    // cascade on stages via FK (but to be safe, delete explicitly)
    await pool.query("DELETE FROM stages WHERE route_id = ?", [id]);
    await pool.query("DELETE FROM routes WHERE id = ?", [id]);
    return res.json({ success: true, message: "Route deleted" });
  } catch (err) {
    console.error("deleteRoute error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete route" });
  }
};

/**
 * STAGES (individual operations, optional)
 */
export const createStage = async (req, res) => {
  try {
    const { route_id, stage_name, sequence_no = 1, distance_from_start_km = 0, stage_fee = 0 } = req.body;
    if (!route_id || !stage_name) return res.status(400).json({ success: false, message: "route_id and stage_name required" });
    const id = mkId("S");
    await pool.query(
      `INSERT INTO stages (id, route_id, stage_name, sequence_no, distance_from_start_km, stage_fee)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, route_id, stage_name, sequence_no, distance_from_start_km, stage_fee]
    );
    const [rows] = await pool.query("SELECT * FROM stages WHERE id = ?", [id]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("createStage error:", err);
    return res.status(500).json({ success: false, message: "Failed to create stage" });
  }
};

export const updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const params = [];
    const allowed = ["stage_name","sequence_no","distance_from_start_km","stage_fee"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        fields.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: "No fields to update" });
    params.push(id);
    await pool.query(`UPDATE stages SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    const [rows] = await pool.query("SELECT * FROM stages WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Stage not found" });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("updateStage error:", err);
    return res.status(500).json({ success: false, message: "Failed to update stage" });
  }
};

export const deleteStage = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM stages WHERE id = ?", [id]);
    return res.json({ success: true, message: "Stage deleted" });
  } catch (err) {
    console.error("deleteStage error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete stage" });
  }
};

/**
 * MAINTENANCE
 */
export const getMaintenance = async (req, res) => {
  try {
    // optional filter by vehicle_id
    const { vehicleId } = req.query;
    const params = [];
    let sql = "SELECT * FROM maintenance_records";
    if (vehicleId) {
      sql += " WHERE vehicle_id = ?";
      params.push(vehicleId);
    }
    sql += " ORDER BY date DESC";
    const [rows] = await pool.query(sql, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("getMaintenance error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch maintenance records" });
  }
};

export const createMaintenance = async (req, res) => {
  try {
    const {
      id = mkId("M"),
      vehicle_id,
      date,
      type = null,
      cost = 0,
      notes = null
    } = req.body;
    if (!vehicle_id || !date) return res.status(400).json({ success: false, message: "vehicle_id and date required" });
    await pool.query(
      `INSERT INTO maintenance_records (id, vehicle_id, date, type, cost, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, vehicle_id, date, type, cost || 0, notes]
    );
    const [rows] = await pool.query("SELECT * FROM maintenance_records WHERE id = ?", [id]);
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("createMaintenance error:", err);
    return res.status(500).json({ success: false, message: "Failed to create maintenance record" });
  }
};

export const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = [];
    const params = [];
    const allowed = ["vehicle_id","date","type","cost","notes"];
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        fields.push(`${k} = ?`);
        params.push(req.body[k]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, message: "No fields to update" });
    params.push(id);
    await pool.query(`UPDATE maintenance_records SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
    const [rows] = await pool.query("SELECT * FROM maintenance_records WHERE id = ?", [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Maintenance record not found" });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("updateMaintenance error:", err);
    return res.status(500).json({ success: false, message: "Failed to update maintenance" });
  }
};

export const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM maintenance_records WHERE id = ?", [id]);
    return res.json({ success: true, message: "Maintenance record deleted" });
  } catch (err) {
    console.error("deleteMaintenance error:", err);
    return res.status(500).json({ success: false, message: "Failed to delete maintenance" });
  }
};

/**
 * BULK SAVE (REPLACE ALL) and IMPORT (merge/replace)
 */
export const saveAllTransportMaster = async (req, res) => {
  try {
    const { vehicles = [], drivers = [], routes = [], maintenanceRecords = [] } = req.body;
    // basic transaction to avoid partial writes
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // truncate / replace
      await conn.query("DELETE FROM stages");
      await conn.query("DELETE FROM routes");
      await conn.query("DELETE FROM maintenance_records");
      await conn.query("DELETE FROM vehicles");
      await conn.query("DELETE FROM drivers");

      // insert vehicles
      for (const v of vehicles) {
        const params = [
          v.id || mkId("V"),
          v.vehicle_number, v.vehicle_type || null, v.registration_no || null,
          v.reg_expiry || null, v.seating_capacity || null, v.fuel_type || null,
          v.assigned_driver_id || null, v.status || "Active", v.remarks || null
        ];
        await conn.query(
          `INSERT INTO vehicles (id, vehicle_number, vehicle_type, registration_no, reg_expiry, seating_capacity, fuel_type, assigned_driver_id, status, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params
        );
      }

      // drivers
      for (const d of drivers) {
        const params = [
          d.id || mkId("D"),
          d.driver_name, d.phone || null, d.license_no || null, d.license_valid_till || null, d.assigned_vehicle_id || null, d.status || "Active"
        ];
        await conn.query(
          `INSERT INTO drivers (id, driver_name, phone, license_no, license_valid_till, assigned_vehicle_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          params
        );
      }

      // routes + stages
      for (const r of routes) {
        const routeId = r.id || mkId("R");
        await conn.query(
          `INSERT INTO routes (id, route_name, start_point, end_point, total_distance_km, shift, assigned_vehicle_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [routeId, r.route_name, r.start_point || null, r.end_point || null, r.total_distance_km || null, r.shift || null, r.assigned_vehicle_id || null, r.status || "Active"]
        );
        if (Array.isArray(r.stages)) {
          for (const s of r.stages) {
            await conn.query(
              `INSERT INTO stages (id, route_id, stage_name, sequence_no, distance_from_start_km, stage_fee)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [s.id || mkId("S"), routeId, s.stage_name || s.stageName || "", s.sequence_no || s.sequenceNo || 1, s.distance_from_start_km || s.distanceFromStartKm || 0, s.stage_fee || s.stageFee || 0]
            );
          }
        }
      }

      // maintenance
      for (const m of maintenanceRecords) {
        await conn.query(
          `INSERT INTO maintenance_records (id, vehicle_id, date, type, cost, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [m.id || mkId("M"), m.vehicle_id, m.date, m.type || null, m.cost || 0, m.notes || null]
        );
      }

      await conn.commit();
      conn.release();
      return res.json({ success: true, message: "All transport data saved (replaced)" });
    } catch (err) {
      await conn.rollback();
      conn.release();
      throw err;
    }
  } catch (err) {
    console.error("saveAllTransportMaster error:", err);
    return res.status(500).json({ success: false, message: "Failed to save all transport data" });
  }
};

export const importTransportData = async (req, res) => {
  try {
    const { mode = "merge", data = {} } = req.body;
    // mode: "merge" (default) or "replace"
    if (mode === "replace") {
      // reuse saveAllTransportMaster behavior
      return await saveAllTransportMaster(req, res);
    }

    // merge mode: insert/replace records using REPLACE INTO so existing primary key gets overwritten
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const { vehicles = [], drivers = [], routes = [], maintenanceRecords = [] } = data;

      for (const v of vehicles) {
        await conn.query(
          `REPLACE INTO vehicles (id, vehicle_number, vehicle_type, registration_no, reg_expiry, seating_capacity, fuel_type, assigned_driver_id, status, remarks)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [v.id || mkId("V"), v.vehicle_number, v.vehicle_type || null, v.registration_no || null, v.reg_expiry || null, v.seating_capacity || null, v.fuel_type || null, v.assigned_driver_id || null, v.status || "Active", v.remarks || null]
                  );
                }
          
                // Add similar REPLACE INTO logic for drivers, routes, stages, and maintenanceRecords as needed...
          
                await conn.commit();
                conn.release();
                return res.json({ success: true, message: "Transport data imported (merged)" });
              } catch (err) {
                await conn.rollback();
                conn.release();
                throw err;
              }
            } catch (err) {
              console.error("importTransportData error:", err);
              return res.status(500).json({ success: false, message: "Failed to import transport data" });
            }
          }
