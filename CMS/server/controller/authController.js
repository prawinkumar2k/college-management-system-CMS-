import db from '../db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { logLogin, logActivity } from '../utils/activityLogger.js';

// Get all roles from users_roles table
export const getRoles = async (req, res) => {
  try {
    const [roles] = await db.query('SELECT id, role FROM users_roles ORDER BY role');
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

// User login with JWT token generation
export const login = async (req, res) => {
  try {
    const { username, password, role } = req.body;
    console.log(`Login attempt for User: ${username}, Role: ${role}`);

    // Validation
    if (!username || !password) {
      console.log('Login validation failed: Missing fields');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!role) {
      console.log('Login validation failed: Missing role');
      return res.status(400).json({ error: 'Please select a role' });
    }

    let user;
    let roleId;
    let roleName;

    if (role.toLowerCase() === 'student') {
      console.log('Processing Student Login...');
      // Fetch student from student_master table
      const [students] = await db.query(
        `SELECT id, Register_Number as username, Student_Name as name, Register_Number as staff_id, password, ? as role
         FROM student_master 
         WHERE Register_Number = ?`,
        [role, username]
      );

      console.log(`Student query found ${students.length} records`);

      if (students.length === 0) {
        console.log('Student not found in database');
        return res.status(401).json({ error: 'Invalid register number or password' });
      }

      user = students[0];
      console.log('Student found:', user.username);

      // Get role ID for student
      const [roles] = await db.query('SELECT id FROM users_roles WHERE role = ?', [role]);
      roleId = roles.length > 0 ? roles[0].id : null;
      roleName = role;

      // Compare password
      let isPasswordValid = false;
      if (password === user.password) {
        console.log('Password matched directly (Plaintext)');
        isPasswordValid = true;
      } else {
        // Try bcrypt compare in case it is hashed
        console.log('Plaintext mismatch, trying bcrypt...');
        isPasswordValid = await bcrypt.compare(password, user.password).catch((err) => {
          console.log('Bcrypt error:', err.message);
          return false;
        });
      }

      if (!isPasswordValid) {
        console.log('Password validation failed for student');
        return res.status(401).json({ error: 'Invalid register number or password' });
      }
    } else {
      console.log('Processing Staff/Admin Login...');
      // Fetch staff/admin from users table
      const [users] = await db.query(
        `SELECT u.id, u.username, u.staff_name as name, u.staff_id, u.password, u.role, u.module_access,
                r.id as role_id, r.role as role_name
         FROM users u
         LEFT JOIN users_roles r ON u.role = r.role
         WHERE u.username = ?`,
        [username]
      );

      console.log(`Staff query found ${users.length} records`);

      if (users.length === 0) {
        console.log('User not found in users table');
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      user = users[0];
      roleId = user.role_id;
      roleName = user.role_name;

      // Compare password with hashed password in database
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password Valid:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('Password validation failed for staff');
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      // Verify that selected role matches user's actual role in database (case-insensitive)
      if (roleName.toLowerCase() !== role.toLowerCase()) {
        console.log(`Role mismatch. User has ${roleName}, requested ${role}`);
        return res.status(403).json({
          error: `Access denied. You are not authorized as ${role}. Your role is ${roleName}.`
        });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        user_id: user.id,
        username: user.username,
        role_id: roleId,
        role_name: roleName,
        staff_name: user.name, // Will be Student_Name for students
        staff_id: user.staff_id, // Will be Register_Number for students
        module_access: user.module_access || ''
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
      { expiresIn: '24h' }
    );

    // Log successful login activity
    await logLogin(user.username, roleName);
    console.log('Login successful, token generated');

    // Return success response with token and user info
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        staff_name: user.name,
        staff_id: user.staff_id,
        role_id: roleId,
        role_name: roleName,
        module_access: user.module_access || ''
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
};

// Get sidebar modules based on user's module_access
export const getSidebar = async (req, res) => {
  try {
    console.log('getSidebar called');
    // req.user is populated by verifyToken middleware
    const userId = req.user.id;
    const userRole = req.user.role_name;

    console.log('User ID:', userId, 'User Role:', userRole);

    if (userRole && userRole.toLowerCase() === 'student') {
      console.log('User is Student, returning empty but successful sidebar data (Student uses static sidebar)');
      return res.json({
        success: true,
        data: []
      });
    }

    // Fetch user's module_access from database
    const [users] = await db.query(
      'SELECT module_access FROM users WHERE id = ?',
      [userId]
    );

    console.log('User query result:', users);

    if (users.length === 0) {
      console.log('User not found for ID:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    const moduleAccess = users[0].module_access;
    console.log('Module access for user:', moduleAccess);

    // If user is Admin, return all active modules
    if (userRole.toLowerCase() === 'admin') {
      console.log('User is Admin, fetching all modules');
      const [allModules] = await db.query(
        'SELECT id, module_name, module_key, module_category, module_path, is_active, COALESCE(display_order, 999) as display_order FROM sidebar_modules WHERE is_active = 1 ORDER BY display_order, module_category, id'
      );
      console.log('All modules fetched:', allModules.length, 'modules');
      return res.json({
        success: true,
        data: allModules
      });
    }

    // For other roles, filter by module_access
    if (!moduleAccess || moduleAccess.trim() === '') {
      console.log('No module access for user');
      return res.json({
        success: true,
        data: []
      });
    }

    // Split module_access into array
    const allowedModules = moduleAccess.split(',').map(m => m.trim());
    console.log('Allowed modules from user:', allowedModules);

    // First, let's see what module_keys exist in the database
    const [allAvailableModules] = await db.query(
      'SELECT DISTINCT module_key FROM sidebar_modules WHERE is_active = 1'
    );
    console.log('Available module_keys in database:', allAvailableModules.map(m => m.module_key));

    // Use FIND_IN_SET for each module_key in the comma-separated list
    // Alternative: use IN clause with the array
    const placeholders = allowedModules.map(() => '?').join(',');
    const [modules] = await db.query(
      `SELECT id, module_name, module_key, module_category, module_path, is_active, COALESCE(display_order, 999) as display_order
       FROM sidebar_modules 
       WHERE is_active = 1 
       AND module_key IN (${placeholders})
       ORDER BY display_order, module_category, id`,
      allowedModules
    );

    console.log('Modules for user:', modules.length, 'modules found');
    res.json({
      success: true,
      data: modules
    });
  } catch (error) {
    console.error('Error fetching sidebar modules:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch sidebar modules', details: error.message });
  }
};

// Test endpoint to check user password hash and verify a password
export const testUserPassword = async (req, res) => {
  try {
    const { username, testPassword } = req.query;

    const [users] = await db.query(
      'SELECT id, username, password, role FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.json({ error: 'User not found' });
    }

    const user = users[0];

    let passwordMatch = false;
    if (testPassword) {
      passwordMatch = await bcrypt.compare(testPassword, user.password);
    }

    res.json({
      username: user.username,
      role: user.role,
      passwordHashLength: user.password ? user.password.length : 0,
      passwordStartsWith: user.password ? user.password.substring(0, 7) : '',
      isBcryptHash: user.password ? user.password.startsWith('$2a$') || user.password.startsWith('$2b$') : false,
      testPassword: testPassword || 'Not provided',
      passwordMatch: testPassword ? passwordMatch : 'No test password provided'
    });
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ error: 'Failed to check user' });
  }
};

// Get user profile with staff or student details
export const getUserProfile = async (req, res) => {
  try {
    // req.user is populated by verifyToken middleware
    console.log('getUserProfile - req.user:', req.user);

    const userRole = req.user.role_name;
    const userIdInToken = req.user.user_id; // id from users or student_master
    const identId = req.user.staff_id; // staff_id from users or Register_Number from student_master

    if (userRole && userRole.toLowerCase() === 'student') {
      // Fetch student details from student_master
      const [studentDetails] = await db.query(
        `SELECT id, Register_Number as regNo, Student_Name as studentName, Dept_Name as department, Std_Email as email, Student_Mobile as phone, Dob as dob, Current_Address as address, Photo_Path as photo
         FROM student_master 
         WHERE Register_Number = ?`,
        [identId]
      );

      if (studentDetails.length === 0) {
        return res.json({
          success: true,
          data: {
            regNo: identId,
            studentName: req.user.staff_name,
            role_name: req.user.role_name,
            photo: null
          }
        });
      }

      const student = studentDetails[0];
      return res.json({
        success: true,
        data: {
          ...student,
          photo: student.photo ? `/assets/master/${student.photo}` : null,
          role_name: req.user.role_name
        }
      });
    }

    // Existing staff/admin logic
    const staffId = req.user.staff_id;

    if (!staffId) {
      console.error('Staff ID not found in token');
      return res.json({
        success: true,
        data: {
          staff_id: null,
          staff_name: req.user.staff_name,
          designation: null,
          photo: null,
          role_name: req.user.role_name
        }
      });
    }

    // Fetch staff details from staff_master table
    const [staffDetails] = await db.query(
      `SELECT Staff_ID, Staff_Name, Designation, Photo 
       FROM staff_master 
       WHERE Staff_ID = ?`,
      [staffId]
    );

    if (staffDetails.length === 0) {
      console.warn('No staff found in staff_master for Staff_ID:', staffId);
      return res.json({
        success: true,
        data: {
          staff_id: staffId,
          staff_name: req.user.staff_name,
          designation: null,
          photo: null,
          role_name: req.user.role_name
        }
      });
    }

    const staff = staffDetails[0];

    // Return profile with photo path
    res.json({
      success: true,
      data: {
        staff_id: staff.Staff_ID,
        staff_name: staff.Staff_Name,
        designation: staff.Designation,
        photo: staff.Photo ? `/assets/master/${staff.Photo}` : null,
        role_name: req.user.role_name
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.json({
      success: true,
      data: {
        staff_id: req.user?.staff_id || null,
        staff_name: req.user?.staff_name || 'Unknown',
        designation: null,
        photo: null,
        role_name: req.user?.role_name || 'Unknown'
      }
    });
  }
};

// User logout - logs the logout activity
export const logout = async (req, res) => {
  try {
    const username = req.user.username;
    const role = req.user.role_name;

    // Log logout activity
    await logActivity(username, role, 'Logged out');

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Logout failed. Please try again.' });
  }
};
