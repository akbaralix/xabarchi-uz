"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pinMessage = exports.toggleReaction = exports.deleteMessage = exports.editMessage = exports.uploadMedia = exports.sendMessage = exports.getMessages = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Message_js_1 = require("../models/Message.js");
const Chat_js_1 = require("../models/Chat.js");
const supabase_service_js_1 = require("../services/supabase.service.js");
const getMessages = async (req, res) => {
    const { chatId } = req.params;
    try {
        let messages = [];
        try {
            if (chatId === 'chat_saved' || chatId.startsWith('chat_saved')) {
                messages = await Message_js_1.MessageModel.find({
                    $or: [{ chatId: 'chat_saved' }, { chatId: { $regex: /^chat_saved/ } }]
                }).sort({ createdAt: 1 });
            }
            else {
                messages = await Message_js_1.MessageModel.find({ chatId }).sort({ createdAt: 1 });
            }
        }
        catch (dbErr) {
            console.warn('[MongoDB Messages Get Warning]:', dbErr);
        }
        res.json({ success: true, messages });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getMessages = getMessages;
const sendMessage = async (req, res) => {
    const { chatId, text, senderId, senderName, replyTo, media } = req.body;
    const timeNow = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    let chat = null;
    try {
        if (chatId === 'chat_saved' || chatId.startsWith('chat_saved')) {
            chat = await Chat_js_1.ChatModel.findOne({ type: 'saved' });
        }
        else if (mongoose_1.default.Types.ObjectId.isValid(chatId)) {
            chat = await Chat_js_1.ChatModel.findById(chatId);
        }
        else {
            chat = await Chat_js_1.ChatModel.findOne({ username: chatId });
        }
    }
    catch {
        // Ignore error
    }
    const views = chat?.type === 'channel' ? 1 : 0;
    let savedMessage = null;
    try {
        savedMessage = await Message_js_1.MessageModel.create({
            chatId,
            senderId: senderId || 'usr_me',
            senderName: senderName || 'Siz',
            text: text || '',
            time: timeNow,
            date: 'Bugun',
            isOutgoing: true,
            status: 'delivered',
            replyTo,
            media,
            views
        });
        // Update last message in chat
        if (chat) {
            chat.lastMessage = text || (media ? `[${media.type === 'image' ? 'Rasm' : media.type === 'voice' ? 'Ovozli xabar' : 'Fayl'}]` : '');
            chat.time = timeNow;
            await chat.save();
        }
    }
    catch (dbErr) {
        console.warn('[MongoDB Message Save Warning]:', dbErr);
    }
    const msgData = savedMessage ? {
        id: savedMessage._id.toString(),
        chatId: savedMessage.chatId,
        senderId: savedMessage.senderId,
        senderName: savedMessage.senderName,
        text: savedMessage.text,
        time: savedMessage.time,
        date: savedMessage.date,
        isOutgoing: savedMessage.isOutgoing,
        status: savedMessage.status,
        replyTo: savedMessage.replyTo,
        media: savedMessage.media,
        views: savedMessage.views
    } : {
        id: 'm_' + Date.now(),
        chatId,
        senderId: senderId || 'usr_me',
        senderName: senderName || 'Siz',
        text: text || '',
        time: timeNow,
        date: 'Bugun',
        isOutgoing: true,
        status: 'delivered',
        replyTo,
        media,
        views
    };
    res.json({ success: true, message: msgData });
};
exports.sendMessage = sendMessage;
// Upload media file to Supabase Storage
const uploadMedia = async (req, res) => {
    try {
        const { base64Data, fileName, mimeType } = req.body;
        if (!base64Data) {
            res.status(400).json({ success: false, message: "Fayl ma'lumoti kiritilmadi" });
            return;
        }
        const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const publicUrl = await (0, supabase_service_js_1.uploadImageToSupabase)(buffer, fileName || 'rasm.jpg', mimeType || 'image/jpeg');
        res.json({
            success: true,
            url: publicUrl,
            message: "Rasm Supabase Omboriga muvaffaqiyatli yuklandi! 📸"
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.uploadMedia = uploadMedia;
const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { text } = req.body;
        const message = await Message_js_1.MessageModel.findById(messageId);
        if (!message) {
            res.status(404).json({ success: false, message: 'Xabar topilmadi' });
            return;
        }
        message.text = text;
        message.isEdited = true;
        message.editedAt = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        await message.save();
        res.json({ success: true, message });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.editMessage = editMessage;
const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        await Message_js_1.MessageModel.findByIdAndDelete(messageId);
        res.json({ success: true, messageId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteMessage = deleteMessage;
const toggleReaction = async (req, res) => {
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
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.toggleReaction = toggleReaction;
const pinMessage = async (req, res) => {
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
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.pinMessage = pinMessage;
