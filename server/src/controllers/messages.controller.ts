import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MessageModel } from '../models/Message.js';
import { ChatModel } from '../models/Chat.js';
import { uploadImageToSupabase } from '../services/supabase.service.js';

export const getMessages = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  try {
    let messages: any[] = [];
    try {
      if (chatId === 'chat_saved' || chatId.startsWith('chat_saved')) {
        messages = await MessageModel.find({
          $or: [{ chatId: 'chat_saved' }, { chatId: { $regex: /^chat_saved/ } }]
        }).sort({ createdAt: 1 });
      } else {
        messages = await MessageModel.find({ chatId }).sort({ createdAt: 1 });
      }
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
  
  let chat: any = null;
  try {
    if (chatId === 'chat_saved' || chatId.startsWith('chat_saved')) {
      chat = await ChatModel.findOne({ type: 'saved' });
    } else if (mongoose.Types.ObjectId.isValid(chatId)) {
      chat = await ChatModel.findById(chatId);
    } else {
      chat = await ChatModel.findOne({ username: chatId });
    }
  } catch {
    // Ignore error
  }

  const views = chat?.type === 'channel' ? 1 : 0;

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
      media,
      views
    });

    // Update last message in chat
    if (chat) {
      chat.lastMessage = text || (media ? `[${media.type === 'image' ? 'Rasm' : media.type === 'voice' ? 'Ovozli xabar' : 'Fayl'}]` : '');
      chat.time = timeNow;
      await chat.save();
    }
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

export const editMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await MessageModel.findById(messageId);
    if (!message) {
      res.status(404).json({ success: false, message: 'Xabar topilmadi' });
      return;
    }

    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    await message.save();

    res.json({ success: true, message });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    await MessageModel.findByIdAndDelete(messageId);
    res.json({ success: true, messageId });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleReaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const message = await MessageModel.findById(messageId);
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const pinMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const message = await MessageModel.findById(messageId);
    if (!message) {
      res.status(404).json({ success: false, message: 'Xabar topilmadi' });
      return;
    }

    message.isPinned = !message.isPinned;
    await message.save();

    res.json({ success: true, messageId, isPinned: message.isPinned });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
