"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleMuteChat = exports.togglePinChat = exports.getPublicChatMessages = exports.leaveChat = exports.joinChat = exports.getPublicChatByUsername = exports.createChat = exports.checkUsernameAvailability = exports.getChats = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const Chat_js_1 = require("../models/Chat.js");
const AUTH_COOKIE_NAME = 'xabarchi_auth';
const normalizeUsername = (value) => value.trim().replace(/^@+/, '').toLowerCase();
const isValidUsername = (value) => /^[a-z0-9_]{5,32}$/.test(value);
const getAuthUserFromRequest = (req) => {
    const rawCookie = req.headers.cookie;
    if (!rawCookie)
        return null;
    const cookieValue = rawCookie
        .split(';')
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (!cookieValue)
        return null;
    const token = decodeURIComponent(cookieValue.split('=').slice(1).join('='));
    try {
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.jwtSecret);
        return decoded.user || null;
    }
    catch {
        return null;
    }
};
const serializeChat = (chat, viewerId) => {
    const members = Array.isArray(chat.members) ? chat.members.map((member) => member.toString()) : [];
    const membersCount = members.length;
    const viewerJoined = viewerId ? members.includes(viewerId) : false;
    return {
        id: chat._id?.toString?.() || chat.id || `chat_${Date.now()}`,
        name: chat.name,
        type: chat.type,
        avatar: chat.avatar,
        lastMessage: chat.lastMessage,
        time: chat.time,
        unreadCount: chat.unreadCount ?? 0,
        isPinned: Boolean(chat.isPinned),
        isMuted: Boolean(chat.isMuted),
        folder: chat.folder,
        membersCount,
        description: chat.description,
        username: chat.username,
        isPublic: Boolean(chat.isPublic),
        ownerId: chat.ownerId,
        viewerJoined
    };
};
const getChats = async (req, res) => {
    try {
        const authUser = getAuthUserFromRequest(req);
        if (authUser?.id) {
            const existingSaved = await Chat_js_1.ChatModel.findOne({ ownerId: authUser.id, type: 'saved' });
            if (!existingSaved) {
                await Chat_js_1.ChatModel.create({
                    name: 'Saqlangan xabarlar',
                    type: 'saved',
                    ownerId: authUser.id,
                    members: [authUser.id],
                    membersCount: 1,
                    lastMessage: 'Shaxsiy eslatmalaringiz va xabarlaringiz',
                    time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
                    unreadCount: 0,
                    isPinned: true,
                    isMuted: false,
                    folder: 'personal',
                    description: `Sizning shaxsiy saqlangan xabarlaringiz va fayllaringiz, ${authUser.firstName}.`
                });
            }
        }
        const chats = await Chat_js_1.ChatModel.find({}).sort({ updatedAt: -1 });
        res.json({
            success: true,
            chats: chats.map((chat) => serializeChat(chat, authUser?.id))
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getChats = getChats;
const checkUsernameAvailability = async (req, res) => {
    try {
        const rawUsername = req.params.username || '';
        const username = normalizeUsername(rawUsername);
        if (!isValidUsername(username)) {
            res.json({
                success: true,
                available: false,
                reason: 'invalid',
                message: "Username faqat 5-32 ta kichik harf, raqam yoki '_' dan iborat bo'lishi kerak"
            });
            return;
        }
        const existingChat = await Chat_js_1.ChatModel.findOne({ username });
        if (existingChat) {
            res.json({
                success: true,
                available: false,
                reason: 'taken',
                message: 'Bu username band'
            });
            return;
        }
        res.json({
            success: true,
            available: true
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.checkUsernameAvailability = checkUsernameAvailability;
const createChat = async (req, res) => {
    try {
        const { name, type, avatar, description, username, isPublic } = req.body;
        const normalizedType = type || 'user';
        const normalizedFolder = normalizedType === 'group' ? 'groups' : normalizedType === 'channel' ? 'channels' : 'personal';
        const authUser = getAuthUserFromRequest(req);
        const normalizedUsername = username ? normalizeUsername(username) : '';
        if ((normalizedType === 'group' || normalizedType === 'channel') && !normalizedUsername) {
            res.status(400).json({ success: false, message: 'Guruh va kanal uchun username majburiy' });
            return;
        }
        if (normalizedUsername && !isValidUsername(normalizedUsername)) {
            res.status(400).json({ success: false, message: "Username noto'g'ri formatda" });
            return;
        }
        if (normalizedUsername) {
            const existingChat = await Chat_js_1.ChatModel.findOne({ username: normalizedUsername });
            if (existingChat) {
                res.status(409).json({ success: false, message: 'Bu username band' });
                return;
            }
        }
        const memberIds = authUser?.id ? [authUser.id] : [];
        const createdChat = await Chat_js_1.ChatModel.create({
            name,
            type: normalizedType,
            avatar,
            description,
            username: normalizedUsername || undefined,
            ownerId: authUser?.id,
            lastMessage: normalizedType === 'channel' ? 'Kanal yaratildi' : normalizedType === 'group' ? 'Guruh yaratildi' : 'Muloqot boshlandi',
            time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
            folder: normalizedFolder,
            members: memberIds,
            membersCount: memberIds.length,
            isPublic: typeof isPublic === 'boolean' ? isPublic : normalizedType === 'channel' || normalizedType === 'group'
        });
        res.json({ success: true, chat: serializeChat(createdChat, authUser?.id) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createChat = createChat;
const getPublicChatByUsername = async (req, res) => {
    try {
        const username = normalizeUsername(req.params.username || '');
        const authUser = getAuthUserFromRequest(req);
        const chat = await Chat_js_1.ChatModel.findOne({ username });
        if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        res.json({
            success: true,
            chat: serializeChat(chat, authUser?.id)
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPublicChatByUsername = getPublicChatByUsername;
const joinChat = async (req, res) => {
    try {
        const authUser = getAuthUserFromRequest(req);
        if (!authUser) {
            res.status(401).json({ success: false, message: 'Kirish talab qilinadi' });
            return;
        }
        const chat = await Chat_js_1.ChatModel.findById(req.params.chatId);
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        const memberIds = Array.isArray(chat.members) ? chat.members.map((member) => member.toString()) : [];
        if (!memberIds.includes(authUser.id)) {
            memberIds.push(authUser.id);
            chat.members = memberIds;
            chat.membersCount = memberIds.length;
            await chat.save();
        }
        res.json({ success: true, chat: serializeChat(chat, authUser.id) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.joinChat = joinChat;
const leaveChat = async (req, res) => {
    try {
        const authUser = getAuthUserFromRequest(req);
        if (!authUser) {
            res.status(401).json({ success: false, message: 'Kirish talab qilinadi' });
            return;
        }
        const chat = await Chat_js_1.ChatModel.findById(req.params.chatId);
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        const memberIds = Array.isArray(chat.members) ? chat.members.map((member) => member.toString()) : [];
        const nextMembers = memberIds.filter((memberId) => memberId !== authUser.id);
        chat.members = nextMembers;
        chat.membersCount = nextMembers.length;
        await chat.save();
        res.json({ success: true, chat: serializeChat(chat, authUser.id) });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.leaveChat = leaveChat;
const getPublicChatMessages = async (req, res) => {
    try {
        const username = normalizeUsername(req.params.username || '');
        const chat = await Chat_js_1.ChatModel.findOne({ username });
        if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        const { MessageModel } = await import('../models/Message.js');
        const messages = await MessageModel.find({ chatId: chat._id.toString() }).sort({ createdAt: 1 });
        res.json({ success: true, messages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPublicChatMessages = getPublicChatMessages;
const togglePinChat = async (req, res) => {
    const { chatId } = req.params;
    try {
        const chat = await Chat_js_1.ChatModel.findById(chatId);
        if (chat) {
            chat.isPinned = !chat.isPinned;
            await chat.save();
            res.json({ success: true, isPinned: chat.isPinned });
            return;
        }
    }
    catch {
        // If the DB lookup fails, fall back to a successful optimistic response.
    }
    res.json({ success: true, isPinned: true });
};
exports.togglePinChat = togglePinChat;
const toggleMuteChat = async (req, res) => {
    const { chatId } = req.params;
    try {
        const chat = await Chat_js_1.ChatModel.findById(chatId);
        if (chat) {
            chat.isMuted = !chat.isMuted;
            await chat.save();
            res.json({ success: true, isMuted: chat.isMuted });
            return;
        }
    }
    catch {
        // If the DB lookup fails, fall back to a successful optimistic response.
    }
    res.json({ success: true, isMuted: true });
};
exports.toggleMuteChat = toggleMuteChat;
