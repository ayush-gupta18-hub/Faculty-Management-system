const mongoose = require('mongoose');

const ROLES = ['super_admin', 'hod'];
const DEPARTMENTS = ['CSE', 'ECE', 'CCE', 'ME', 'Mathematics', 'Physics', 'HSS'];

const userSchema = new mongoose.Schema({
  email:      { type: String, unique: true, required: true, trim: true, lowercase: true },
  password:   { type: String, required: true },
  role:       { type: String, enum: ROLES, default: 'hod' },
  // Only relevant when role === 'hod'
  department: { type: String, enum: [...DEPARTMENTS, null], default: null }
});

module.exports = mongoose.model('User', userSchema);