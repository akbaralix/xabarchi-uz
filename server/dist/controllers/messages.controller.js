"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMedia = exports.sendMessage = exports.getMessages = void 0;
const Message_js_1 = require("../models/Message.js");
const Chat_js_1 = require("../models/Chat.js");
const supabase_service_js_1 = require("../services/supabase.service.js");
const getMessages = async (req, res) => {
    const { chatId } = req.params;
    try {
        let messages = [];
        try {
            messages = await Message_js_1.MessageModel.find({ chatId }).sort({ createdAt: 1 });
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
            media
        });
        // Update last message in chat
        await Chat_js_1.ChatModel.findByIdAndUpdate(chatId, {
            lastMessage: text || (media ? `[${media.type === 'image' ? 'Rasm' : 'Fayl'}]` : ''),
            time: timeNow
        });
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
        media: savedMessage.media
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
        media
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
