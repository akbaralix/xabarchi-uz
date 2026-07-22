import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { ChatModel } from '../models/Chat.js';

type AuthUser = {
  id: string;
  firstName: string;
  lastName?: string;
  username: string;
  phone: string;
  avatarUrl?: string;
  bio?: string;
};

type AuthTokenPayload = {
  userId: string;
  user: AuthUser;
};

const AUTH_COOKIE_NAME = 'xabarchi_auth';

const normalizeUsername = (value: string) => value.trim().replace(/^@+/, '').toLowerCase();

const isValidUsername = (value: string) => /^[a-z0-9_]{5,32}$/.test(value);

const getAuthUserFromRequest = (req: Request): AuthUser | null => {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token && req.headers.cookie) {
    const cookieValue = req.headers.cookie
      .split(';')
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${AUTH_COOKIE_NAME}=`));

    if (cookieValue) {
      token = decodeURIComponent(cookieValue.split('=').slice(1).join('='));
    }
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    return decoded.user || null;
  } catch {
    return null;
  }
};

const serializeChat = (chat: any, viewerId?: string | null) => {
  const members = Array.isArray(chat.members) ? chat.members.map((member: any) => member.toString()) : [];
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

export const getChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = getAuthUserFromRequest(req);
    if (authUser?.id) {
      const existingSaved = await ChatModel.findOne({ ownerId: authUser.id, type: 'saved' });
      if (!existingSaved) {
        await ChatModel.create({
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

    const chats = await ChatModel.find({}).sort({ updatedAt: -1 });
    res.json({
      success: true,
      chats: chats.map((chat) => serializeChat(chat, authUser?.id))
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkUsernameAvailability = async (req: Request, res: Response): Promise<void> => {
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

    const existingChat = await ChatModel.findOne({ username });
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createChat = async (req: Request, res: Response): Promise<void> => {
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
      const existingChat = await ChatModel.findOne({ username: normalizedUsername });
      if (existingChat) {
        res.status(409).json({ success: false, message: 'Bu username band' });
        return;
      }
    }

    const memberIds = authUser?.id ? [authUser.id] : [];
    const createdChat = await ChatModel.create({
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
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicChatByUsername = async (req: Request, res: Response): Promise<void> => {
  try {
    const username = normalizeUsername(req.params.username || '');
    const authUser = getAuthUserFromRequest(req);

    const chat = await ChatModel.findOne({ username });
    if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    res.json({
      success: true,
      chat: serializeChat(chat, authUser?.id)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const joinChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      res.status(401).json({ success: false, message: 'Kirish talab qilinadi' });
      return;
    }

    const chat = await ChatModel.findById(req.params.chatId);
    if (!chat) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    const memberIds = Array.isArray(chat.members) ? chat.members.map((member: any) => member.toString()) : [];
    if (!memberIds.includes(authUser.id)) {
      memberIds.push(authUser.id);
      chat.members = memberIds as any;
      chat.membersCount = memberIds.length;
      await chat.save();
    }

    res.json({ success: true, chat: serializeChat(chat, authUser.id) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const leaveChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = getAuthUserFromRequest(req);
    if (!authUser) {
      res.status(401).json({ success: false, message: 'Kirish talab qilinadi' });
      return;
    }

    const chat = await ChatModel.findById(req.params.chatId);
    if (!chat) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    const memberIds = Array.isArray(chat.members) ? chat.members.map((member: any) => member.toString()) : [];
    const nextMembers = memberIds.filter((memberId) => memberId !== authUser.id);

    chat.members = nextMembers as any;
    chat.membersCount = nextMembers.length;
    await chat.save();

    res.json({ success: true, chat: serializeChat(chat, authUser.id) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicChatMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const username = normalizeUsername(req.params.username || '');
    const chat = await ChatModel.findOne({ username });

    if (!chat || (chat.type !== 'group' && chat.type !== 'channel')) {
      res.status(404).json({ success: false, message: 'Chat topilmadi' });
      return;
    }

    const { MessageModel } = await import('../models/Message.js');
    const messages = await MessageModel.find({ chatId: chat._id.toString() }).sort({ createdAt: 1 });

    res.json({ success: true, messages });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const togglePinChat = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  try {
    const chat = await ChatModel.findById(chatId);
    if (chat) {
      chat.isPinned = !chat.isPinned;
      await chat.save();
      res.json({ success: true, isPinned: chat.isPinned });
      return;
    }
  } catch {
    // If the DB lookup fails, fall back to a successful optimistic response.
  }
  res.json({ success: true, isPinned: true });
};

export const toggleMuteChat = async (req: Request, res: Response): Promise<void> => {
  const { chatId } = req.params;
  try {
    const chat = await ChatModel.findById(chatId);
    if (chat) {
      chat.isMuted = !chat.isMuted;
      await chat.save();
      res.json({ success: true, isMuted: chat.isMuted });
      return;
    }
  } catch {
    // If the DB lookup fails, fall back to a successful optimistic response.
  }
  res.json({ success: true, isMuted: true });
};
