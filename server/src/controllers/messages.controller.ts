import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { MessageModel, IMessage } from '../models/Message.js';
import { ChatModel } from '../models/Chat.js';
import { uploadImageToSupabase } from '../services/supabase.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const serializeMessage = (message: IMessage, currentUserId?: string) => {
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

export const getMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user?._id?.toString();

    let targetChatId = chatId;
    if (chatId === 'chat_saved' && currentUserId) {
      const savedChat = await ChatModel.findOne({ ownerId: currentUserId, type: 'saved' });
      if (savedChat) targetChatId = savedChat._id.toString();
    }

    const messages = await MessageModel.find({ chatId: targetChatId }).sort({ createdAt: 1 });
    res.json({
      success: true,
      messages: messages.map((m) => serializeMessage(m, currentUserId))
    });
  } catch (error) {
    next(error);
  }
};

const SendMessageSchema = z.object({
  chatId: z.string().min(1, 'ChatId kiritilishi shart'),
  text: z.string().optional().default(''),
  replyTo: z.object({
    id: z.string(),
    senderName: z.string(),
    text: z.string()
  }).optional(),
  media: z.object({
    type: z.enum(['image', 'voice', 'file']),
    url: z.string(),
    name: z.string().optional(),
    duration: z.string().optional(),
    size: z.string().optional()
  }).optional()
});

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
      return;
    }

    const parsed = SendMessageSchema.parse(req.body);
    let { chatId, text, replyTo, media } = parsed;

    const timeNow = new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    let chat: any = null;
    if (chatId === 'chat_saved') {
      chat = await ChatModel.findOne({ ownerId: user._id.toString(), type: 'saved' });
      if (chat) chatId = chat._id.toString();
    } else if (mongoose.Types.ObjectId.isValid(chatId)) {
      chat = await ChatModel.findById(chatId);
    } else {
      chat = await ChatModel.findOne({ username: chatId });
      if (chat) chatId = chat._id.toString();
    }

    const views = chat?.type === 'channel' ? 1 : 0;
    const senderName = `${user.firstName} ${user.lastName || ''}`.trim();

    const savedMessage = await MessageModel.create({
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
  } catch (error) {
    next(error);
  }
};

export const uploadMedia = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { base64Data, fileName, mimeType } = req.body;
    if (!base64Data) {
      res.status(400).json({ success: false, message: "Fayl ma'lumoti kiritilmadi" });
      return;
    }

    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    const publicUrl = await uploadImageToSupabase(buffer, fileName || 'media.jpg', mimeType || 'image/jpeg');

    res.json({
      success: true,
      url: publicUrl,
      message: "Fayl muvaffaqiyatli yuklandi"
    });
  } catch (error) {
    next(error);
  }
};

export const editMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user?._id?.toString();

    const message = await MessageModel.findById(messageId);
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
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user?._id?.toString();

    const message = await MessageModel.findById(messageId);
    if (!message) {
      res.status(404).json({ success: false, message: 'Xabar topilmadi' });
      return;
    }

    if (message.senderId !== userId) {
      res.status(403).json({ success: false, message: 'Faqat o\'z xabaringizni o\'chirishingiz mumkin' });
      return;
    }

    await MessageModel.findByIdAndDelete(messageId);
    res.json({ success: true, messageId });
  } catch (error) {
    next(error);
  }
};

export const toggleReaction = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
  } catch (error) {
    next(error);
  }
};

export const pinMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
  } catch (error) {
    next(error);
  }
};
