import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { ChatModel, IChat } from '../models/Chat.js';
import { UserModel } from '../models/User.js';
import { MessageModel } from '../models/Message.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const normalizeUsername = (value: string) => value.trim().replace(/^@+/, '').toLowerCase();
const isValidUsername = (value: string) => /^[a-z0-9_]{3,32}$/.test(value);

const serializeChat = (chat: IChat, viewerId?: string) => {
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

export const getChats = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
      return;
    }

    let savedChat = await ChatModel.findOne({ ownerId: userId, type: 'saved' });
    if (!savedChat) {
      savedChat = await ChatModel.create({
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

    const userChats = await ChatModel.find({
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
  } catch (error) {
    next(error);
  }
};

export const checkUsernameAvailability = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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

    const existingChat = await ChatModel.findOne({ username });
    const existingUser = await UserModel.findOne({ username });

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
  } catch (error) {
    next(error);
  }
};

const CreateChatSchema = z.object({
  name: z.string().min(1, 'Chat nomi kiritilishi shart'),
  type: z.enum(['group', 'channel']),
  avatar: z.string().optional(),
  description: z.string().optional(),
  username: z.string().optional(),
  isPublic: z.boolean().optional()
});

export const createChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
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
      const existingChat = await ChatModel.findOne({ username: normalizedUsername });
      if (existingChat) {
        res.status(409).json({ success: false, message: 'Bu username band' });
        return;
      }
    }

    const folder = type === 'group' ? 'groups' : 'channels';
    const createdChat = await ChatModel.create({
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
  } catch (error) {
    next(error);
  }
};

export const getPublicChatByUsername = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const username = normalizeUsername(req.params.username || '');
    const userId = req.user?._id?.toString();

    // 1. Group or Channel
    const chat = await ChatModel.findOne({ username });
    if (chat && (chat.type === 'group' || chat.type === 'channel')) {
      res.json({
        success: true,
        targetType: 'chat',
        chat: serializeChat(chat, userId)
      });
      return;
    }

    // 2. User
    const dbUser = await UserModel.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
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
  } catch (error) {
    next(error);
  }
};

export const openDirectChatByUsername = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const username = normalizeUsername(req.params.username || '');
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
      return;
    }

    if (req.user?.username && normalizeUsername(req.user.username) === username) {
      let savedChat = await ChatModel.findOne({ ownerId: userId, type: 'saved' });
      if (!savedChat) {
        savedChat = await ChatModel.create({
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

    const targetUser = await UserModel.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
    if (!targetUser) {
      res.status(404).json({ success: false, message: 'Bunday username bilan foydalanuvchi topilmadi' });
      return;
    }

    const targetUserId = targetUser._id.toString();

    let chat = await ChatModel.findOne({
      type: 'user',
      members: { $all: [userId, targetUserId] }
    });

    if (!chat) {
      chat = await ChatModel.create({
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
  } catch (error) {
    next(error);
  }
};

export const joinChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
      return;
    }

    const chat = await ChatModel.findById(req.params.chatId);
    if (!chat) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    const memberIds = Array.isArray(chat.members) ? chat.members.map((m) => m.toString()) : [];
    if (!memberIds.includes(userId)) {
      memberIds.push(userId);
      chat.members = memberIds as any;
      chat.membersCount = memberIds.length;
      await chat.save();
    }

    res.json({ success: true, chat: serializeChat(chat, userId) });
  } catch (error) {
    next(error);
  }
};

export const leaveChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
      return;
    }

    const chat = await ChatModel.findById(req.params.chatId);
    if (!chat) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    const memberIds = Array.isArray(chat.members) ? chat.members.map((m) => m.toString()) : [];
    const nextMembers = memberIds.filter((id) => id !== userId);

    chat.members = nextMembers as any;
    chat.membersCount = nextMembers.length;
    await chat.save();

    res.json({ success: true, chat: serializeChat(chat, userId) });
  } catch (error) {
    next(error);
  }
};

export const deleteChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?._id?.toString();
    const { chatId } = req.params;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
      return;
    }

    const chat = await ChatModel.findById(chatId);
    if (!chat) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    if (chat.type === 'saved') {
      res.status(400).json({ success: false, message: 'Saqlangan xabarlar chatini o\'chirib bo\'lmaydi' });
      return;
    }

    // Remove all messages associated with chatId
    await MessageModel.deleteMany({ chatId });
    await ChatModel.findByIdAndDelete(chatId);

    res.json({ success: true, chatId, message: 'Chat va barcha xabarlar o\'chirildi' });
  } catch (error) {
    next(error);
  }
};

export const getPublicChatMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const username = normalizeUsername(req.params.username || '');
    const chat = await ChatModel.findOne({ username });

    if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    const messages = await MessageModel.find({ chatId: chat._id.toString() }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};

export const togglePinChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId } = req.params;
    const chat = await ChatModel.findById(chatId);
    if (!chat) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    chat.isPinned = !chat.isPinned;
    await chat.save();
    res.json({ success: true, isPinned: chat.isPinned });
  } catch (error) {
    next(error);
  }
};

export const toggleMuteChat = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { chatId } = req.params;
    const chat = await ChatModel.findById(chatId);
    if (!chat) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    chat.isMuted = !chat.isMuted;
    await chat.save();
    res.json({ success: true, isMuted: chat.isMuted });
  } catch (error) {
    next(error);
  }
};
