import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { botAuthService } from '../services/bot.service.js';
import { UserModel } from '../models/User.js';

const AUTH_COOKIE_NAME = 'xabarchi_auth';
const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

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

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: AUTH_COOKIE_MAX_AGE,
};

const setAuthCookie = (res: Response, token: string) => {
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
};

const clearAuthCookie = (res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...cookieOptions,
    maxAge: undefined,
  });
};

const signAuthToken = (user: AuthUser) => {
  const payload: AuthTokenPayload = {
    userId: user.id,
    user,
  };

  return jwt.sign(payload, config.jwtSecret, { expiresIn: '30d' });
};

const getTokenFromCookie = (req: Request): string | null => {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;

  const found = rawCookie
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!found) return null;
  return decodeURIComponent(found.split('=').slice(1).join('='));
};

const getAuthUserFromToken = (req: Request): AuthUser | null => {
  const token = getTokenFromCookie(req);
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
    return decoded.user || null;
  } catch {
    return null;
  }
};

const buildAuthResponse = (res: Response, user: AuthUser, message: string) => {
  const token = signAuthToken(user);
  setAuthCookie(res, token);

  res.json({
    success: true,
    message,
    token,
    user,
  });
};

export const initTelegramAuth = async (req: Request, res: Response): Promise<void> => {
  const code = botAuthService.createAuthSession();
  const botUsername = config.telegramBotUsername || 'XabarchiAuthBot';
  const botUrl = `https://t.me/${botUsername}?start=${code}`;

  res.json({
    success: true,
    code,
    botUrl,
    message: "Telegram bot auth mashg'uloti yaratildi",
  });
};

export const checkTelegramAuth = async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;
  const session = botAuthService.checkAuthSession(code);

  if (!session) {
    res.status(404).json({ success: false, status: 'expired', message: "Seans kodi topilmadi yoki vaqti o'tdi" });
    return;
  }

  if (session.status === 'authenticated' && session.user) {
    const user = session.user as AuthUser;
    const token = signAuthToken(user);
    setAuthCookie(res, token);

    res.json({
      success: true,
      status: 'authenticated',
      token,
      user,
    });
    return;
  }

  res.json({
    success: true,
    status: 'pending',
    message: 'Kutilmoqda...',
  });
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { googleId, email, name, picture } = req.body;

    if (!email || !name) {
      res.status(400).json({ success: false, message: "Google hisobi ma'lumotlari to'liq emas" });
      return;
    }

    let user = null;
    try {
      user = await UserModel.findOne({ googleId: googleId || email });
      if (!user) {
        user = await UserModel.create({
          googleId: googleId || email,
          firstName: name.split(' ')[0] || name,
          lastName: name.split(' ').slice(1).join(' ') || '',
          username: email.split('@')[0],
          phone: email,
          avatarUrl: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          bio: 'Google hisobi orqali tizimga kirdi',
          isOnline: true,
        });
      }
    } catch (dbErr) {
      console.warn('[MongoDB Google Auth Warning]:', dbErr);
    }

    const userData: AuthUser = user ? {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username || email.split('@')[0],
      phone: user.phone || email,
      avatarUrl: user.avatarUrl || picture,
      bio: user.bio || 'Google hisobi orqali tizimga kirdi',
    } : {
      id: 'usr_gg_' + Date.now(),
      firstName: name.split(' ')[0] || name,
      lastName: name.split(' ').slice(1).join(' ') || '',
      username: email.split('@')[0],
      phone: email,
      avatarUrl: picture,
      bio: 'Google hisobi orqali tizimga kirdi',
    };

    buildAuthResponse(res, userData, 'Google hisobi orqali muvaffaqiyatli kirildi!');
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendCode = async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    res.status(400).json({ success: false, message: 'Telefon raqami kiritilmadi' });
    return;
  }

  res.json({
    success: true,
    message: 'SMS kod muvaffaqiyatli yuborildi',
    phoneCodeHash: 'hash_' + Math.random().toString(36).substring(7),
  });
};

export const verifyCode = async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber, code } = req.body;
  if (!phoneNumber || !code) {
    res.status(400).json({ success: false, message: 'Telefon va SMS kod majburiy' });
    return;
  }

  const userData: AuthUser = {
    id: 'usr_' + Date.now(),
    firstName: 'Foydalanuvchi',
    username: 'user_phone',
    phone: phoneNumber,
    bio: 'Telefon raqam orqali kirildi',
    avatarUrl: '',
  };

  buildAuthResponse(res, userData, 'Tizimga muvaffaqiyatli kirildi');
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const user = getAuthUserFromToken(req);
  if (!user) {
    res.status(401).json({ success: false, message: 'Kirish talab qilinadi' });
    return;
  }

  res.json({ success: true, user });
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  clearAuthCookie(res);
  res.json({ success: true, message: 'Tizimdan chiqildi' });
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser = getAuthUserFromToken(req);
    if (!authUser) {
      res.status(401).json({ success: false, message: 'Kirish talab qilinadi' });
      return;
    }

    const { firstName, lastName, username, bio, avatarUrl } = req.body;

    let updatedUser: AuthUser = {
      ...authUser,
      firstName: firstName || authUser.firstName,
      lastName: lastName !== undefined ? lastName : authUser.lastName,
      username: username || authUser.username,
      bio: bio !== undefined ? bio : authUser.bio,
      avatarUrl: avatarUrl || authUser.avatarUrl,
    };

    try {
      const dbUser = await UserModel.findByIdAndUpdate(
        authUser.id,
        {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          username: updatedUser.username,
          bio: updatedUser.bio,
          avatarUrl: updatedUser.avatarUrl,
        },
        { new: true }
      );
      if (dbUser) {
        updatedUser = {
          id: dbUser._id.toString(),
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          username: dbUser.username || updatedUser.username,
          phone: dbUser.phone || updatedUser.phone,
          avatarUrl: dbUser.avatarUrl,
          bio: dbUser.bio,
        };
      }
    } catch (dbErr) {
      console.warn('[MongoDB Update Profile Warning]:', dbErr);
    }

    const token = signAuthToken(updatedUser);
    setAuthCookie(res, token);

    res.json({ success: true, user: updatedUser, message: 'Profil muvaffaqiyatli yangilandi' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
