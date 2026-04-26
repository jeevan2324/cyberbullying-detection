const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// 1. Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Task: FIX POST UPLOAD SYSTEM
 * Route: POST /api/posts/create
 */
router.post('/create', auth, upload.single('image'), async (req, res) => {
  // Task Debug Logs
  console.log('[Post Fix] req.body:', req.body);
  console.log('[Post Fix] req.file:', req.file);

  try {
    if (!req.file) {
      console.error('[Post Fix] No file received');
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { caption } = req.body;
    const userId = req.userId;

    // 3. Save: image path, caption, and user_id
    const post = new Post({
      user: userId,
      imageUrl: `/uploads/${req.file.filename}`,
      caption: caption || ''
    });

    await post.save();
    await post.populate('user', 'username profilePicture');

    console.log('[Post Fix] Success:', post._id);
    res.status(201).json(post);
  } catch (err) {
    console.error('[Post Fix] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/feed
router.get('/feed', auth, async (req, res) => {
  try {
    const me = await User.findById(req.userId);
    const userIds = [...me.following, req.userId];
    const posts = await Post.find({ user: { $in: userIds } })
      .sort({ createdAt: -1 })
      .populate('user', 'username profilePicture')
      .limit(50);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/user/:userId
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('user', 'username profilePicture');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate('user', 'username profilePicture');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const liked = post.likes.includes(req.userId);
    if (liked) post.likes.pull(req.userId);
    else post.likes.push(req.userId);
    
    await post.save();
    res.json({ liked: !liked, likeCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.user.toString() !== req.userId) return res.status(403).json({ error: 'Unauthorized' });

    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
