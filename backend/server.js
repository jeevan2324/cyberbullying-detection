require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/chat', require('./routes/chat'));

// Socket.io for Real-time Chat
const Message = require('./models/Message');
const User = require('./models/User');

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
  });

  socket.on('sendMessage', async (data) => {
    try {
      const { senderId, receiverId, message } = data;
      
      // Basic anti-spam: check if they follow each other or limited messages
      const sender = await User.findById(senderId);
      const isFollowing = sender.following.includes(receiverId);

      if (!isFollowing) {
        // Here we could implement the anti-spam rule (e.g. limit to 5 messages)
        const msgCount = await Message.countDocuments({ senderId, receiverId });
        if (msgCount >= 5) {
          return socket.emit('error', { message: 'Anti-Spam: Message limit exceeded for non-followers.' });
        }
      }

      const newMessage = new Message({ senderId, receiverId, message });
      await newMessage.save();

      io.to(receiverId).emit('receiveMessage', newMessage);
      socket.emit('messageSent', newMessage);
    } catch (error) {
      console.error(error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/justpost')
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error('MongoDB connection error:', err));
