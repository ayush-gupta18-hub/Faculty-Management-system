const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true }
}, { _id: false });

const facultySchema = new mongoose.Schema({
    firstName:    { type: String, required: true, trim: true },
    lastName:     { type: String, required: true, trim: true },
    empId:        { type: String, required: true, unique: true, trim: true },
    department:   { type: String, required: true },
    designation:  { type: String, required: true },
    joiningYear:  { type: Number, required: true },
    email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
    phone:        { type: String, default: '' },
    specialization: { type: String, default: 'N/A' },
    courses:      { type: [courseSchema], default: [] },
    color:        { type: String, default: '#38bdf8' }
}, { timestamps: true });

// Clean up the JSON output — expose `id` instead of `_id`, drop `__v`
facultySchema.set('toJSON', {
    virtuals: true,
    transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    }
});

module.exports = mongoose.model('Faculty', facultySchema);
