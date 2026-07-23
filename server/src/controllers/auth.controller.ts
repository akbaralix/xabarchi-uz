import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { botAuthService } from '../services/bot.service.js';
import { UserModel, IUser } from '../models/User.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const AUTH_COOKIE_NAME = 'xabarchi_auth';
const REFRESH_COOKIE_NAME = 'xabarchi_refresh';
const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

const signAccessToken = (userId: string) => {
  return jwt.sign({ userId, type: 'access' }, config.jwtSecret, { expiresIn: '7d' });
};

const signRefreshToken = (userId: string) => {
  return jwt.sign({ userId, type: 'refresh' }, config.jwtSecret, { expiresIn: '30d' });
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  };

  res.cookie(AUTH_COOKIE_NAME, accessToken, cookieOptions);
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
};

const serializeUser = (user: IUser) => ({
  id: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName || '',
  username: user.username || `user_${user._id.toString().substring(0, 6)}`,
  phone: user.phone || '',
  avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user._id.toString()}`,
  bio: user.bio || '',
  isOnline: user.isOnline !== false,
  allowCalls: user.allowCalls !== false
});

export const initTelegramAuth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const code = botAuthService.createAuthSession();
    const botUsername = config.telegramBotUsername || 'XabarchiAuthBot';
    const botUrl = `https://t.me/${botUsername}?start=${code}`;

    res.json({
      success: true,
      code,
      botUrl,
      message: "Telegram bot auth sessiyasi yaratildi",
    });
  } catch (error) {
    next(error);
  }
};

export const checkTelegramAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.params;
    const cleanCode = code ? code.trim() : '';
    const session = botAuthService.checkAuthSession(cleanCode);

    if (session && session.status === 'authenticated' && session.userId) {
      const user = await UserModel.findById(session.userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
        return;
      }

      const accessToken = signAccessToken(user._id.toString());
      const refreshToken = signRefreshToken(user._id.toString());
      user.refreshToken = refreshToken;
      await user.save();

      setAuthCookies(res, accessToken, refreshToken);

      res.json({
        success: true,
        status: 'authenticated',
        token: accessToken,
        refreshToken,
        user: serializeUser(user),
      });
      return;
    }

    res.json({
      success: true,
      status: 'pending',
      message: 'Kutilmoqda...',
    });
  } catch (error) {
    next(error);
  }
};

const GoogleAuthSchema = z.object({
  googleId: z.string().min(1, 'Google ID majburiy'),
  email: z.string().email('Noto\'g\'ri email formati'),
  name: z.string().min(1, 'Ism majburiy'),
  picture: z.string().optional()
});

export const googleLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parsed = GoogleAuthSchema.parse(req.body);
    const { googleId, email, name, picture } = parsed;

    let user = await UserModel.findOne({
      $or: [{ googleId }, { phone: email }]
    });

    if (!user) {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');

      user = await UserModel.create({
        googleId,
        firstName,
        lastName,
        username: baseUsername,
        phone: email,
        avatarUrl: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        bio: 'Google hisobi orqali tizimga kirdi ✨',
        isOnline: true,
        allowCalls: true
      });
    } else {
      user.isOnline = true;
      if (picture && !user.avatarUrl) user.avatarUrl = picture;
      await user.save();
    }

    const accessToken = signAccessToken(user._id.toString());
    const refreshToken = signRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Google hisobi orqali muvaffaqiyatli kirildi',
      token: accessToken,
      refreshToken,
      user: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

const PhoneAuthSchema = z.object({
  phoneNumber: z.string().min(7, 'Telefon raqam noto\'g\'ri')
});

export const sendCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber } = PhoneAuthSchema.parse(req.body);

    res.json({
      success: true,
      message: 'OTP tasdiqlash kodi telefoningizga yuborildi',
      phoneNumber
    });
  } catch (error) {
    next(error);
  }
};

const VerifyCodeSchema = z.object({
  phoneNumber: z.string().min(7, 'Telefon raqam noto\'g\'ri'),
  code: z.string().min(4, 'Kod kamida 4 xonali bo\'lishi kerak'),
  firstName: z.string().optional()
});

export const verifyCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phoneNumber, code, firstName } = VerifyCodeSchema.parse(req.body);

    let user = await UserModel.findOne({ phone: phoneNumber });
    if (!user) {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      user = await UserModel.create({
        phone: phoneNumber,
        firstName: firstName || `Foydalanuvchi_${cleanPhone.slice(-4)}`,
        username: `user_${cleanPhone.slice(-6)}`,
        bio: 'Telefon raqam orqali kirdi',
        isOnline: true,
        allowCalls: true
      });
    } else {
      user.isOnline = true;
      await user.save();
    }

    const accessToken = signAccessToken(user._id.toString());
    const refreshToken = signRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Tizimga muvaffaqiyatli kirildi',
      token: accessToken,
      refreshToken,
      user: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
      return;
    }
    res.json({ success: true, user: serializeUser(req.user) });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (req.user) {
      req.user.isOnline = false;
      req.user.refreshToken = undefined;
      await req.user.save();
    }

    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    res.json({ success: true, message: 'Tizimdan chiqildi' });
  } catch (error) {
    next(error);
  }
};

const UpdateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  username: z.string().min(3).max(32).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().optional(),
  allowCalls: z.boolean().optional()
});

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
      return;
    }

    const updates = UpdateProfileSchema.parse(req.body);

    if (updates.username && updates.username !== req.user.username) {
      const existing = await UserModel.findOne({ username: updates.username });
      if (existing) {
        res.status(400).json({ success: false, message: 'Ushbu username band' });
        return;
      }
    }

    Object.assign(req.user, updates);
    await req.user.save();

    res.json({
      success: true,
      message: 'Profil muvaffaqiyatli yangilandi',
      user: serializeUser(req.user)
    });
  } catch (error) {
    next(error);
  }
};
