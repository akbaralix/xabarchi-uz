import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import {
  initTelegramAuth,
  checkTelegramAuth,
  sendCode,
  verifyCode,
  googleLogin,
  getMe,
  logout,
  updateProfile
} from './controllers/auth.controller.js';
import {
  getChats,
  createChat,
  togglePinChat,
  toggleMuteChat,
  checkUsernameAvailability,
  getPublicChatByUsername,
  joinChat,
  leaveChat,
  getPublicChatMessages
} from './controllers/chats.controller.js';
import {
  getMessages,
  sendMessage,
  uploadMedia,
  editMessage,
  deleteMessage,
  toggleReaction,
  pinMessage
} from './controllers/messages.controller.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

app.use(cors({
  origin: (_origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '50mb' }));

// Connect MongoDB Atlas
connectDB();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Xabarchi Express API',
    db: config.mongoUri ? 'MongoDB configured' : 'Fallback mode',
    bot: config.telegramBotToken ? 'Active' : 'Disabled'
  });
});

// Auth Routes
app.post('/api/auth/telegram/init', initTelegramAuth);
app.get('/api/auth/telegram/check/:code', checkTelegramAuth);
app.post('/api/auth/google', googleLogin);
app.post('/api/auth/send-code', sendCode);
app.post('/api/auth/verify-code', verifyCode);
app.get('/api/auth/me', getMe);
app.post('/api/auth/logout', logout);
app.put('/api/auth/profile', updateProfile);

// Chat Routes
app.get('/api/chats', getChats);
app.post('/api/chats', createChat);
app.post('/api/chats/:chatId/pin', togglePinChat);
app.post('/api/chats/:chatId/mute', toggleMuteChat);
app.get('/api/chats/check-username/:username', checkUsernameAvailability);
app.get('/api/chats/public/:username', getPublicChatByUsername);
app.get('/api/chats/public/:username/messages', getPublicChatMessages);
app.post('/api/chats/:chatId/join', joinChat);
app.post('/api/chats/:chatId/leave', leaveChat);

// Message & Media Routes
app.get('/api/chats/:chatId/messages', getMessages);
app.post('/api/messages', sendMessage);
app.put('/api/messages/:messageId', editMessage);
app.delete('/api/messages/:messageId', deleteMessage);
app.post('/api/messages/:messageId/reaction', toggleReaction);
app.post('/api/messages/:messageId/pin', pinMessage);
app.post('/api/upload', uploadMedia);

// Active Online Users tracking map
const activeOnlineUsers = new Map<string, string>(); // socketId -> userId

// Socket.io Real-time Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.io] Yangi foydalanuvchi ulandi: ${socket.id}`);

  socket.on('registerUser', (userId: string) => {
    activeOnlineUsers.set(socket.id, userId);
    socket.join(`user_${userId}`);
    io.emit('userOnline', { userId, isOnline: true });
    console.log(`[Socket.io] User registered: ${userId}`);
  });

  socket.on('joinChat', (chatId: string) => {
    socket.join(chatId);
    console.log(`[Socket.io] ${socket.id} suhbat xonasiga qo'shildi: ${chatId}`);
  });

  socket.on('leaveChat', (chatId: string) => {
    socket.leave(chatId);
  });

  socket.on('sendMessage', (data: any) => {
    io.to(data.chatId).emit('newMessage', data);
  });

  socket.on('editMessage', (data: any) => {
    io.to(data.chatId).emit('messageEdited', data);
  });

  socket.on('deleteMessage', (data: { chatId: string; messageId: string }) => {
    io.to(data.chatId).emit('messageDeleted', data);
  });

  socket.on('toggleReaction', (data: { chatId: string; messageId: string; reactions: string[] }) => {
    io.to(data.chatId).emit('reactionUpdated', data);
  });

  socket.on('pinMessage', (data: { chatId: string; messageId: string; isPinned: boolean }) => {
    io.to(data.chatId).emit('messagePinned', data);
  });

  socket.on('typing', (data: { chatId: string; username: string; isTyping: boolean }) => {
    socket.to(data.chatId).emit('userTyping', data);
  });

  socket.on('disconnect', () => {
    const userId = activeOnlineUsers.get(socket.id);
    if (userId) {
      activeOnlineUsers.delete(socket.id);
      io.emit('userOffline', { userId, isOnline: false, lastSeen: new Date().toISOString() });
    }
    console.log(`[Socket.io] Foydalanuvchi uzildi: ${socket.id}`);
  });
});

server.listen(config.port, () => {
  console.log(`[Xabarchi Server] Server va Socket.io running on http://localhost:${config.port}`);
});
