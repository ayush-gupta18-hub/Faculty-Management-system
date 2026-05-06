require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const Faculty  = require('./models/Faculty');
const User     = require('./models/User');

// ── Auth Middleware ──────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided.' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * requireRole(...roles)
 * Usage: requireRole('super_admin') or requireRole('super_admin', 'hod')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: insufficient permissions.' });
    }
    next();
  };
}

/**
 * hodDeptFilter — for HOD, injects a department filter into the query.
 * Super Admin passes through without restriction.
 */
function hodDeptFilter(req, res, next) {
  if (req.user.role === 'hod') {
    if (!req.user.department) {
      return res.status(403).json({ error: 'HOD account has no department assigned.' });
    }
    req.deptFilter = { department: req.user.department };
  } else {
    req.deptFilter = {};  // Super Admin sees everything
  }
  next();
}

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// ── MongoDB Connection ────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  Connected to MongoDB');
  })
  .catch(err => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });



// ── Auth API ──────────────────────────────────────────────────────────────────

// Register — anyone can register; role/dept chosen at sign-up
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role, department } = req.body;

    if (!['super_admin', 'hod'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be super_admin or hod.' });
    }
    if (role === 'hod' && !department) {
      return res.status(400).json({ error: 'HOD must have a department assigned.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user   = new User({ email, password: hashed, role, department: role === 'hod' ? department : null });
    await user.save();

    res.json({ message: 'User registered successfully.' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Email already registered.' });
    res.status(400).json({ error: err.message });
  }
});

// Login — returns JWT with role & department embedded
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid email or password.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid email or password.' });

  const token = jwt.sign(
    { userId: user._id, role: user.role, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, role: user.role, department: user.department });
});

// ── Faculty API ───────────────────────────────────────────────────────────────

// GET /api/faculty — Super Admin sees all; HOD sees only their department
app.get('/api/faculty', authMiddleware, hodDeptFilter, async (req, res) => {
  try {
    const faculty = await Faculty.find(req.deptFilter).sort({ createdAt: 1 });
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/faculty — both roles can add, but HOD's dept is locked to their own
app.post('/api/faculty', authMiddleware, requireRole('super_admin', 'hod'), async (req, res) => {
  try {
    const payload = { ...req.body };

    // HOD cannot add faculty to a different department
    if (req.user.role === 'hod') {
      payload.department = req.user.department;
    }

    const faculty = new Faculty(payload);
    await faculty.save();
    res.status(201).json(faculty);
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      const label = field === 'empId' ? 'Employee ID' : 'Email';
      return res.status(400).json({ error: `${label} already exists.` });
    }
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/faculty/:id — HOD can only delete from their own department
app.delete('/api/faculty/:id', authMiddleware, requireRole('super_admin', 'hod'), async (req, res) => {
  try {
    const query = { _id: req.params.id, ...req.deptFilter };
    // Reuse deptFilter so HOD can't delete outside their dept
    // But we need to call hodDeptFilter first — inline it here:
    if (req.user.role === 'hod') {
      query.department = req.user.department;
    }

    const deleted = await Faculty.findOneAndDelete(query);
    if (!deleted) return res.status(404).json({ error: 'Faculty not found or access denied.' });
    res.json({ message: 'Faculty removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/faculty/:id/courses — allocate a course (HOD scoped to dept)
app.post('/api/faculty/:id/courses', authMiddleware, requireRole('super_admin', 'hod'), async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'hod') query.department = req.user.department;

    const faculty = await Faculty.findOne(query);
    if (!faculty) return res.status(404).json({ error: 'Faculty not found or access denied.' });

    const { code, name } = req.body;
    if (faculty.courses.some(c => c.code === code)) {
      return res.status(400).json({ error: `Course ${code} is already assigned.` });
    }

    faculty.courses.push({ code, name });
    await faculty.save();
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/faculty/:id/courses/:code — remove course allocation (HOD scoped)
app.delete('/api/faculty/:id/courses/:code', authMiddleware, requireRole('super_admin', 'hod'), async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === 'hod') query.department = req.user.department;

    const faculty = await Faculty.findOne(query);
    if (!faculty) return res.status(404).json({ error: 'Faculty not found or access denied.' });

    faculty.courses = faculty.courses.filter(c => c.code !== req.params.code);
    await faculty.save();
    res.json(faculty);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback — serve index.html for unknown routes
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Server running at http://localhost:${PORT}`);
  console.log(`📚  API base:        http://localhost:${PORT}/api/faculty\n`);
});
