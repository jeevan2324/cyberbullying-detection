const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  processedText: { type: String }, // blurred text if applicable
  status: { type: String, enum: ['allowed', 'hidden', 'blurred', 'blocked'], default: 'allowed' },
  toxicityScore: { type: Number, default: 0 },
  parentComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null }, // for replies
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);
