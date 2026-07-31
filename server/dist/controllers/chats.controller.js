"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleMuteChat = exports.togglePinChat = exports.getPublicChatMessages = exports.deleteChat = exports.leaveChat = exports.joinChat = exports.openDirectChatByUsername = exports.getPublicChatByUsername = exports.createChat = exports.searchAll = exports.checkUsernameAvailability = exports.getChats = void 0;
const zod_1 = require("zod");
const Chat_js_1 = require("../models/Chat.js");
const User_js_1 = require("../models/User.js");
const Message_js_1 = require("../models/Message.js");
const auth_controller_js_1 = require("./auth.controller.js");
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
        const currentId = req.query.currentId || req.query.excludeId || '';
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
        const isMatchCurrentChat = existingChat && currentId && existingChat._id.toString() === currentId;
        const isMatchCurrentUser = existingUser && currentId && existingUser._id.toString() === currentId;
        if ((existingChat && !isMatchCurrentChat) || (existingUser && !isMatchCurrentUser)) {
            res.json({
                success: true,
                available: false,
                reason: 'taken',
                message: 'Bu username allaqachon band'
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
const searchAll = async (req, res, next) => {
    try {
        const query = (req.query.q || '').trim();
        if (!query || query.length < 1) {
            res.json({
                success: true,
                users: [],
                channels: [],
                groups: []
            });
            return;
        }
        const isAtSearch = query.startsWith('@');
        const cleanQuery = normalizeUsername(query);
        const regex = new RegExp(cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const userId = req.user?._id?.toString();
        // 1. Search Users
        const usersRaw = await User_js_1.UserModel.find({
            $or: [
                { username: regex },
                { firstName: regex },
                { lastName: regex }
            ]
        }).limit(20);
        const users = usersRaw
            .filter((u) => u._id.toString() !== userId)
            .map((u) => (0, auth_controller_js_1.serializePublicUser)(u));
        // 2. Search Channels
        const channelsRaw = await Chat_js_1.ChatModel.find({
            type: 'channel',
            $or: [
                { name: regex },
                { username: regex }
            ]
        }).limit(20);
        const channels = channelsRaw.map((c) => serializeChat(c, userId));
        // 3. Search Groups
        const groupsRaw = await Chat_js_1.ChatModel.find({
            type: 'group',
            $or: [
                { name: regex },
                { username: regex }
            ]
        }).limit(20);
        const groups = groupsRaw.map((c) => serializeChat(c, userId));
        // If search started with @, sort exact username match to top
        if (isAtSearch && cleanQuery) {
            users.sort((a, b) => (a.username.toLowerCase() === cleanQuery ? -1 : b.username.toLowerCase() === cleanQuery ? 1 : 0));
            channels.sort((a, b) => (a.username.toLowerCase() === cleanQuery ? -1 : b.username.toLowerCase() === cleanQuery ? 1 : 0));
            groups.sort((a, b) => (a.username.toLowerCase() === cleanQuery ? -1 : b.username.toLowerCase() === cleanQuery ? 1 : 0));
        }
        res.json({
            success: true,
            query: cleanQuery,
            isAtSearch,
            users,
            channels,
            groups
        });
    }
    catch (error) {
        next(error);
    }
};
exports.searchAll = searchAll;
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
            const existingUser = await User_js_1.UserModel.findOne({ username: normalizedUsername });
            if (existingChat || existingUser) {
                res.status(409).json({ success: false, message: 'Bu username allaqachon band' });
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
                user: (0, auth_controller_js_1.serializePublicUser)(dbUser)
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
        const targetUser = await User_js_1.UserModel.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (!targetUser) {
            res.status(404).json({ success: false, message: 'Bunday username bilan foydalanuvchi topilmadi' });
            return;
        }
        const targetUserId = targetUser._id.toString();
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
const deleteChat = async (req, res, next) => {
    try {
        const userId = req.user?._id?.toString();
        const { chatId } = req.params;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
            return;
        }
        const chat = await Chat_js_1.ChatModel.findById(chatId);
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        if (chat.type === 'saved') {
            res.status(400).json({ success: false, message: 'Saqlangan xabarlar chatini o\'chirib bo\'lmaydi' });
            return;
        }
        const members = Array.isArray(chat.members) ? chat.members.map((m) => m.toString()) : [];
        const isOwner = chat.ownerId?.toString() === userId;
        const isMember = members.includes(userId);
        if (!isOwner && !isMember) {
            res.status(403).json({ success: false, message: 'Ruxsat berilmadi' });
            return;
        }
        // Remove all messages associated with chatId
        await Message_js_1.MessageModel.deleteMany({ chatId });
        await Chat_js_1.ChatModel.findByIdAndDelete(chatId);
        res.json({ success: true, chatId, message: 'Chat va barcha xabarlar o\'chirildi' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteChat = deleteChat;
const getPublicChatMessages = async (req, res, next) => {
    try {
        const username = normalizeUsername(req.params.username || '');
        const chat = await Chat_js_1.ChatModel.findOne({ username });
        if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        const userId = req.user?._id?.toString();
        const members = Array.isArray(chat.members) ? chat.members.map((m) => m.toString()) : [];
        const isMember = userId ? members.includes(userId) : false;
        if (!chat.isPublic && !isMember) {
            res.status(403).json({ success: false, message: 'Bu chat maxfiy va siz unga a\'zo emassiz' });
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
        const userId = req.user?._id?.toString();
        const { chatId } = req.params;
        const chat = await Chat_js_1.ChatModel.findById(chatId);
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        const members = Array.isArray(chat.members) ? chat.members.map((m) => m.toString()) : [];
        if (userId && !members.includes(userId) && chat.ownerId?.toString() !== userId) {
            res.status(403).json({ success: false, message: 'Ruxsat berilmadi' });
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
        const userId = req.user?._id?.toString();
        const { chatId } = req.params;
        const chat = await Chat_js_1.ChatModel.findById(chatId);
        if (!chat) {
            res.status(404).json({ success: false, message: 'Chat topilmadi' });
            return;
        }
        const members = Array.isArray(chat.members) ? chat.members.map((m) => m.toString()) : [];
        if (userId && !members.includes(userId) && chat.ownerId?.toString() !== userId) {
            res.status(403).json({ success: false, message: 'Ruxsat berilmadi' });
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
