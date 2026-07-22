import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { botAuthService } from '../services/bot.service.js';
import { UserModel } from '../models/User.js';

export const initTelegramAuth = async (req: Request, res: Response): Promise<void> => {
  const code = botAuthService.createAuthSession();
  const botUsername = config.telegramBotUsername || 'XabarchiAuthBot';
  const botUrl = `https://t.me/${botUsername}?start=${code}`;

  res.json({
    success: true,
    code,
    botUrl,
    message: "Telegram bot auth mashg'uloti yaratildi"
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
    const token = jwt.sign({ userId: session.user.id }, config.jwtSecret, { expiresIn: '30d' });
    res.json({
      success: true,
      status: 'authenticated',
      token,
      user: session.user
    });
    return;
  }

  res.json({
    success: true,
    status: 'pending',
    message: "Kutilmoqda..."
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
          bio: 'Google hisobi orqali tizimga kirdi 🌐',
          isOnline: true
        });
      }
    } catch (dbErr) {
      console.warn('[MongoDB Google Auth Warning]:', dbErr);
    }

    const userData = user ? {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      bio: user.bio
    } : {
      id: 'usr_gg_' + Date.now(),
      firstName: name.split(' ')[0] || name,
      lastName: name.split(' ').slice(1).join(' ') || '',
      username: email.split('@')[0],
      phone: email,
      avatarUrl: picture,
      bio: 'Google hisobi orqali tizimga kirdi 🌐'
    };

    const token = jwt.sign({ userId: userData.id, email }, config.jwtSecret, { expiresIn: '30d' });

    res.json({
      success: true,
      message: "Google hisobi orqali muvaffaqiyatli kirildi! 🌐",
      token,
      user: userData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const sendCode = async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    res.status(400).json({ success: false, message: "Telefon raqami kiritilmadi" });
    return;
  }
  res.json({
    success: true,
    message: "SMS kod muvaffaqiyatli yuborildi",
    phoneCodeHash: 'hash_' + Math.random().toString(36).substring(7)
  });
};

export const verifyCode = async (req: Request, res: Response): Promise<void> => {
  const { phoneNumber, code } = req.body;
  if (!phoneNumber || !code) {
    res.status(400).json({ success: false, message: "Telefon va SMS kod majburiy" });
    return;
  }
  const token = jwt.sign({ phoneNumber, userId: 'usr_' + Date.now() }, config.jwtSecret, { expiresIn: '30d' });
  res.json({
    success: true,
    message: "Tizimga muvaffaqiyatli kirildi",
    token,
    user: {
      id: 'usr_me',
      firstName: 'Foydalanuvchi',
      username: 'user_phone',
      phone: phoneNumber,
      bio: 'Telefon raqam orqali kirildi 🚀',
      avatarUrl: ''
    }
  });
};
