import db from '../db.js';
import bcrypt from 'bcryptjs';

// Get all roles
export const getRoles = async (req, res) => {
  try {
    const [roles] = await db.query('SELECT * FROM users_roles ORDER BY role');
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
};

// Create new role
export const createRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check if role already exists (case-insensitive)
    const [existingRoles] = await db.query(
      'SELECT role FROM users_roles WHERE LOWER(role) = LOWER(?)',
      [role]
    );

    if (existingRoles.length > 0) {
      return res.status(400).json({ 
        error: 'Role already exists. Please select from existing roles.' 
      });
    }

    const [result] = await db.query(
      'INSERT INTO users_roles (role) VALUES (?)',
      [role]
    );

    res.status(201).json({ 
      success: true, 
      id: result.insertId,
      role 
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
};

// Get all modules from sidebar_modules grouped by category
export const getModules = async (req, res) => {
  try {
    const [modules] = await db.query(
      'SELECT id, module_name, module_key, module_category, is_active FROM sidebar_modules WHERE is_active = 1'
    );
    res.json(modules);
  } catch (error) {
    console.error('Error fetching modules:', error);
    res.status(500).json({ error: 'Failed to fetch modules' });
  }
};

// Get all staff
export const getStaff = async (req, res) => {
  try {
    const [staff] = await db.query(
      'SELECT staff_id, staff_name FROM staff_master ORDER BY staff_name'
    );
    res.json(staff);
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

// Get all users
export const getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, role, staff_name, staff_id, username, password, module_access, created_at, update_at FROM users ORDER BY id DESC'
    );
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const { 
      userRole, 
      staffName, 
      staffId, 
      userId, 
      password, 
      accessModules 
    } = req.body;

    // Validation
    if (!userRole || !staffName || !staffId || !userId || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Convert accessModules object to comma-separated module_key string
    // accessModules is an object like: { "dashboard": true, "file": false, "academic": true }
    const selectedModuleIds = Object.keys(accessModules)
      .filter(key => accessModules[key] === true)
      .join(',');

    if (!selectedModuleIds) {
      return res.status(400).json({ error: 'At least one module must be selected' });
    }

    // Insert into users table
    const [result] = await db.query(
      `INSERT INTO users (role, staff_name, staff_id, username, password, module_access) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userRole, staffName, staffId, userId, hashedPassword, selectedModuleIds]
    );

    res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Check for duplicate staff_id
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'User ID already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      userRole, 
      staffName, 
      staffId, 
      userId, 
      password, 
      accessModules 
    } = req.body;

    // Check if user exists
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validation
    if (!userRole || !staffName || !staffId || !userId || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Convert accessModules object to comma-separated module_key string
    const selectedModuleIds = Object.keys(accessModules)
      .filter(key => accessModules[key] === true)
      .join(',');

    if (!selectedModuleIds) {
      return res.status(400).json({ error: 'At least one module must be selected' });
    }

    // Update the user
    await db.query(
      'UPDATE users SET role = ?, staff_name = ?, staff_id = ?, username = ?, password = ?, module_access = ? WHERE id = ?',
      [userRole, staffName, staffId, userId, hashedPassword, selectedModuleIds, id]
    );

    res.json({ 
      success: true, 
      message: 'User updated successfully' 
    });
  } catch (error) {
    console.error('Error updating user:', error);
    
    // Check for duplicate username
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const [users] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete the user
    await db.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};
