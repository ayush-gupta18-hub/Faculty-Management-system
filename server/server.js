require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const Faculty  = require('./models/Faculty');

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

// ── API Routes ────────────────────────────────────────────────────────────────

// GET  /api/faculty          — list all faculty
app.get('/api/faculty', async (_req, res) => {
    try {
        const faculty = await Faculty.find().sort({ createdAt: 1 });
        res.json(faculty);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/faculty          — add new faculty
app.post('/api/faculty', async (req, res) => {
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
app.delete('/api/faculty/:id', async (req, res) => {
    try {
        const deleted = await Faculty.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Faculty not found.' });
        res.json({ message: 'Faculty removed successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/faculty/:id/courses          — allocate a course
app.post('/api/faculty/:id/courses', async (req, res) => {
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
app.delete('/api/faculty/:id/courses/:code', async (req, res) => {
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
