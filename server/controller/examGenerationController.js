import pool from '../db.js';

// ===== EXAM TIMETABLE FILTERED ENDPOINT =====
export const getExamTimetableDetails = async (req, res) => {
  try {
    const {
      examDate,
      session,
      subjectCode,
      deptCode,
      semester,
      regulation
    } = req.query;

    if (!examDate || !session || !subjectCode || !deptCode || !semester || !regulation) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required query parameters' 
      });
    }

    // Format date if needed
    let apiDate = examDate;
    if (/^\d{2}-\d{2}-\d{4}$/.test(examDate)) {
      const [day, month, year] = examDate.split('-');
      apiDate = `${year}-${month}-${day}`;
    }

    const query = `
      SELECT * FROM exam_timetable
      WHERE 
        Exam_Date = ?
        AND Session = ?
        AND Sub_Code = ?
        AND Dept_Code = ?
        AND Semester = ?
        AND Regulation = ?
      LIMIT 1
    `;

    const [results] = await pool.query(query, [apiDate, session, subjectCode, deptCode, semester, regulation]);
    
    if (results && results.length > 0) {
      res.json({
        success: true,
        data: results[0]
      });
    } else {
      res.json({
        success: true,
        data: null,
        message: 'No timetable found'
      });
    }
  } catch (err) {
    console.error('Error fetching exam timetable details:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exam timetable details',
      details: err.message
    });
  }
};

// ===== TIMETABLE ENDPOINTS =====
export const getTimetable = async (req, res) => {
  try {
    const query = `SELECT * FROM exam_timetable ORDER BY Exam_Date, Session`;
    const [results] = await pool.query(query);
    
    res.json({
      success: true,
      data: results || [],
      count: results ? results.length : 0
    });
  } catch (err) {
    console.error('Error fetching timetable:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch timetable',
      details: err.message 
    });
  }
};

// ===== HALL ENDPOINTS =====
export const getHalls = async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        Hall_Code,
        Hall_Name,
        Total_Rows,
        Total_Columns,
        Seating_Capacity,
        Block_Name,
        Floor_Number,
        Hall_Type,
        Status
      FROM hall_master
      WHERE Status = 'active'
      ORDER BY Hall_Name
    `;
    
    const [results] = await pool.query(query);
    
    res.json({
      success: true,
      data: results || [],
      count: results ? results.length : 0
    });
  } catch (err) {
    console.error('Error fetching halls:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch halls',
      details: err.message 
    });
  }
};

// ===== STUDENT ENDPOINTS =====
export const getStudents = async (req, res) => {
  try {
    const {
      examDate,
      session,
      subjectCode,
      deptCode,
      semester,
      regulation
    } = req.query;

    if (!examDate || !session || !subjectCode || !deptCode || !semester || !regulation) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required query parameters' 
      });
    }

    // Format date if needed
    let apiDate = examDate;
    if (/^\d{2}-\d{2}-\d{4}$/.test(examDate)) {
      const [day, month, year] = examDate.split('-');
      apiDate = `${year}-${month}-${day}`;
    }

    const query = `
      SELECT 
        Register_Number,
        Student_Name
      FROM exam_timetable_student_list
      WHERE 
        Exam_Date = ?
        AND Session = ?
        AND Sub_Code = ?
        AND Dept_Code = ?
        AND Semester = ?
        AND Regulation = ?
      ORDER BY Student_Name
    `;

    const [results] = await pool.query(query, [apiDate, session, subjectCode, deptCode, semester, regulation]);
    
    res.json({
      success: true,
      data: results || [],
      count: results ? results.length : 0
    });
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch students',
      details: err.message 
    });
  }
};

// ===== SEAT ASSIGNMENT ENDPOINTS =====
export const getSeatAssignments = async (req, res) => {
  try {
    // Accept both camelCase and snake_case query params for compatibility
    const {
      examDate, exam_date,
      session,
      subjectCode, subject_code,
      deptCode, dept_code,
      hallId, hall_id,
      hallCode, hall_code,
      semester,
      regulation
    } = req.query;

    const q = {
      examDate: examDate || exam_date,
      subjectCode: subjectCode || subject_code,
      deptCode: deptCode || dept_code,
      hallId: hallId || hall_id,
      hallCode: hallCode || hall_code,
      session,
      semester,
      regulation
    };

    let query = `
      SELECT 
        eg.id,
        eg.exam_date,
        eg.session,
        eg.subject_code,
        eg.subject_name,
        eg.dept_code,
        eg.semester,
        eg.regulation,
        eg.hall_code,
        eg.hall_name,
        eg.register_number,
        COALESCE(eg.student_name, etsl.Student_Name, 'N/A') as student_name,
        eg.row,
        eg.col,
        eg.created_at,
        eg.updated_at,
        hm.Hall_Name as master_hall_name,
        hm.Total_Rows,
        hm.Total_Columns,
        hm.Block_Name,
        hm.Floor_Number
      FROM exam_generation eg
      LEFT JOIN hall_master hm ON eg.hall_code = hm.Hall_Code
      LEFT JOIN exam_timetable_student_list etsl ON eg.register_number = etsl.Register_Number
        AND eg.exam_date = etsl.Exam_Date 
        AND eg.session = etsl.Session 
        AND eg.subject_code = etsl.Sub_Code
      WHERE 1=1
    `;
    
    const params = [];
    
    // Build dynamic WHERE clause using normalized params
    if (q.examDate) {
      query += ' AND eg.exam_date = ?';
      params.push(q.examDate);
    }

    if (q.session) {
      query += ' AND eg.session = ?';
      params.push(q.session);
    }

    if (q.subjectCode) {
      query += ' AND eg.subject_code = ?';
      params.push(q.subjectCode);
    }

    if (q.deptCode) {
      query += ' AND eg.dept_code = ?';
      params.push(q.deptCode);
    }

    // If client passed a hall id, filter by the hall_master id (joined via hall_code)
    if (q.hallId) {
      query += ' AND hm.id = ?';
      params.push(q.hallId);
    }

    if (q.hallCode) {
      query += ' AND eg.hall_code = ?';
      params.push(q.hallCode);
    }

    if (q.semester) {
      query += ' AND eg.semester = ?';
      params.push(q.semester);
    }

    if (q.regulation) {
      query += ' AND eg.regulation = ?';
      params.push(q.regulation);
    }

    query += ' ORDER BY eg.exam_date, eg.session, eg.hall_code, eg.row, eg.col';
    
    console.log('Get Seat Assignments Query:', query);
    console.log('Parameters:', params);
    
    const [results] = await pool.query(query, params);
    
    res.json({
      success: true,
      data: results || [],
      count: results ? results.length : 0
    });
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch assignments',
      details: err.message 
    });
  }
};

export const createSeatAssignment = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      exam_date,
      session,
      subject_code,
      subject_name,
      dept_code,
      dept_name,
      semester,
      regulation,
      hall_code,
      hall_name,
      hall_capacity,
      row,
      col,
      register_number,
      student_name,
      seat_no
    } = req.body;

    console.log('Create Seat Assignment Payload:', JSON.stringify(req.body, null, 2));

    // Validate required fields
    const requiredFields = [
      'exam_date', 'session', 'subject_code', 'dept_code', 'semester', 'regulation',
      'hall_code', 'hall_name', 'row', 'col', 'register_number', 'student_name', 'seat_no'
    ];
    
    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Validate row and col are numbers
    if (isNaN(parseInt(row)) || isNaN(parseInt(col))) {
      return res.status(400).json({ 
        success: false,
        error: 'Row and column must be numbers' 
      });
    }

    // Check if seat is already assigned for this exam
    const seatCheckQuery = `
      SELECT id, register_number, student_name 
      FROM exam_generation 
      WHERE exam_date = ? 
        AND session = ? 
        AND subject_code = ? 
        AND hall_code = ? 
        AND \`row\` = ? 
        AND \`col\` = ?
    `;

    const [existingSeat] = await connection.query(seatCheckQuery, [
      exam_date, session, subject_code, hall_code, row, col
    ]);

    if (existingSeat && existingSeat.length > 0) {
      const existing = existingSeat[0];
      return res.status(409).json({ 
        success: false,
        error: `Seat already assigned to ${existing.student_name || existing.register_number}`,
        data: existing
      });
    }

    // Check if student is already assigned for this exam
    const studentCheckQuery = `
      SELECT id, hall_code, row, col, student_name 
      FROM exam_generation 
      WHERE exam_date = ? 
        AND session = ? 
        AND subject_code = ? 
        AND register_number = ?
    `;

    const [existingStudent] = await connection.query(studentCheckQuery, [
      exam_date, session, subject_code, register_number
    ]);

    if (existingStudent && existingStudent.length > 0) {
      const existing = existingStudent[0];
      return res.status(409).json({ 
        success: false,
        error: `Student already assigned to Hall ${existing.hall_code}, Seat (${existing.row}, ${existing.col})`,
        data: existing
      });
    }

    // Insert the new assignment
    const insertQuery = `
      INSERT INTO exam_generation 
        (exam_date, session, subject_code, subject_name, dept_code, dept_name, semester, regulation,
         hall_code, hall_name, hall_capacity, \`row\`, \`col\`, register_number, student_name, seat_no, created_at, updated_at)
      VALUES 
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

          const [insertResult] = await connection.query(insertQuery, [
            exam_date, session, subject_code, subject_name, dept_code, dept_name, semester, regulation,
            hall_code, hall_name, hall_capacity, parseInt(row), parseInt(col), register_number, student_name, seat_no
          ]);

    // Get the newly created assignment
    const selectQuery = `
      SELECT * FROM exam_generation 
      WHERE id = ?
    `;

    const [newAssignment] = await connection.query(selectQuery, [insertResult.insertId]);

    await connection.commit();

    console.log('Seat assignment created successfully. ID:', insertResult.insertId);

    res.status(201).json({
      success: true,
      data: newAssignment[0],
      message: 'Seat assignment created successfully'
    });

  } catch (err) {
    await connection.rollback();
    
    console.error('Error creating seat assignment:', err);
    
    // Handle MySQL duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Duplicate entry. This seat or student is already assigned for this exam.',
        details: err.message
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to create seat assignment',
      details: err.message 
    });
  } finally {
    connection.release();
  }
};

export const updateSeatAssignment = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const {
      hall_code,
      hall_name,
      row,
      col,
      register_number,
      student_name,
      seat_no
    } = req.body;

    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: 'Assignment ID is required' 
      });
    }

    // Get current assignment to check constraints
    const getCurrentQuery = `
      SELECT exam_date, session, subject_code, register_number, hall_code, row, col
      FROM exam_generation 
      WHERE id = ?
    `;

    const [currentAssignments] = await connection.query(getCurrentQuery, [id]);
    
    if (!currentAssignments || currentAssignments.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Assignment not found' 
      });
    }

    const current = currentAssignments[0];

    // If changing student, check if new student is already assigned
    if (register_number && register_number !== currentAssignments[0].register_number) {
      const studentCheckQuery = `
        SELECT id FROM exam_generation 
        WHERE exam_date = ? 
          AND session = ? 
          AND subject_code = ? 
          AND register_number = ?
      `;

      const [existingStudent] = await connection.query(studentCheckQuery, [
        current.exam_date, current.session, current.subject_code, register_number
      ]);

      if (existingStudent && existingStudent.length > 0) {
        return res.status(409).json({ 
          success: false,
          error: 'Student already assigned for this exam'
        });
      }
    }

    // If changing seat, check if new seat is already taken
    if ((row !== undefined && col !== undefined) && 
        (row !== currentAssignments[0].row || col !== currentAssignments[0].col)) {
      const seatCheckQuery = `
        SELECT id FROM exam_generation 
        WHERE exam_date = ? 
          AND session = ? 
          AND subject_code = ? 
          AND hall_code = ? 
          AND row = ? 
          AND col = ?
      `;

      const newHallCode = hall_code || currentAssignments[0].hall_code;

      const [existingSeat] = await connection.query(seatCheckQuery, [
        current.exam_date, current.session, current.subject_code, newHallCode, row, col
      ]);

      if (existingSeat && existingSeat.length > 0) {
        return res.status(409).json({ 
          success: false,
          error: 'Seat already assigned'
        });
      }
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    
    if (hall_code !== undefined) {
      updates.push('hall_code = ?');
      params.push(hall_code);
    }

    if (hall_name !== undefined) {
      updates.push('hall_name = ?');
      params.push(hall_name);
    }
    
    if (row !== undefined) {
      updates.push('row = ?');
      params.push(parseInt(row));
    }
    
    if (col !== undefined) {
      updates.push('col = ?');
      params.push(parseInt(col));
    }
    
    if (register_number !== undefined) {
      updates.push('register_number = ?');
      params.push(register_number);
    }

    if (student_name !== undefined) {
      updates.push('student_name = ?');
      params.push(student_name);
    }

    if (seat_no !== undefined) {
      updates.push('seat_no = ?');
      params.push(seat_no);
    }

    updates.push('updated_at = NOW()');
    
    if (updates.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No fields to update' 
      });
    }
    
    params.push(id);
    
    const updateQuery = `
      UPDATE exam_generation 
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const [updateResult] = await connection.query(updateQuery, params);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Assignment not found or no changes made' 
      });
    }

    // Get updated assignment
    const selectQuery = `
      SELECT * FROM exam_generation 
      WHERE id = ?
    `;

    const [updatedAssignment] = await connection.query(selectQuery, [id]);

    await connection.commit();

    res.json({
      success: true,
      data: updatedAssignment[0],
      message: 'Assignment updated successfully'
    });

  } catch (err) {
    await connection.rollback();
    
    console.error('Error updating assignment:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update assignment',
      details: err.message 
    });
  } finally {
    connection.release();
  }
};

export const deleteSeatAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ 
        success: false,
        error: 'Assignment ID is required' 
      });
    }
    
    const query = `DELETE FROM exam_generation WHERE id = ?`;
    
    const [results] = await pool.query(query, [id]);
    
    if (results.affectedRows === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Assignment not found' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Assignment deleted successfully' 
    });
  } catch (err) {
    console.error('Error deleting assignment:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete assignment',
      details: err.message 
    });
  }
};

export const clearSeatAssignments = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const {
      examDate, exam_date,
      session,
      subjectCode, subject_code,
      deptCode, dept_code,
      hallId, hall_id,
      hallCode, hall_code,
      semester,
      regulation
    } = req.query;

    const q = {
      examDate: examDate || exam_date,
      session,
      subjectCode: subjectCode || subject_code,
      deptCode: deptCode || dept_code,
      hallId: hallId || hall_id,
      hallCode: hallCode || hall_code,
      semester,
      regulation
    };

    // If hallId provided, resolve to hallCode
    if (q.hallId && !q.hallCode) {
      const [hrows] = await connection.query('SELECT Hall_Code FROM hall_master WHERE id = ?', [q.hallId]);
      if (!hrows || hrows.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid hallId' });
      }
      q.hallCode = hrows[0].Hall_Code;
    }

    if (!q.examDate || !q.session || !q.subjectCode || !q.hallCode) {
      return res.status(400).json({ 
        success: false,
        error: 'examDate, session, subjectCode, and hallCode are required' 
      });
    }
    
    // Get count before deletion
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM exam_generation 
      WHERE exam_date = ? 
        AND session = ? 
        AND subject_code = ? 
        AND hall_code = ?
        ${q.deptCode ? ' AND dept_code = ?' : ''}
        ${q.semester ? ' AND semester = ?' : ''}
        ${q.regulation ? ' AND regulation = ?' : ''}
    `;
    
    const countParams = [q.examDate, q.session, q.subjectCode, q.hallCode];
    if (q.deptCode) countParams.push(q.deptCode);
    if (q.semester) countParams.push(q.semester);
    if (q.regulation) countParams.push(q.regulation);
    
    const [countResult] = await connection.query(countQuery, countParams);
    const countBefore = countResult[0].count;
    
    // Delete assignments
    const deleteQuery = `
      DELETE FROM exam_generation 
      WHERE exam_date = ? 
        AND session = ? 
        AND subject_code = ? 
        AND hall_code = ?
        ${q.deptCode ? ' AND dept_code = ?' : ''}
        ${q.semester ? ' AND semester = ?' : ''}
        ${q.regulation ? ' AND regulation = ?' : ''}
    `;

    const [deleteResult] = await connection.query(deleteQuery, countParams);
    
    await connection.commit();
    
    res.json({ 
      success: true,
      message: `Cleared ${deleteResult.affectedRows} seat assignments`,
      deletedCount: deleteResult.affectedRows,
      countBefore: countBefore
    });
  } catch (err) {
    await connection.rollback();
    
    console.error('Error clearing assignments:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clear assignments',
      details: err.message 
    });
  } finally {
    connection.release();
  }
};

export const bulkCreateSeatAssignments = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { assignments } = req.body;

    console.log('Received bulk assignment request:', {
      hasAssignments: !!assignments,
      isArray: Array.isArray(assignments),
      length: Array.isArray(assignments) ? assignments.length : 'N/A',
      bodyKeys: Object.keys(req.body)
    });

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid assignments data. Expected an array of assignments.',
        received: {
          type: typeof assignments,
          isArray: Array.isArray(assignments),
          length: Array.isArray(assignments) ? assignments.length : null
        }
      });
    }
    
    console.log(`Processing ${assignments.length} bulk assignments`);
    
    const successAssignments = [];
    const errors = [];
    const skippedAssignments = [];
    
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      const { 
        exam_date, session, subject_code, subject_name, dept_code, dept_name, semester, regulation,
        hall_code, hall_name, hall_capacity, row, col, register_number, student_name, seat_no
      } = assignment;
      
      // Validate required fields (use proper null/undefined checks, not falsy)
      const requiredFields = [
        'exam_date', 'session', 'subject_code', 'dept_code', 'semester', 'regulation',
        'hall_code', 'hall_name', 'row', 'col', 'register_number', 'student_name', 'seat_no'
      ];
      
      const missingFields = requiredFields.filter(field => 
        assignment[field] === null || assignment[field] === undefined || assignment[field] === ''
      );
      if (missingFields.length > 0) {
        console.error(`Assignment ${i} validation failed:`, {
          missingFields,
          assignment: JSON.stringify(assignment)
        });
        errors.push({ 
          index: i, 
          assignment, 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        });
        continue;
      }
      
      try {
        // Check for existing seat assignment
        const seatCheckQuery = `
          SELECT id FROM exam_generation 
          WHERE exam_date = ? 
            AND session = ? 
            AND subject_code = ? 
            AND hall_code = ? 
            AND \`row\` = ? 
            AND \`col\` = ?
        `;

        const [existingSeat] = await connection.query(seatCheckQuery, [
          exam_date, session, subject_code, hall_code, row, col
        ]);

        // Check for existing student assignment
        const studentCheckQuery = `
          SELECT id FROM exam_generation 
          WHERE exam_date = ? 
            AND session = ? 
            AND subject_code = ? 
            AND register_number = ?
        `;

        const [existingStudent] = await connection.query(studentCheckQuery, [
          exam_date, session, subject_code, register_number
        ]);
        
        if (existingSeat && existingSeat.length > 0) {
          // Update existing seat assignment
          const updateQuery = `
            UPDATE exam_generation 
            SET register_number = ?, student_name = ?, seat_no = ?, subject_name = ?, dept_code = ?, dept_name = ?, semester = ?, regulation = ?, hall_capacity = ?, updated_at = NOW()
            WHERE id = ?
          `;

          await connection.query(updateQuery, [register_number, student_name, seat_no, subject_name, dept_code, dept_name, semester, regulation, hall_capacity, existingSeat[0].id]);
          successAssignments.push({ ...assignment, action: 'updated', existingId: existingSeat[0].id });
        } else if (existingStudent && existingStudent.length > 0) {
          // Update if student already assigned (move them to new seat)
          const updateQuery = `
            UPDATE exam_generation 
            SET hall_code = ?, hall_name = ?, \`row\` = ?, \`col\` = ?, seat_no = ?, subject_name = ?, dept_code = ?, dept_name = ?, semester = ?, regulation = ?, hall_capacity = ?, updated_at = NOW()
            WHERE exam_date = ? 
              AND session = ? 
              AND subject_code = ? 
              AND register_number = ?
          `;

          await connection.query(updateQuery, [
            hall_code, hall_name, parseInt(row, 10), parseInt(col, 10), seat_no, subject_name, dept_code, dept_name, semester, regulation, hall_capacity,
            exam_date, session, subject_code, register_number
          ]);
          successAssignments.push({ ...assignment, action: 'updated', existingId: existingStudent[0].id });
        } else {
          // Insert new assignment
          const insertQuery = `
            INSERT INTO exam_generation 
              (exam_date, session, subject_code, subject_name, dept_code, dept_name, semester, regulation,
               hall_code, hall_name, hall_capacity, \`row\`, \`col\`, register_number, student_name, seat_no, created_at, updated_at)
            VALUES 
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
          `;

          const [insertResult] = await connection.query(insertQuery, [
            exam_date, session, subject_code, subject_name, dept_code, dept_name, semester, regulation,
            hall_code, hall_name, hall_capacity, parseInt(row, 10), parseInt(col, 10), register_number, student_name, seat_no
          ]);
          
          successAssignments.push({ ...assignment, action: 'created', id: insertResult.insertId });
        }
      } catch (queryErr) {
        console.error(`Query error at assignment ${i}:`, {
          message: queryErr.message,
          code: queryErr.code,
          sql: queryErr.sql,
          assignment: JSON.stringify(assignment)
        });
        errors.push({ 
          index: i, 
          assignment, 
          error: queryErr.message,
          code: queryErr.code 
        });
      }
    }
    
    // If there are any errors, rollback the entire transaction
    if (errors.length > 0) {
      await connection.rollback();
      
      console.error('Bulk assignment errors summary:', {
        totalErrors: errors.length,
        firstError: errors[0]
      });
      
      return res.status(400).json({
        success: false,
        error: 'Bulk assignment failed due to errors',
        totalProcessed: assignments.length,
        successCount: successAssignments.length,
        errorCount: errors.length,
        skippedCount: skippedAssignments.length,
        errors: errors,
        skipped: skippedAssignments.length > 0 ? skippedAssignments : undefined
      });
    }
    
    await connection.commit();
    
    res.status(201).json({
      success: true,
      message: 'Bulk assignment completed successfully',
      totalProcessed: assignments.length,
      successCount: successAssignments.length,
      errorCount: errors.length,
      skippedCount: skippedAssignments.length,
      data: successAssignments,
      errors: errors.length > 0 ? errors : undefined,
      skipped: skippedAssignments.length > 0 ? skippedAssignments : undefined
    });
  } catch (err) {
    await connection.rollback();
    
    console.error('Error in bulk assignment:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process bulk assignments',
      details: err.message 
    });
  } finally {
    connection.release();
  }
};

// ===== ADDITIONAL UTILITY ENDPOINTS =====
export const getExamDetails = async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        exam_date,
        session,
        subject_code,
        dept_code,
        semester,
        regulation
      FROM exam_generation
      ORDER BY exam_date DESC, session, subject_code
      LIMIT 100
    `;
    
    const [results] = await pool.query(query);
    
    res.json({
      success: true,
      data: results || [],
      count: results ? results.length : 0
    });
  } catch (err) {
    console.error('Error fetching exam details:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch exam details',
      details: err.message 
    });
  }
};

export const getHallCapacity = async (req, res) => {
  try {
    const { hallId, hallCode } = req.query;
    
    if (!hallId && !hallCode) {
      return res.status(400).json({ 
        success: false,
        error: 'hallId or hallCode is required' 
      });
    }
    
    let query = `
      SELECT 
        hm.id,
        hm.Hall_Code,
        hm.Hall_Name,
        hm.Total_Rows,
        hm.Total_Columns,
        hm.Seating_Capacity,
        COUNT(eg.id) as assigned_seats,
        (hm.Seating_Capacity - COUNT(eg.id)) as available_seats
      FROM hall_master hm
      LEFT JOIN exam_generation eg ON (
        hm.Hall_Code = eg.hall_code
      )
      WHERE hm.Status = 'active'
    `;
    
    const params = [];
    
    if (hallId) {
      query += ' AND hm.id = ?';
      params.push(hallId);
    }
    
    if (hallCode) {
      query += ' AND hm.Hall_Code = ?';
      params.push(hallCode);
    }
    
    query += ' GROUP BY hm.id, hm.Hall_Code, hm.Hall_Name, hm.Total_Rows, hm.Total_Columns, hm.Seating_Capacity';
    
    const [results] = await pool.query(query, params);
    
    if (results && results.length > 0) {
      res.json({
        success: true,
        data: results[0]
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Hall not found'
      });
    }
  } catch (err) {
    console.error('Error fetching hall capacity:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch hall capacity',
      details: err.message 
    });
  }
};