import db from '../db.js';

// Get all student enquiries
export const getStudentEnquiries = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT * FROM student_enquiry 
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching student enquiries:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get single student enquiry by ID
export const getStudentEnquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      'SELECT * FROM student_enquiry WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student enquiry not found' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching student enquiry:', err);
    res.status(500).json({ error: err.message });
  }
};

// Search student enquiries
export const searchStudentEnquiries = async (req, res) => {
  try {
    const { 
      studentName, 
      mobileNo, 
      community, 
      standard, 
      district,
      studentRegNo 
    } = req.query;
    
    let query = 'SELECT * FROM student_enquiry WHERE 1=1';
    const params = [];
    
    if (studentName) {
      query += ' AND student_name LIKE ?';
      params.push(`%${studentName}%`);
    }
    
    if (mobileNo) {
      query += ' AND mobile_no LIKE ?';
      params.push(`%${mobileNo}%`);
    }
    
    if (community) {
      query += ' AND community = ?';
      params.push(community);
    }
    
    if (standard) {
      query += ' AND standard = ?';
      params.push(standard);
    }
    
    if (district) {
      query += ' AND district = ?';
      params.push(district);
    }
    
    if (studentRegNo) {
      query += ' AND student_reg_no = ?';
      params.push(studentRegNo);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error searching student enquiries:', err);
    res.status(500).json({ error: err.message });
  }
};

// Add new student enquiry
export const addStudentEnquiry = async (req, res) => {
  try {
    const {
      studentName,
      mobileNo,
      parentName,
      parentMobile,
      address,
      district,
      community,
      standard,
      department,
      schoolType,
      studentRegNo,
      schoolName,
      schoolAddress,
      hostel,
      transport,
      source,
      status
    } = req.body;

    // Validate required fields
    if (!studentName || !mobileNo || !parentName || !community || !standard || !district) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['studentName', 'mobileNo', 'parentName', 'community', 'standard', 'district']
      });
    }

    // Validate mobile number format
    if (!/^\d{10}$/.test(mobileNo)) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits' });
    }

    // Generate student_eqid: EQ_<year>_<serial>
    const year = new Date().getFullYear();
    // Find latest serial for this year
    const [latest] = await db.query(
      `SELECT student_eqid FROM student_enquiry WHERE student_eqid LIKE ? ORDER BY student_eqid DESC LIMIT 1`,
      [`EQ_${year}_%`]
    );
    let serial = 1;
    if (latest.length > 0) {
      // Extract serial from student_eqid
      const match = latest[0].student_eqid.match(/EQ_\d{4}_(\d{3})/);
      if (match) {
        serial = parseInt(match[1], 10) + 1;
      }
    }
    const serialStr = serial.toString().padStart(3, '0');
    const student_eqid = `EQ_${year}_${serialStr}`;

    // Insert student enquiry
    const sql = `
      INSERT INTO student_enquiry (
        student_eqid, student_name, mobile_no, parent_name, parent_mobile,
        address, district, community, standard, department,
        school_type, student_reg_no, school_name, school_address,
        hostel, transport, source, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      student_eqid,
      studentName,
      mobileNo,
      parentName,
      parentMobile || null,
      address || null,
      district,
      community,
      standard,
      department || null,
      schoolType || null,
      studentRegNo || null,
      schoolName || null,
      schoolAddress || null,
      hostel || null,
      transport || null,
      source || null,
      status || null
    ];

    const [result] = await db.query(sql, values);

    res.status(201).json({
      success: true,
      message: 'Student enquiry added successfully',
      id: result.insertId,
      student_eqid
    });
  } catch (err) {
    console.error('Error adding student enquiry:', err);
    res.status(500).json({ error: err.message, details: err });
  }
};

// Update student enquiry
export const updateStudentEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      studentName,
      mobileNo,
      parentName,
      parentMobile,
      address,
      district,
      community,
      standard,
      department,
      schoolType,
      studentRegNo,
      schoolName,
      schoolAddress,
      hostel,
      transport,
      source,
      status
    } = req.body;

    // Check if student enquiry exists
    const [existing] = await db.query(
      'SELECT id FROM student_enquiry WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Student enquiry not found' });
    }

    // Validate required fields
    if (!studentName || !mobileNo || !parentName || !community || !standard || !district) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['studentName', 'mobileNo', 'parentName', 'community', 'standard', 'district']
      });
    }

    // Validate mobile number format
    if (!/^\d{10}$/.test(mobileNo)) {
      return res.status(400).json({ error: 'Mobile number must be 10 digits' });
    }

    // Update student enquiry
    const sql = `
      UPDATE student_enquiry SET
        student_name = ?,
        mobile_no = ?,
        parent_name = ?,
        parent_mobile = ?,
        address = ?,
        district = ?,
        community = ?,
        standard = ?,
        department = ?,
        school_type = ?,
        student_reg_no = ?,
        school_name = ?,
        school_address = ?,
        hostel = ?,
        transport = ?,
        source = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const values = [
      studentName,
      mobileNo,
      parentName,
      parentMobile || null,
      address || null,
      district,
      community,
      standard,
      department || null,
      schoolType || null,
      studentRegNo || null,
      schoolName || null,
      schoolAddress || null,
      hostel || null,
      transport || null,
      source || null,
      status || null,
      id
    ];

    await db.query(sql, values);

    res.json({
      success: true,
      message: 'Student enquiry updated successfully'
    });
  } catch (err) {
    console.error('Error updating student enquiry:', err);
    res.status(500).json({ error: err.message });
  }
};

// Delete student enquiry
export const deleteStudentEnquiry = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if student enquiry exists
    const [existing] = await db.query(
      'SELECT id FROM student_enquiry WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Student enquiry not found' });
    }

    // Delete student enquiry
    await db.query('DELETE FROM student_enquiry WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Student enquiry deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting student enquiry:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get statistics
export const getStudentEnquiryStatistics = async (req, res) => {
  try {
    // Total enquiries
    const [totalResult] = await db.query(
      'SELECT COUNT(*) as total FROM student_enquiry'
    );

    // By community
    const [communityStats] = await db.query(`
      SELECT community, COUNT(*) as count 
      FROM student_enquiry 
      GROUP BY community
    `);

    // By standard
    const [standardStats] = await db.query(`
      SELECT standard, COUNT(*) as count 
      FROM student_enquiry 
      GROUP BY standard 
      ORDER BY CAST(standard AS UNSIGNED)
    `);

    // By district
    const [districtStats] = await db.query(`
      SELECT district, COUNT(*) as count 
      FROM student_enquiry 
      WHERE district IS NOT NULL
      GROUP BY district 
      ORDER BY count DESC 
      LIMIT 10
    `);

    // Recent enquiries (last 7 days)
    const [recentResult] = await db.query(`
      SELECT COUNT(*) as recent 
      FROM student_enquiry 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);

    res.json({
      total: totalResult[0].total,
      recentEnquiries: recentResult[0].recent,
      byCommunity: communityStats,
      byStandard: standardStats,
      byDistrict: districtStats
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ error: err.message });
  }
};

// Bulk delete
export const bulkDeleteStudentEnquiries = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty IDs array' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM student_enquiry WHERE id IN (${placeholders})`;

    const [result] = await db.query(sql, ids);

    res.json({
      success: true,
      message: `${result.affectedRows} student enquiries deleted successfully`,
      deletedCount: result.affectedRows
    });
  } catch (err) {
    console.error('Error bulk deleting student enquiries:', err);
    res.status(500).json({ error: err.message });
  }
};
