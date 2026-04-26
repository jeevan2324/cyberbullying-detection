const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET /api/chat/conversations - Get list of users you've chatted with
router.get('/conversations', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [{ senderId: req.userId }, { receiverId: req.userId }]
    }).sort({ createdAt: -1 });

    const contactMap = new Map();
    for (const msg of messages) {
      const otherId = msg.senderId.toString() === req.userId ? msg.receiverId.toString() : msg.senderId.toString();
      if (!contactMap.has(otherId)) {
        contactMap.set(otherId, msg);
      }
    }

    const contactIds = Array.from(contactMap.keys());
    const contacts = await User.find({ _id: { $in: contactIds } }).select('username profilePicture');
    
    const result = contacts.map(c => ({
      user: c,
      lastMessage: contactMap.get(c._id.toString())
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/history/:userId - Get message history with a user
router.get('/history/:userId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.userId, receiverId: req.params.userId },
        { senderId: req.params.userId, receiverId: req.userId }
      ]
    }).sort({ createdAt: 1 }).limit(100);

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/can-message/:userId - Check if user can message someone
router.get('/can-message/:userId', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    const isFollowingMe = me.followers.includes(req.params.userId);
    const iFollow = me.following.includes(req.params.userId);
    const mutualFollow = isFollowingMe && iFollow;

    if (!mutualFollow) {
      const msgCount = await Message.countDocuments({ senderId: req.userId, receiverId: req.params.userId });
      return res.json({ canMessage: true, isRestricted: true, remainingMessages: Math.max(0, 5 - msgCount) });
    }

    res.json({ canMessage: true, isRestricted: false, remainingMessages: Infinity });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
