require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Faculty  = require('./models/Faculty');
const User = require('./models/User');

// ── Auth Middleware ────────────────────────────────────────────────────────────────

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;

  if (!header) return res.status(401).json({ error: 'No token' });

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}



const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve the frontend (index.html, style.css, app.js, logo) from the parent folder
app.use(express.static(path.join(__dirname, '..')));

// ── MongoDB Connection ────────────────────────────────────────────────────────
mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅  Connected to MongoDB');
        await seedIfEmpty();
    })
    .catch(err => {
        console.error('❌  MongoDB connection error:', err.message);
        process.exit(1);
    });

// ── Seed initial data (only if collection is empty) ──────────────────────────
async function seedIfEmpty() {
    const count = await Faculty.countDocuments();
    if (count > 0) return;

    const seed = [
        {
            firstName: 'Amit', lastName: 'Sharma', empId: 'EMP001',
            department: 'CSE', designation: 'Professor', joiningYear: 2010,
            email: 'amit.sharma@lnmiit.ac.in', phone: '9876543210',
            specialization: 'Database Systems, Data Mining', color: '#f87171',
            courses: [
                { code: 'CSE301', name: 'Database Management Systems' },
                { code: 'CSE412', name: 'Data Mining' }
            ]
        },
        {
            firstName: 'Priya', lastName: 'Singh', empId: 'EMP002',
            department: 'ECE', designation: 'Associate Professor', joiningYear: 2015,
            email: 'priya.singh@lnmiit.ac.in', phone: '9876543211',
            specialization: 'VLSI Design, Microprocessors', color: '#fb923c',
            courses: [{ code: 'ECE205', name: 'Digital Logic Design' }]
        },
        {
            firstName: 'Rahul', lastName: 'Verma', empId: 'EMP003',
            department: 'ME', designation: 'Assistant Professor', joiningYear: 2018,
            email: 'rahul.verma@lnmiit.ac.in', phone: '9876543212',
            specialization: 'Robotics, Thermodynamics', color: '#fbbf24',
            courses: []
        },
        {
            firstName: 'Neha', lastName: 'Gupta', empId: 'EMP004',
            department: 'Mathematics', designation: 'Professor', joiningYear: 2008,
            email: 'neha.gupta@lnmiit.ac.in', phone: '9876543213',
            specialization: 'Discrete Mathematics, Algebra', color: '#a3e635',
            courses: [{ code: 'MTH102', name: 'Mathematics II' }]
        }
    ];

    await Faculty.insertMany(seed);
    console.log('🌱  Seeded 4 initial faculty records');
}


// ── Auth API ────────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ email, password: hashed });
    await user.save();

    res.json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid email' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: 'Invalid password' });

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

// ── API Routes ────────────────────────────────────────────────────────────────

// GET  /api/faculty          — list all faculty
app.get('/api/faculty', authMiddleware, async (_req, res) => {
    try {
        const faculty = await Faculty.find().sort({ createdAt: 1 });
        res.json(faculty);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/faculty          — add new faculty
app.post('/api/faculty', authMiddleware, async (req, res) => {
    try {
        const faculty = new Faculty(req.body);
        await faculty.save();
        res.status(201).json(faculty);
    } catch (err) {
        if (err.code === 11000) {
            // Duplicate key — figure out which field
            const field = Object.keys(err.keyPattern)[0];
            const label = field === 'empId' ? 'Employee ID' : 'Email';
            res.status(400).json({ error: `${label} already exists.` });
        } else {
            res.status(400).json({ error: err.message });
        }
    }
});

// DELETE /api/faculty/:id    — remove a faculty member
app.delete('/api/faculty/:id', authMiddleware, async (req, res) => {
    try {
        const deleted = await Faculty.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Faculty not found.' });
        res.json({ message: 'Faculty removed successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/faculty/:id/courses          — allocate a course
app.post('/api/faculty/:id/courses', authMiddleware, async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.params.id);
        if (!faculty) return res.status(404).json({ error: 'Faculty not found.' });

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

// DELETE /api/faculty/:id/courses/:code  — remove a course allocation
app.delete('/api/faculty/:id/courses/:code', authMiddleware, async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.params.id);
        if (!faculty) return res.status(404).json({ error: 'Faculty not found.' });

        faculty.courses = faculty.courses.filter(c => c.code !== req.params.code);
        await faculty.save();
        res.json(faculty);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback: serve index.html for any unknown route
app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀  Server running at http://localhost:${PORT}`);
    console.log(`📚  API base:        http://localhost:${PORT}/api/faculty\n`);
});
