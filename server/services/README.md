# Service Layer

This directory contains the business logic of the application.

## Architecture Guidelines
- **Controller**: Handles HTTP request/response, validation, and calls Service methods.
- **Service**: Contains business logic, calculations, and data transformation. Calls Database layer (utils/db.js).
- **Database**: Executes raw SQL queries.

## Migration Strategy
1. Identify logic in Controller.
2. Move logic to a new Service class/function here.
3. Update Controller to call Service.

## Example
**Before (Controller):**
```javascript
const login = async (req, res) => {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [req.body.id]);
  if (!user) return res.status(404).send('User not found');
  // ... check password
  res.json({ token });
}
```

**After (Service):**
```javascript
// services/authService.js
export const loginUser = async (id, password) => {
  const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (!user) throw new Error('User not found');
  // ... check password
  return token;
}

// controller/authController.js
const login = async (req, res) => {
  try {
    const token = await authService.loginUser(req.body.id, req.body.password);
    res.json({ token });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}
```
