const express = require('express');
const router = express.Router();
const axios = require('axios');
const Comment = require('../models/Comment');
const User = require('../models/User');
const ToxicWord = require('../models/ToxicWord');
const auth = require('../middleware/auth');

/**
 * Task 3: CONNECT AI MODERATION
 * Route: POST /comments/add
 */
router.post('/add', auth, async (req, res) => {
  try {
    const { postId, text } = req.body;
    const userId = req.userId;

    // Fetch user for their moderation level
    const user = await User.findById(userId);
    const moderationLevel = user.moderation_level || 'intermediate';

    console.log(`[Task 3] Moderating comment for user ${userId} at level: ${moderationLevel}`);

    // AI API Call
    let aiStatus = 'allowed';
    let aiScore = 0;

    try {
      // Task 3: Send request to AI API
      const aiResponse = await axios.post('http://127.0.0.1:8000/moderate', {
        text,
        level: moderationLevel
      });
      
      aiStatus = aiResponse.data.status;
      aiScore = aiResponse.data.score;
      
      console.log(`[Task 3] AI Status: ${aiStatus}, Score: ${aiScore}`);
    } catch (aiErr) {
      console.warn('[Task 3] AI service unavailable, falling back to "allowed"');
    }

    // Task 3 Logic: If blocked, do not save
    if (aiStatus === 'blocked') {
      return res.status(403).json({ error: 'Comment rejected by AI moderation.' });
    }

    // Task 3: Save comment with status
    const comment = new Comment({
      post: postId,
      user: userId,
      text: text,
      status: aiStatus,
      toxicityScore: aiScore
    });

    await comment.save();
    await comment.populate('user', 'username profilePicture');
    
    res.status(201).json(comment);
  } catch (err) {
    console.error('[Task 3] Error adding comment:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/comments/:postId
router.get('/:postId', async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/comments/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    if (comment.user.toString() !== req.userId) return res.status(401).json({ error: 'Unauthorized' });
    
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
