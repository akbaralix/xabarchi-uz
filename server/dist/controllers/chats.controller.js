"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleMuteChat = exports.togglePinChat = exports.getPublicChatMessages = exports.leaveChat = exports.joinChat = exports.openDirectChatByUsername = exports.getPublicChatByUsername = exports.createChat = exports.checkUsernameAvailability = exports.getChats = void 0;
const zod_1 = require("zod");
const Chat_js_1 = require("../models/Chat.js");
const User_js_1 = require("../models/User.js");
const Message_js_1 = require("../models/Message.js");
const normalizeUsername = (value) => value.trim().replace(/^@+/, '').toLowerCase();
const isValidUsername = (value) => /^[a-z0-9_]{3,32}$/.test(value);
const serializeChat = (chat, viewerId) => {
    const members = Array.isArray(chat.members) ? chat.members.map((m) => m.toString()) : [];
    const viewerJoined = viewerId ? members.includes(viewerId) : false;
    return {
        id: chat._id.toString(),
        name: chat.name,
        type: chat.type,
        avatar: chat.avatar || '',
        lastMessage: chat.lastMessage || '',
        time: chat.time || '',
        unreadCount: chat.unreadCount ?? 0,
        isPinned: Boolean(chat.isPinned),
        isMuted: Boolean(chat.isMuted),
        folder: chat.folder,
        membersCount: members.length || chat.membersCount || 1,
        description: chat.description || '',
        username: chat.username || '',
        isPublic: Boolean(chat.isPublic),
        ownerId: chat.ownerId,
        viewerJoined
    };
};
const getChats = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString();
        if (!userId) {
            res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
            return;
        }
        // Ensure Saved Messages chat exists for user
        let savedChat = await Chat_js_1.ChatModel.findOne({ ownerId: userId, type: 'saved' });
        if (!savedChat) {
            savedChat = await Chat_js_1.ChatModel.create({
                name: 'Saqlangan xabarlar',
                type: 'saved',
                ownerId: userId,
                members: [userId],
                membersCount: 1,
                lastMessage: 'Shaxsiy eslatmalaringiz va xabarlaringiz',
                time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
                unreadCount: 0,
                isPinned: true,
                isMuted: false,
                folder: 'personal',
                description: `Sizning shaxsiy saqlangan xabarlaringiz va fayllaringiz, ${req.user?.firstName}.`
            });
        }
        // Find chats where user is member or public channels/groups
        const userChats = await Chat_js_1.ChatModel.find({
            $or: [
                { members: userId },
                { ownerId: userId },
                { type: 'saved', ownerId: userId }
            ]
        }).sort({ updatedAt: -1 });
        res.json({
            success: true,
            chats: userChats.map((chat) => serializeChat(chat, userId))
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getChats = getChats;
const checkUsernameAvailability = async (req, res, next) => {
    try {
        const username = normalizeUsername(req.params.username || '');
        if (!isValidUsername(username)) {
            res.json({
                success: true,
                available: false,
                reason: 'invalid',
                message: "Username faqat 3-32 ta kichik harf, raqam yoki '_' dan iborat bo'lishi kerak"
            });
            return;
        }
        const existingChat = await Chat_js_1.ChatModel.findOne({ username });
        const existingUser = await User_js_1.UserModel.findOne({ username });
        if (existingChat || existingUser) {
            res.json({
                success: true,
                available: false,
                reason: 'taken',
                message: 'Bu username band'
            });
            return;
        }
        res.json({ success: true, available: true });
    }
    catch (error) {
        next(error);
    }
};
exports.checkUsernameAvailability = checkUsernameAvailability;
const CreateChatSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Chat nomi kiritilishi shart'),
    type: zod_1.z.enum(['group', 'channel']),
    avatar: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    username: zod_1.z.string().optional(),
    isPublic: zod_1.z.boolean().optional()
});
const createChat = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString();
        if (!userId) {
            res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
            return;
        }
        const parsed = CreateChatSchema.parse(req.body);
        const { name, type, avatar, description, username, isPublic } = parsed;
        const normalizedUsername = username ? normalizeUsername(username) : '';
        if (normalizedUsername) {
            if (!isValidUsername(normalizedUsername)) {
                res.status(400).json({ success: false, message: "Username noto'g'ri formatda" });
                return;
            }
            const existingChat = await Chat_js_1.ChatModel.findOne({ username: normalizedUsername });
            if (existingChat) {
                res.status(409).json({ success: false, message: 'Bu username band' });
                return;
            }
        }
        const folder = type === 'group' ? 'groups' : 'channels';
        const createdChat = await Chat_js_1.ChatModel.create({
            name,
            type,
            avatar: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
            description,
            username: normalizedUsername || undefined,
            ownerId: userId,
            lastMessage: type === 'channel' ? 'Kanal yaratildi' : 'Guruh yaratildi',
            time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
            unreadCount: 0,
            isPinned: false,
            isMuted: false,
            folder,
            members: [userId],
            membersCount: 1,
            isPublic: typeof isPublic === 'boolean' ? isPublic : true
        });
        res.json({ success: true, chat: serializeChat(createdChat, userId) });
    }
    catch (error) {
        next(error);
    }
};
exports.createChat = createChat;
const getPublicChatByUsername = async (req, res, next) => {
    try {
        const username = normalizeUsername(req.params.username || '');
        const userId = req.user?._id?.toString();
        // 1. Group or Channel
        const chat = await Chat_js_1.ChatModel.findOne({ username });
        if (chat && (chat.type === 'group' || chat.type === 'channel')) {
            res.json({
                success: true,
                targetType: 'chat',
                chat: serializeChat(chat, userId)
            });
            return;
        }
        // 2. User
        const dbUser = await User_js_1.UserModel.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (dbUser) {
            res.json({
                success: true,
                targetType: 'user',
                user: {
                    id: dbUser._id.toString(),
                    firstName: dbUser.firstName,
                    lastName: dbUser.lastName || '',
                    username: dbUser.username || username,
                    avatarUrl: dbUser.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
                    bio: dbUser.bio || 'Xabarchi ilovasidan foydalanmoqda ✨',
                    isOnline: dbUser.isOnline !== false,
                    allowCalls: dbUser.allowCalls !== false
                }
            });
            return;
        }
        res.status(404).json({ success: false, message: 'Foydalanuvchi yoki chat topilmadi' });
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicChatByUsername = getPublicChatByUsername;
const openDirectChatByUsername = async (req, res, next) => {
    try {
        const username = normalizeUsername(req.params.username || '');
        const userId = req.user?._id?.toString();
        if (!userId) {
            res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
            return;
        }
        // If opening direct chat with self, return Saved Messages chat
        if (req.user?.username && normalizeUsername(req.user.username) === username) {
            let savedChat = await Chat_js_1.ChatModel.findOne({ ownerId: userId, type: 'saved' });
            if (!savedChat) {
                savedChat = await Chat_js_1.ChatModel.create({
                    name: 'Saqlangan xabarlar',
                    type: 'saved',
                    ownerId: userId,
                    members: [userId],
                    membersCount: 1,
                    lastMessage: 'Shaxsiy eslatmalaringiz va xabarlaringiz',
                    time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
                    unreadCount: 0,
                    isPinned: true,
                    folder: 'personal'
                });
            }
            res.json({ success: true, chat: serializeChat(savedChat, userId) });
            return;
        }
        // Find target user in DB
        const targetUser = await User_js_1.UserModel.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'Bunday username bilan foydalanuvchi topilmadi' });
            return;
        }
        const targetUserId = targetUser._id.toString();
        // Check if direct chat already exists between these 2 users
        let chat = await Chat_js_1.ChatModel.findOne({
            type: 'user',
            members: { $all: [userId, targetUserId] }
        });
        if (!chat) {
            chat = await Chat_js_1.ChatModel.create({
                name: `${targetUser.firstName} ${targetUser.lastName || ''}`.trim(),
                type: 'user',
                avatar: targetUser.avatarUrl,
                username: targetUser.username,
                description: targetUser.bio,
                ownerId: userId,
                members: [userId, targetUserId],
                membersCount: 2,
                lastMessage: 'Muloqot boshlandi',
                time: new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
                folder: 'personal'
            });
        }
        res.json({ success: true, chat: serializeChat(chat, userId) });
    }
    catch (error) {
        next(error);
    }
};
exports.openDirectChatByUsername = openDirectChatByUsername;
const joinChat = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString();
        if (!userId) {
            res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
            return;
        }
        const chat = await Chat_js_1.ChatModel.findById(req.params.chatId);
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        const memberIds = Array.isArray(chat.members) ? chat.members.map((m) => m.toString()) : [];
        if (!memberIds.includes(userId)) {
            memberIds.push(userId);
            chat.members = memberIds;
            chat.membersCount = memberIds.length;
            await chat.save();
        }
        res.json({ success: true, chat: serializeChat(chat, userId) });
    }
    catch (error) {
        next(error);
    }
};
exports.joinChat = joinChat;
const leaveChat = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString();
        if (!userId) {
            res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
            return;
        }
        const chat = await Chat_js_1.ChatModel.findById(req.params.chatId);
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        const memberIds = Array.isArray(chat.members) ? chat.members.map((m) => m.toString()) : [];
        const nextMembers = memberIds.filter((id) => id !== userId);
        chat.members = nextMembers;
        chat.membersCount = nextMembers.length;
        await chat.save();
        res.json({ success: true, chat: serializeChat(chat, userId) });
    }
    catch (error) {
        next(error);
    }
};
exports.leaveChat = leaveChat;
const getPublicChatMessages = async (req, res, next) => {
    try {
        const username = normalizeUsername(req.params.username || '');
        const chat = await Chat_js_1.ChatModel.findOne({ username });
        if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        const messages = await Message_js_1.MessageModel.find({ chatId: chat._id.toString() }).sort({ createdAt: 1 });
        res.json({ success: true, messages });
    }
    catch (error) {
        next(error);
    }
};
exports.getPublicChatMessages = getPublicChatMessages;
const togglePinChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat_js_1.ChatModel.findById(chatId);
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        chat.isPinned = !chat.isPinned;
        await chat.save();
        res.json({ success: true, isPinned: chat.isPinned });
    }
    catch (error) {
        next(error);
    }
};
exports.togglePinChat = togglePinChat;
const toggleMuteChat = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const chat = await Chat_js_1.ChatModel.findById(chatId);
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        chat.isMuted = !chat.isMuted;
        await chat.save();
        res.json({ success: true, isMuted: chat.isMuted });
    }
    catch (error) {
        next(error);
    }
};
exports.toggleMuteChat = toggleMuteChat;
