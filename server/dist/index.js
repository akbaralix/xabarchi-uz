"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const index_js_1 = require("./config/index.js");
const db_js_1 = require("./config/db.js");
const auth_controller_js_1 = require("./controllers/auth.controller.js");
const chats_controller_js_1 = require("./controllers/chats.controller.js");
const messages_controller_js_1 = require("./controllers/messages.controller.js");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: (_origin, callback) => callback(null, true),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});
app.use((0, cors_1.default)({
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express_1.default.json({ limit: '50mb' }));
// Connect MongoDB Atlas
(0, db_js_1.connectDB)();
// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        app: 'Xabarchi Express API',
        db: index_js_1.config.mongoUri ? 'MongoDB configured' : 'Fallback mode',
        bot: index_js_1.config.telegramBotToken ? 'Active' : 'Disabled'
    });
});
// Auth Routes
app.post('/api/auth/telegram/init', auth_controller_js_1.initTelegramAuth);
app.get('/api/auth/telegram/check/:code', auth_controller_js_1.checkTelegramAuth);
app.post('/api/auth/google', auth_controller_js_1.googleLogin);
app.post('/api/auth/send-code', auth_controller_js_1.sendCode);
app.post('/api/auth/verify-code', auth_controller_js_1.verifyCode);
app.get('/api/auth/me', auth_controller_js_1.getMe);
app.post('/api/auth/logout', auth_controller_js_1.logout);
app.put('/api/auth/profile', auth_controller_js_1.updateProfile);
// Chat Routes
app.get('/api/chats', chats_controller_js_1.getChats);
app.post('/api/chats', chats_controller_js_1.createChat);
app.post('/api/chats/:chatId/pin', chats_controller_js_1.togglePinChat);
app.post('/api/chats/:chatId/mute', chats_controller_js_1.toggleMuteChat);
app.get('/api/chats/check-username/:username', chats_controller_js_1.checkUsernameAvailability);
app.get('/api/chats/public/:username', chats_controller_js_1.getPublicChatByUsername);
app.get('/api/public/chats/:username', chats_controller_js_1.getPublicChatByUsername);
app.post('/api/chats/open-direct/:username', chats_controller_js_1.openDirectChatByUsername);
app.get('/api/chats/public/:username/messages', chats_controller_js_1.getPublicChatMessages);
app.get('/api/public/chats/:username/messages', chats_controller_js_1.getPublicChatMessages);
app.post('/api/chats/:chatId/join', chats_controller_js_1.joinChat);
app.post('/api/public/chats/:chatId/join', chats_controller_js_1.joinChat);
app.post('/api/chats/:chatId/leave', chats_controller_js_1.joinChat);
app.post('/api/public/chats/:chatId/leave', chats_controller_js_1.leaveChat);
// Message & Media Routes
app.get('/api/chats/:chatId/messages', messages_controller_js_1.getMessages);
app.post('/api/messages', messages_controller_js_1.sendMessage);
app.put('/api/messages/:messageId', messages_controller_js_1.editMessage);
app.delete('/api/messages/:messageId', messages_controller_js_1.deleteMessage);
app.post('/api/messages/:messageId/reaction', messages_controller_js_1.toggleReaction);
app.post('/api/messages/:messageId/pin', messages_controller_js_1.pinMessage);
app.post('/api/upload', messages_controller_js_1.uploadMedia);
// Active Online Users tracking map
const activeOnlineUsers = new Map(); // socketId -> userId
// Socket.io Real-time Event Handlers
io.on('connection', (socket) => {
    console.log(`[Socket.io] Yangi foydalanuvchi ulandi: ${socket.id}`);
    socket.on('registerUser', (userId) => {
        activeOnlineUsers.set(socket.id, userId);
        socket.join(`user_${userId}`);
        io.emit('userOnline', { userId, isOnline: true });
        console.log(`[Socket.io] User registered: ${userId}`);
    });
    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
        console.log(`[Socket.io] ${socket.id} suhbat xonasiga qo'shildi: ${chatId}`);
    });
    socket.on('leaveChat', (chatId) => {
        socket.leave(chatId);
    });
    socket.on('sendMessage', (data) => {
        io.to(data.chatId).emit('newMessage', data);
    });
    socket.on('editMessage', (data) => {
        io.to(data.chatId).emit('messageEdited', data);
    });
    socket.on('deleteMessage', (data) => {
        io.to(data.chatId).emit('messageDeleted', data);
    });
    socket.on('toggleReaction', (data) => {
        io.to(data.chatId).emit('reactionUpdated', data);
    });
    socket.on('pinMessage', (data) => {
        io.to(data.chatId).emit('messagePinned', data);
    });
    socket.on('typing', (data) => {
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
server.listen(index_js_1.config.port, () => {
    console.log(`[Xabarchi Server] Server va Socket.io running on http://localhost:${index_js_1.config.port}`);
});
