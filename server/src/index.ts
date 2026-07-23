import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { authenticateJwt } from './middlewares/auth.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';

import {
  initTelegramAuth,
  checkTelegramAuth,
  googleLogin,
  sendCode,
  verifyCode,
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
  openDirectChatByUsername,
  joinChat,
  leaveChat,
  deleteChat,
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

// Security & Middleware Setup
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Juda ko\'p so' + "'" + 'rov yuborildi, iltimos keyinroq qayta urinib ko' + "'" + 'ring.'
});
app.use('/api/', limiter);

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

// Connect MongoDB
connectDB();

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Xabarchi Express Production API',
    db: config.mongoUri ? 'MongoDB Connected' : 'Fallback',
    bot: config.telegramBotToken ? 'Active' : 'Disabled'
  });
});

// Public Auth Routes
app.post('/api/auth/telegram/init', initTelegramAuth);
app.get('/api/auth/telegram/check/:code', checkTelegramAuth);
app.post('/api/auth/google', googleLogin);
app.post('/api/auth/send-code', sendCode);
app.post('/api/auth/verify-code', verifyCode);

// Public Chat Discovery Routes
app.get('/api/chats/check-username/:username', checkUsernameAvailability);
app.get('/api/chats/public/:username', getPublicChatByUsername);
app.get('/api/public/chats/:username', getPublicChatByUsername);
app.get('/api/chats/public/:username/messages', getPublicChatMessages);
app.get('/api/public/chats/:username/messages', getPublicChatMessages);

// Authenticated Protected Routes
app.use('/api/auth/me', authenticateJwt, getMe);
app.use('/api/auth/logout', authenticateJwt, logout);
app.use('/api/auth/profile', authenticateJwt, updateProfile);

app.get('/api/chats', authenticateJwt, getChats);
app.post('/api/chats', authenticateJwt, createChat);
app.post('/api/chats/:chatId/pin', authenticateJwt, togglePinChat);
app.post('/api/chats/:chatId/mute', authenticateJwt, toggleMuteChat);
app.post('/api/chats/open-direct/:username', authenticateJwt, openDirectChatByUsername);
app.post('/api/chats/:chatId/join', authenticateJwt, joinChat);
app.post('/api/chats/:chatId/leave', authenticateJwt, leaveChat);
app.delete('/api/chats/:chatId', authenticateJwt, deleteChat);

app.get('/api/chats/:chatId/messages', authenticateJwt, getMessages);
app.post('/api/messages', authenticateJwt, sendMessage);
app.put('/api/messages/:messageId', authenticateJwt, editMessage);
app.delete('/api/messages/:messageId', authenticateJwt, deleteMessage);
app.post('/api/messages/:messageId/reaction', authenticateJwt, toggleReaction);
app.post('/api/messages/:messageId/pin', authenticateJwt, pinMessage);
app.post('/api/upload', authenticateJwt, uploadMedia);

// Global Error Middleware
app.use(errorHandler);

// Active Socket & Call tracking
const activeOnlineUsers = new Map<string, string>(); // socketId -> userId
const userSockets = new Map<string, string>(); // userId -> socketId

io.on('connection', (socket) => {
  logger.info(`[Socket.io] Connected: ${socket.id}`);

  socket.on('registerUser', (userId: string) => {
    if (!userId) return;
    activeOnlineUsers.set(socket.id, userId);
    userSockets.set(userId, socket.id);
    socket.join(`user_${userId}`);
    io.emit('userOnline', { userId, isOnline: true });
  });

  socket.on('joinChat', (chatId: string) => {
    socket.join(chatId);
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

  // WebRTC Audio & Video Call Signaling Events
  socket.on('callUser', (data: { targetUserId: string; callerId: string; callerName: string; callerAvatar?: string; isVideo: boolean; signalData: any }) => {
    const targetSocketId = userSockets.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('incomingCall', {
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        isVideo: data.isVideo,
        signalData: data.signalData
      });
    } else {
      socket.emit('callRejected', { reason: 'User offline' });
    }
  });

  socket.on('answerCall', (data: { targetUserId: string; signalData: any }) => {
    const targetSocketId = userSockets.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('callAccepted', { signalData: data.signalData });
    }
  });

  socket.on('iceCandidate', (data: { targetUserId: string; candidate: any }) => {
    const targetSocketId = userSockets.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('iceCandidate', { candidate: data.candidate });
    }
  });

  socket.on('endCall', (data: { targetUserId: string }) => {
    const targetSocketId = userSockets.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('callEnded');
    }
  });

  socket.on('rejectCall', (data: { targetUserId: string }) => {
    const targetSocketId = userSockets.get(data.targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('callRejected', { reason: 'User busy' });
    }
  });

  socket.on('disconnect', () => {
    const userId = activeOnlineUsers.get(socket.id);
    if (userId) {
      activeOnlineUsers.delete(socket.id);
      userSockets.delete(userId);
      io.emit('userOffline', { userId, isOnline: false, lastSeen: new Date().toISOString() });
    }
  });
});

server.listen(config.port, () => {
  logger.info(`[Xabarchi Server] Running on http://localhost:${config.port}`);
});
