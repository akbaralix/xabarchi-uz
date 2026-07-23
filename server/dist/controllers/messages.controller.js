"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pinMessage = exports.toggleReaction = exports.deleteMessage = exports.editMessage = exports.uploadMedia = exports.sendMessage = exports.getMessages = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const Message_js_1 = require("../models/Message.js");
const Chat_js_1 = require("../models/Chat.js");
const supabase_service_js_1 = require("../services/supabase.service.js");
const serializeMessage = (message, currentUserId) => {
    return {
        id: message._id.toString(),
        chatId: message.chatId,
        senderId: message.senderId,
        senderName: message.senderName || '',
        text: message.text || '',
        time: message.time,
        date: message.date || 'Bugun',
        isOutgoing: currentUserId ? message.senderId === currentUserId : message.isOutgoing,
        status: message.status,
        reactions: message.reactions || [],
        replyTo: message.replyTo,
        media: message.media,
        isPinned: Boolean(message.isPinned),
        views: message.views || 0,
        isEdited: Boolean(message.isEdited),
        editedAt: message.editedAt
    };
};
const getMessages = async (req, res, next) => {
    try {
        const { chatId } = req.params;
        const currentUserId = req.user?._id?.toString();
        let targetChatId = chatId;
        if (chatId === 'chat_saved' && currentUserId) {
            const savedChat = await Chat_js_1.ChatModel.findOne({ ownerId: currentUserId, type: 'saved' });
            if (savedChat)
                targetChatId = savedChat._id.toString();
        }
        const messages = await Message_js_1.MessageModel.find({ chatId: targetChatId }).sort({ createdAt: 1 });
        res.json({
            success: true,
            messages: messages.map((m) => serializeMessage(m, currentUserId))
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMessages = getMessages;
const SendMessageSchema = zod_1.z.object({
    chatId: zod_1.z.string().min(1, 'ChatId kiritilishi shart'),
    text: zod_1.z.string().optional().default(''),
    replyTo: zod_1.z.object({
        id: zod_1.z.string(),
        senderName: zod_1.z.string(),
        text: zod_1.z.string()
    }).optional(),
    media: zod_1.z.object({
        type: zod_1.z.enum(['image', 'voice', 'file']),
        url: zod_1.z.string(),
        name: zod_1.z.string().optional(),
        duration: zod_1.z.string().optional(),
        size: zod_1.z.string().optional()
    }).optional()
});
const sendMessage = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
            return;
        }
        const parsed = SendMessageSchema.parse(req.body);
        let { chatId, text, replyTo, media } = parsed;
        const timeNow = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        let chat = null;
        if (chatId === 'chat_saved') {
            chat = await Chat_js_1.ChatModel.findOne({ ownerId: user._id.toString(), type: 'saved' });
            if (chat)
                chatId = chat._id.toString();
        }
        else if (mongoose_1.default.Types.ObjectId.isValid(chatId)) {
            chat = await Chat_js_1.ChatModel.findById(chatId);
        }
        else {
            chat = await Chat_js_1.ChatModel.findOne({ username: chatId });
            if (chat)
                chatId = chat._id.toString();
        }
        const views = chat?.type === 'channel' ? 1 : 0;
        const senderName = `${user.firstName} ${user.lastName || ''}`.trim();
        const savedMessage = await Message_js_1.MessageModel.create({
            chatId,
            senderId: user._id.toString(),
            senderName,
            text,
            time: timeNow,
            date: 'Bugun',
            isOutgoing: true,
            status: 'delivered',
            replyTo,
            media,
            views
        });
        if (chat) {
            chat.lastMessage = text || (media ? `[${media.type === 'image' ? 'Rasm' : media.type === 'voice' ? 'Ovozli xabar' : 'Fayl'}]` : '');
            chat.time = timeNow;
            await chat.save();
        }
        res.json({
            success: true,
            message: serializeMessage(savedMessage, user._id.toString())
        });
    }
    catch (error) {
        next(error);
    }
};
exports.sendMessage = sendMessage;
const uploadMedia = async (req, res, next) => {
    try {
        const { base64Data, fileName, mimeType } = req.body;
        if (!base64Data) {
            res.status(400).json({ success: false, message: "Fayl ma'lumoti kiritilmadi" });
            return;
        }
        const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const publicUrl = await (0, supabase_service_js_1.uploadImageToSupabase)(buffer, fileName || 'media.jpg', mimeType || 'image/jpeg');
        res.json({
            success: true,
            url: publicUrl,
            message: "Fayl muvaffaqiyatli yuklandi"
        });
    }
    catch (error) {
        next(error);
    }
};
exports.uploadMedia = uploadMedia;
const editMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;
        const userId = req.user?._id?.toString();
        const message = await Message_js_1.MessageModel.findById(messageId);
        if (!message) {
            res.status(404).json({ success: false, message: 'Xabar topilmadi' });
            return;
        }
        if (message.senderId !== userId) {
            res.status(403).json({ success: false, message: 'Faqat o\'z xabaringizni tahrirlashingiz mumkin' });
            return;
        }
        message.text = text;
        message.isEdited = true;
        message.editedAt = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        await message.save();
        res.json({ success: true, message: serializeMessage(message, userId) });
    }
    catch (error) {
        next(error);
    }
};
exports.editMessage = editMessage;
const deleteMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const userId = req.user?._id?.toString();
        const message = await Message_js_1.MessageModel.findById(messageId);
        if (!message) {
            res.status(404).json({ success: false, message: 'Xabar topilmadi' });
            return;
        }
        if (message.senderId !== userId) {
            res.status(403).json({ success: false, message: 'Faqat o\'z xabaringizni o\'chirishingiz mumkin' });
            return;
        }
        await Message_js_1.MessageModel.findByIdAndDelete(messageId);
        res.json({ success: true, messageId });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMessage = deleteMessage;
const toggleReaction = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const { emoji } = req.body;
        const message = await Message_js_1.MessageModel.findById(messageId);
        if (!message) {
            res.status(404).json({ success: false, message: 'Xabar topilmadi' });
            return;
        }
        const reactions = message.reactions || [];
        const exists = reactions.includes(emoji);
        const updatedReactions = exists
            ? reactions.filter((e) => e !== emoji)
            : [...reactions, emoji];
        message.reactions = updatedReactions;
        await message.save();
        res.json({ success: true, messageId, reactions: updatedReactions });
    }
    catch (error) {
        next(error);
    }
};
exports.toggleReaction = toggleReaction;
const pinMessage = async (req, res, next) => {
    try {
        const { messageId } = req.params;
        const message = await Message_js_1.MessageModel.findById(messageId);
        if (!message) {
            res.status(404).json({ success: false, message: 'Xabar topilmadi' });
            return;
        }
        message.isPinned = !message.isPinned;
        await message.save();
        res.json({ success: true, messageId, isPinned: message.isPinned });
    }
    catch (error) {
        next(error);
    }
};
exports.pinMessage = pinMessage;
