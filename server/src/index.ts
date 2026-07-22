import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { initTelegramAuth, checkTelegramAuth, sendCode, verifyCode, googleLogin } from './controllers/auth.controller.js';
import { getChats, createChat, togglePinChat, toggleMuteChat } from './controllers/chats.controller.js';
import { getMessages, sendMessage, uploadMedia } from './controllers/messages.controller.js';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
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

// Chat Routes
app.get('/api/chats', getChats);
app.post('/api/chats', createChat);
app.post('/api/chats/:chatId/pin', togglePinChat);
app.post('/api/chats/:chatId/mute', toggleMuteChat);

// Message & Media Routes
app.get('/api/chats/:chatId/messages', getMessages);
app.post('/api/messages', sendMessage);
app.post('/api/upload', uploadMedia);

// Socket.io Real-time Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.io] Yangi foydalanuvchi ulandi: ${socket.id}`);

  socket.on('joinChat', (chatId: string) => {
    socket.join(chatId);
    console.log(`[Socket.io] ${socket.id} suhbat xonasiga qo'shildi: ${chatId}`);
  });

  socket.on('sendMessage', (data: any) => {
    io.to(data.chatId).emit('newMessage', data);
  });

  socket.on('typing', (data: { chatId: string; username: string }) => {
    socket.to(data.chatId).emit('userTyping', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Foydalanuvchi uzildi: ${socket.id}`);
  });
});

server.listen(config.port, () => {
  console.log(`[Xabarchi Server] Server va Socket.io running on http://localhost:${config.port}`);
});
