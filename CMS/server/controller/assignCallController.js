import db from '../db.js';

// Get all students from student_enquiry
export const getStudents = async (req, res) => {
  try {
    // detect if tenant_details stores student mobile column so we can exclude already-assigned students
    const { tenant_id } = req.query || {};
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenant_details'`,
      [process.env.DB_NAME]
    );
    const findCol = (candidates) => {
      for (const cand of candidates) {
        const found = cols.find(c => c.COLUMN_NAME.toLowerCase() === cand.toLowerCase());
        if (found) return found.COLUMN_NAME;
      }
      return null;
    };
    const tenantDetailsStudentMobile = findCol(['student_mobile', 'studentmobile', 'student_contact', 'student_phone', 'mobile_no', 'mobile']);

    // Build base query with optional tenant filter and exclusion of assigned students by mobile
    const whereClauses = [];
    const params = [];
    // Only apply tenant/role filter if student_enquiry table actually has tenant/role-like columns
    if (tenant_id) {
      const [scols] = await db.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'student_enquiry'`, [process.env.DB_NAME]);
      const sFind = (cands) => {
        for (const cand of cands) {
          const f = scols.find(x => x.COLUMN_NAME.toLowerCase() === cand.toLowerCase());
          if (f) return f.COLUMN_NAME;
        }
        return null;
      };
      const haveRoleCol = !!sFind(['role', 'tenant', 'tenant_role', 'assigned_role']);
      if (haveRoleCol) {
        // try common student columns that might contain tenant/role
        whereClauses.push(`(role = ? OR tenant = ? OR tenant_role = ? OR assigned_role = ?)`);
        params.push(tenant_id, tenant_id, tenant_id, tenant_id);
      }
    }
    if (tenantDetailsStudentMobile) {
      whereClauses.push(`mobile_no NOT IN (SELECT ${tenantDetailsStudentMobile} FROM tenant_details WHERE ${tenantDetailsStudentMobile} IS NOT NULL)`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const sql = `SELECT id, student_eqid, student_reg_no, student_name, mobile_no, parent_name, parent_mobile, address, community, department, district, standard, school_name, school_type, school_address, source, transport, hostel, status FROM student_enquiry ${whereClause} ORDER BY student_eqid ASC`;
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all callers from tenant_data
export const getCallers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        staff_id as Id,
        staff_name, 
        staff_id,
        role,
        Mobile,
        Dept_Name
      FROM tenant_data 
      WHERE staff_name IS NOT NULL
      ORDER BY staff_name ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching callers:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get all roles from tenant_data
export const getRoles = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DISTINCT role
      FROM tenant_data 
      WHERE role IS NOT NULL
      ORDER BY role ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get staff by role
export const getStaffByRole = async (req, res) => {
  try {
    const { role } = req.query;
    
    if (!role) {
      return res.status(400).json({ success: false, error: 'Role is required' });
    }

    const [rows] = await db.query(`
      SELECT 
        staff_id as Id,
        staff_name, 
        staff_id,
        role,
        Mobile,
        Dept_Name
      FROM tenant_data 
      WHERE role = ? AND staff_name IS NOT NULL
      ORDER BY staff_name ASC
    `, [role]);
    
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching staff by role:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Assign call to student(s)
export const assignCall = async (req, res) => {
  try {
    const { studentEnquiryIds, callerId } = req.body;

    if (!studentEnquiryIds || !Array.isArray(studentEnquiryIds) || studentEnquiryIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please select at least one student'
      });
    }

    // callerId is optional now. If not provided, we will insert NULL into staff_id.
    // This allows assigning calls even if callers data is unavailable on the client.
    const resolvedCallerId = callerId || null;

    // Insert assignments for each selected student.
    // tenant_details schema may not use a student_id foreign key; instead it may store student_name/mobile.
    // To be robust, fetch student rows from student_enquiry and insert whichever columns exist in tenant_details.
    const [cols] = await db.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'tenant_details'`,
      [process.env.DB_NAME]
    );

    // helper to find the actual column name from a list of candidates (case-preserving)
    const findCol = (candidates) => {
      for (const cand of candidates) {
        const found = cols.find(c => c.COLUMN_NAME.toLowerCase() === cand.toLowerCase());
        if (found) return found.COLUMN_NAME;
      }
      return null;
    };

    const tenantCol = findCol(['tenant_id', 'tenant', 'tenantname', 'tenant_id']);
    const staffCol = findCol(['staff_id', 'staffid', 'staff']);
    const staffNameCol = findCol(['staff_name', 'staffname']);
    const staffMobileCol = findCol(['staff_mobile', 'staffmobile', 'mobile']);
    const staffDeptCol = findCol(['staff_department', 'staff_dept', 'dept_name', 'Dept_Name']);
    const roleCol = findCol(['role', 'tenant_role']);
    const studentNameCol = findCol(['student_name', 'studentname']);
    const studentMobileCol = findCol(['student_mobile', 'studentmobile', 'mobile_no', 'mobile']);
    const parentNameCol = findCol(['parent_name', 'parentname']);
    const parentMobileCol = findCol(['parent_mobile', 'parentmobile']);
    const studentAddressCol = findCol(['student_address', 'studentaddress', 'address']);
    const studentContactCol = findCol(['student_contact']);
    const studentDistrictCol = findCol(['student_district', 'district']);
    const standardCol = findCol(['standard']);
    const regNoCol = findCol(['student_reg_no', 'student_regno', 'student_regno']);
    const studentEqidCol = findCol(['student_eqid', 'student_eq_id', 'eqid']);
    const schoolNameCol = findCol(['school_name', 'schoolname']);
    const schoolTypeCol = findCol(['school_type', 'schooltype']);
    const schoolAddressCol = findCol(['school_address', 'schooladdress']);
    const sourceCol = findCol(['source']);
    const transportCol = findCol(['transport']);
    const hostelCol = findCol(['hostel']);
    const statusCol = findCol(['status']);
    const communityCol = findCol(['student_community', 'community']);
    const departmentCol = findCol(['department', 'dept_name']);
    const createdCol = findCol(['CreatedAt', 'created_at', 'createdat', 'created', 'Created']);

    if (!createdCol) {
      throw new Error(`tenant_details table missing required created column (found: ${cols.map(c=>c.COLUMN_NAME).join(',')})`);
    }

    // Fetch student details (include additional fields to store)
    const placeholders = studentEnquiryIds.map(() => '?').join(',');
    const [studentsRows] = await db.query(
      `SELECT id, student_eqid, student_reg_no, student_name, mobile_no, parent_name, parent_mobile, address, community, department, district, standard, school_name, school_type, school_address, source, transport, hostel, status FROM student_enquiry WHERE id IN (${placeholders})`,
      studentEnquiryIds
    );

    // Resolve staff details from tenant_data when possible so we can store staff_name/staff_mobile/staff_department and role
    let staffRow = null;
    try {
      if (resolvedCallerId) {
        // Try matching by staff_id
        const [sr] = await db.query(`SELECT staff_id as Id, staff_name, staff_id, Mobile, Dept_Name FROM tenant_data WHERE staff_id = ? LIMIT 1`, [resolvedCallerId]);
        if (Array.isArray(sr) && sr.length > 0) staffRow = sr[0];
      }
      if (!staffRow && req.body.tenant_id) {
        // Fallback: pick first staff record for this role
        const [sr2] = await db.query(`SELECT staff_id as Id, staff_name, staff_id, Mobile, Dept_Name, role FROM tenant_data WHERE role = ? AND staff_name IS NOT NULL LIMIT 1`, [req.body.tenant_id]);
        if (Array.isArray(sr2) && sr2.length > 0) staffRow = sr2[0];
      }
    } catch (e) {
      console.warn('Could not resolve staff details from tenant_data', e.message || e);
    }

    // Build insert columns ordering (keep a deterministic order)
    const insertCols = [];
    if (tenantCol) insertCols.push(tenantCol);
    if (roleCol) insertCols.push(roleCol);
    if (staffCol) insertCols.push(staffCol);
    if (staffNameCol) insertCols.push(staffNameCol);
    if (staffMobileCol) insertCols.push(staffMobileCol);
    if (staffDeptCol) insertCols.push(staffDeptCol);
    if (regNoCol) insertCols.push(regNoCol);
    if (studentEqidCol) insertCols.push(studentEqidCol);
    if (studentNameCol) insertCols.push(studentNameCol);
    if (studentMobileCol) insertCols.push(studentMobileCol);
    if (studentContactCol) insertCols.push(studentContactCol);
    if (parentNameCol) insertCols.push(parentNameCol);
    if (parentMobileCol) insertCols.push(parentMobileCol);
    if (studentAddressCol) insertCols.push(studentAddressCol);
    if (communityCol) insertCols.push(communityCol);
    if (departmentCol) insertCols.push(departmentCol);
    if (studentDistrictCol) insertCols.push(studentDistrictCol);
    if (standardCol) insertCols.push(standardCol);
    if (schoolNameCol) insertCols.push(schoolNameCol);
    if (schoolTypeCol) insertCols.push(schoolTypeCol);
    if (schoolAddressCol) insertCols.push(schoolAddressCol);
    if (sourceCol) insertCols.push(sourceCol);
    if (transportCol) insertCols.push(transportCol);
    if (hostelCol) insertCols.push(hostelCol);
    if (statusCol) insertCols.push(statusCol);
    insertCols.push(createdCol);

    const colSql = insertCols.map(c => `\`${c}\``).join(', ');
    const valPlaceholders = insertCols.map(_ => '?').join(', ');
    const sql = `INSERT INTO tenant_details (${colSql}) VALUES (${valPlaceholders})`;

    let insertedCount = 0;
    for (const s of studentsRows) {
      const params = [];
      // tenant identifier/role values
      if (tenantCol) params.push(req.body.tenant_id || null);
      if (roleCol) params.push(staffRow ? staffRow.role : (req.body.tenant_id || null));
      // staff identifiers
      if (staffCol) params.push(resolvedCallerId);
      if (staffNameCol) params.push(staffRow ? staffRow.staff_name : null);
      if (staffMobileCol) params.push(staffRow ? staffRow.Mobile : null);
      if (staffDeptCol) params.push(staffRow ? staffRow.Dept_Name : null);
      // student fields
      if (regNoCol) params.push(s.student_reg_no || s.student_regno || null);
      if (studentEqidCol) params.push(s.student_eqid || null);
      if (studentNameCol) params.push(s.student_name || null);
      if (studentMobileCol) params.push(s.mobile_no || null);
      if (studentContactCol) params.push(s.mobile_no || null);
      if (parentNameCol) params.push(s.parent_name || null);
      if (parentMobileCol) params.push(s.parent_mobile || null);
      if (studentAddressCol) params.push(s.address || null);
      if (communityCol) params.push(s.community || null);
      if (departmentCol) params.push(s.department || null);
      if (studentDistrictCol) params.push(s.district || null);
      if (standardCol) params.push(s.standard || null);
      if (schoolNameCol) params.push(s.school_name || null);
      if (schoolTypeCol) params.push(s.school_type || null);
      if (schoolAddressCol) params.push(s.school_address || null);
      if (sourceCol) params.push(s.source || null);
      if (transportCol) params.push(s.transport || null);
      if (hostelCol) params.push(s.hostel || null);
      if (statusCol) params.push(s.status || null);
      // created
      params.push(new Date());

      try {
        const [result] = await db.query(sql, params);
        if (result.affectedRows > 0) insertedCount++;
      } catch (innerErr) {
        if (innerErr.code !== 'ER_DUP_ENTRY') throw innerErr;
      }
    }

    res.json({
      success: true,
      message: `${insertedCount} call(s) assigned successfully`,
      insertedCount
    });
  } catch (err) {
    console.error('Error assigning call:', err);
    console.error(err.stack);
    // Return detailed error in development to help debugging client-side
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
};

// Delete assigned call
export const deleteAssignedCall = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Call ID is required'
      });
    }

    const [result] = await db.query(
      'DELETE FROM tenant_details WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assigned call not found'
      });
    }

    res.json({
      success: true,
      message: 'Call assignment deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting assigned call:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update assigned call remarks
export const updateAssignedCall = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Call ID is required'
      });
    }

    const [result] = await db.query(
      'UPDATE tenant_details SET remarks = ? WHERE id = ?',
      [remarks || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assigned call not found'
      });
    }

    res.json({
      success: true,
      message: 'Call assignment updated successfully'
    });
  } catch (err) {
    console.error('Error updating assigned call:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get assigned calls (optionally filtered by tenant_id)
export const getAssignedCalls = async (req, res) => {
  try {
    const { tenant_id } = req.query;
    let sql = 'SELECT * FROM tenant_details';
    const params = [];
    if (tenant_id) {
      sql += ' WHERE tenant_id = ?';
      params.push(tenant_id);
    }
    sql += ' ORDER BY id DESC';
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error fetching assigned calls:', err);
    res.status(500).json({ success: false, error: err.message });
  }
};
