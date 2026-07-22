import { Request, Response } from 'express';
import { MessageModel } from '../models/Message.js';
import { ChatModel } from '../models/Chat.js';
import { uploadImageToSupabase } from '../services/supabase.service.js';

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  try {
    let messages: any[] = [];
    try {
      messages = await MessageModel.find({ chatId }).sort({ createdAt: 1 });
    } catch (dbErr) {
      console.warn('[MongoDB Messages Get Warning]:', dbErr);
    }
    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  const { chatId, text, senderId, senderName, replyTo, media } = req.body;

  const timeNow = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  let savedMessage: any = null;
  try {
    savedMessage = await MessageModel.create({
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
    await ChatModel.findByIdAndUpdate(chatId, {
      lastMessage: text || (media ? `[${media.type === 'image' ? 'Rasm' : 'Fayl'}]` : ''),
      time: timeNow
    });
  } catch (dbErr) {
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

// Upload media file to Supabase Storage
export const uploadMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { base64Data, fileName, mimeType } = req.body;
    if (!base64Data) {
      res.status(400).json({ success: false, message: "Fayl ma'lumoti kiritilmadi" });
      return;
    }

    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const publicUrl = await uploadImageToSupabase(buffer, fileName || 'rasm.jpg', mimeType || 'image/jpeg');

    res.json({
      success: true,
      url: publicUrl,
      message: "Rasm Supabase Omboriga muvaffaqiyatli yuklandi! 📸"
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
