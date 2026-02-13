// server/controller/leadManagementController.js
import db from "../db.js";

// ------------------------------------------------------
// GET ALL LEADS
// ------------------------------------------------------
export const getAllLeads = async (req, res) => {
  try {
    // Get all fields from tenant_details except created_at and updated_at
    const query = `
      SELECT
        student_eqid,
        student_address,
        student_name as studentName,
        student_mobile as phone,
        student_eqid as hscRegNo,
        source,
        tenant_id,
        staff_id,
        staff_name,
        student_reg_no,
        student_district as city,
        last_status,
        call_notes_count,
        next_follow_up
      FROM enquiry_call_notes_tenant
    `;

    const [rows] = await db.query(query);

    // For each lead, we might need to fetch call history separately
    // For now, initialize callHistory as empty array
    const leadsWithHistory = rows.map(lead => ({
      ...lead,
      callHistory: [] // TODO: Fetch from separate table if exists
    }));

    res.json(leadsWithHistory);
  } catch (err) {
    console.error("GET ALL LEADS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch leads" });
  }
};

// ------------------------------------------------------
// GET LEAD BY ID
// ------------------------------------------------------
export const getLeadById = async (req, res) => {
  try {
    const query = `
      SELECT
        id,
        student_eqid,
        student_name,
        student_mobile,
        parent_name,
        parent_mobile,
        student_address,
        student_district,
        student_community,
        school_type,
        standard,
        student_reg_no,
        school_address,
        department,
        source,
        transport,
        hostel,
        status,
        staff_id,
        staff_name,
        tenant_id
      FROM tenant_details
      WHERE student_eqid = ?
    `;

    const [rows] = await db.query(query, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Fetch call notes for this student and staff
    const callNotesQuery = `
      SELECT
        id,
        call_note_date as date,
        call_note_time as time,
        tenant_name as callerName,
        outcome,
        call_notes as notes,
        next_follow_up as nextFollowUp
      FROM enquiry_call_notes
      WHERE student_eqid = ? AND tenant_id = ?
    `;
    const [callNotes] = await db.query(callNotesQuery, [req.params.id, rows[0].staff_id]);

    const lead = {
      ...rows[0],
      callHistory: callNotes || []
    };

    res.json(lead);
  } catch (err) {
    console.error("GET LEAD BY ID ERROR:", err);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
};

// ------------------------------------------------------
// UPDATE LEAD STATUS
// ------------------------------------------------------
export const updateLead = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const query = "UPDATE tenant_details SET status = ? WHERE student_eqid = ?";
    const [result] = await db.query(query, [status, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Lead not found" });
    }

    res.json({ message: "Lead updated successfully" });
  } catch (err) {
    console.error("UPDATE LEAD ERROR:", err);
    res.status(500).json({ error: "Failed to update lead" });
  }
};


// ------------------------------------------------------
// UPDATE STATUS AND ADD CALL NOTE (Atomic)
// ------------------------------------------------------
export const addCallNote = async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      staff_id,
      staff_name,
      tenant_id,
      student_eqid,
      student_name,
      outcome,
      call_notes,
      next_follow_up,
      call_note_date,
      call_note_time,
      role
    } = req.body;

    await conn.beginTransaction();

    // 1. Update status in tenant_details
    const [updateResult] = await conn.query(
      `UPDATE tenant_details SET status = ? WHERE student_eqid = ? AND staff_id = ?`,
      [outcome, student_eqid, staff_id]
    );
    if (updateResult.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: "Student not found for status update" });
    }

    // 2. Insert call note in enquiry_call_notes
    const nextFollowUpValue = next_follow_up && next_follow_up.trim() !== '' ? next_follow_up : null;

    const [insertResult] = await conn.query(
      `INSERT INTO enquiry_call_notes
        (role, tenant_id, tenant_name, student_eqid, student_name, call_note_date, call_note_time, outcome, call_notes, next_follow_up, create_at, update_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        tenant_id,
        staff_id,
        staff_name,
        student_eqid,
        student_name,
        call_note_date,
        call_note_time,
        outcome,
        call_notes,
        nextFollowUpValue
      ]
    );

    await conn.commit();
    res.json({ message: "Status updated and call note added successfully" });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("ADD CALL NOTE ERROR:", err);
    res.status(500).json({ error: "Failed to update status and add call note" });
  } finally {
    if (conn) conn.release();
  }
};
