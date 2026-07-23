"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const index_js_1 = require("./config/index.js");
const db_js_1 = require("./config/db.js");
const logger_js_1 = require("./config/logger.js");
const auth_middleware_js_1 = require("./middlewares/auth.middleware.js");
const error_middleware_js_1 = require("./middlewares/error.middleware.js");
const auth_controller_js_1 = require("./controllers/auth.controller.js");
const chats_controller_js_1 = require("./controllers/chats.controller.js");
const messages_controller_js_1 = require("./controllers/messages.controller.js");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
// Security & Middleware Setup
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, morgan_1.default)('dev'));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: 'Juda ko\'p so' + "'" + 'rov yuborildi, iltimos keyinroq qayta urinib ko' + "'" + 'ring.'
});
app.use('/api/', limiter);
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
// Connect MongoDB
(0, db_js_1.connectDB)();
// Health Check
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        app: 'Xabarchi Express Production API',
        db: index_js_1.config.mongoUri ? 'MongoDB Connected' : 'Fallback',
        bot: index_js_1.config.telegramBotToken ? 'Active' : 'Disabled'
    });
});
// Public Auth Routes
app.post('/api/auth/telegram/init', auth_controller_js_1.initTelegramAuth);
app.get('/api/auth/telegram/check/:code', auth_controller_js_1.checkTelegramAuth);
app.post('/api/auth/google', auth_controller_js_1.googleLogin);
app.post('/api/auth/send-code', auth_controller_js_1.sendCode);
app.post('/api/auth/verify-code', auth_controller_js_1.verifyCode);
// Public Chat Discovery Routes
app.get('/api/chats/check-username/:username', chats_controller_js_1.checkUsernameAvailability);
app.get('/api/chats/public/:username', chats_controller_js_1.getPublicChatByUsername);
app.get('/api/public/chats/:username', chats_controller_js_1.getPublicChatByUsername);
app.get('/api/chats/public/:username/messages', chats_controller_js_1.getPublicChatMessages);
app.get('/api/public/chats/:username/messages', chats_controller_js_1.getPublicChatMessages);
// Authenticated Protected Routes
app.use('/api/auth/me', auth_middleware_js_1.authenticateJwt, auth_controller_js_1.getMe);
app.use('/api/auth/logout', auth_middleware_js_1.authenticateJwt, auth_controller_js_1.logout);
app.use('/api/auth/profile', auth_middleware_js_1.authenticateJwt, auth_controller_js_1.updateProfile);
app.get('/api/chats', auth_middleware_js_1.authenticateJwt, chats_controller_js_1.getChats);
app.post('/api/chats', auth_middleware_js_1.authenticateJwt, chats_controller_js_1.createChat);
app.post('/api/chats/:chatId/pin', auth_middleware_js_1.authenticateJwt, chats_controller_js_1.togglePinChat);
app.post('/api/chats/:chatId/mute', auth_middleware_js_1.authenticateJwt, chats_controller_js_1.toggleMuteChat);
app.post('/api/chats/open-direct/:username', auth_middleware_js_1.authenticateJwt, chats_controller_js_1.openDirectChatByUsername);
app.post('/api/chats/:chatId/join', auth_middleware_js_1.authenticateJwt, chats_controller_js_1.joinChat);
app.post('/api/chats/:chatId/leave', auth_middleware_js_1.authenticateJwt, chats_controller_js_1.leaveChat);
app.get('/api/chats/:chatId/messages', auth_middleware_js_1.authenticateJwt, messages_controller_js_1.getMessages);
app.post('/api/messages', auth_middleware_js_1.authenticateJwt, messages_controller_js_1.sendMessage);
app.put('/api/messages/:messageId', auth_middleware_js_1.authenticateJwt, messages_controller_js_1.editMessage);
app.delete('/api/messages/:messageId', auth_middleware_js_1.authenticateJwt, messages_controller_js_1.deleteMessage);
app.post('/api/messages/:messageId/reaction', auth_middleware_js_1.authenticateJwt, messages_controller_js_1.toggleReaction);
app.post('/api/messages/:messageId/pin', auth_middleware_js_1.authenticateJwt, messages_controller_js_1.pinMessage);
app.post('/api/upload', auth_middleware_js_1.authenticateJwt, messages_controller_js_1.uploadMedia);
// Global Error Middleware
app.use(error_middleware_js_1.errorHandler);
// Active Socket & Call tracking
const activeOnlineUsers = new Map(); // socketId -> userId
const userSockets = new Map(); // userId -> socketId
io.on('connection', (socket) => {
    logger_js_1.logger.info(`[Socket.io] Connected: ${socket.id}`);
    socket.on('registerUser', (userId) => {
        if (!userId)
            return;
        activeOnlineUsers.set(socket.id, userId);
        userSockets.set(userId, socket.id);
        socket.join(`user_${userId}`);
        io.emit('userOnline', { userId, isOnline: true });
    });
    socket.on('joinChat', (chatId) => {
        socket.join(chatId);
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
    // WebRTC Audio & Video Call Signaling Events
    socket.on('callUser', (data) => {
        const targetSocketId = userSockets.get(data.targetUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('incomingCall', {
                callerId: data.callerId,
                callerName: data.callerName,
                callerAvatar: data.callerAvatar,
                isVideo: data.isVideo,
                signalData: data.signalData
            });
        }
        else {
            socket.emit('callRejected', { reason: 'User offline' });
        }
    });
    socket.on('answerCall', (data) => {
        const targetSocketId = userSockets.get(data.targetUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('callAccepted', { signalData: data.signalData });
        }
    });
    socket.on('iceCandidate', (data) => {
        const targetSocketId = userSockets.get(data.targetUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('iceCandidate', { candidate: data.candidate });
        }
    });
    socket.on('endCall', (data) => {
        const targetSocketId = userSockets.get(data.targetUserId);
        if (targetSocketId) {
            io.to(targetSocketId).emit('callEnded');
        }
    });
    socket.on('rejectCall', (data) => {
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
server.listen(index_js_1.config.port, () => {
    logger_js_1.logger.info(`[Xabarchi Server] Running on http://localhost:${index_js_1.config.port}`);
});
