const mongoose = require('mongoose');

// Stores words reported as toxic by users
const toxicWordSchema = new mongoose.Schema({
  word: { type: String, required: true, unique: true, lowercase: true },
  reportCount: { type: Number, default: 1 },
  isGlobal: { type: Boolean, default: false }, // promoted to global block list
}, { timestamps: true });

module.exports = mongoose.model('ToxicWord', toxicWordSchema);
