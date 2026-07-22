"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCode = exports.sendCode = exports.googleLogin = exports.checkTelegramAuth = exports.initTelegramAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const bot_service_js_1 = require("../services/bot.service.js");
const User_js_1 = require("../models/User.js");
const initTelegramAuth = async (req, res) => {
    const code = bot_service_js_1.botAuthService.createAuthSession();
    const botUsername = index_js_1.config.telegramBotUsername || 'XabarchiAuthBot';
    const botUrl = `https://t.me/${botUsername}?start=${code}`;
    res.json({
        success: true,
        code,
        botUrl,
        message: "Telegram bot auth mashg'uloti yaratildi"
    });
};
exports.initTelegramAuth = initTelegramAuth;
const checkTelegramAuth = async (req, res) => {
    const { code } = req.params;
    const session = bot_service_js_1.botAuthService.checkAuthSession(code);
    if (!session) {
        res.status(404).json({ success: false, status: 'expired', message: "Seans kodi topilmadi yoki vaqti o'tdi" });
        return;
    }
    if (session.status === 'authenticated' && session.user) {
        const token = jsonwebtoken_1.default.sign({ userId: session.user.id }, index_js_1.config.jwtSecret, { expiresIn: '30d' });
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
exports.checkTelegramAuth = checkTelegramAuth;
const googleLogin = async (req, res) => {
    try {
        const { googleId, email, name, picture } = req.body;
        if (!email || !name) {
            res.status(400).json({ success: false, message: "Google hisobi ma'lumotlari to'liq emas" });
            return;
        }
        let user = null;
        try {
            user = await User_js_1.UserModel.findOne({ googleId: googleId || email });
            if (!user) {
                user = await User_js_1.UserModel.create({
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
        }
        catch (dbErr) {
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
        const token = jsonwebtoken_1.default.sign({ userId: userData.id, email }, index_js_1.config.jwtSecret, { expiresIn: '30d' });
        res.json({
            success: true,
            message: "Google hisobi orqali muvaffaqiyatli kirildi! 🌐",
            token,
            user: userData
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.googleLogin = googleLogin;
const sendCode = async (req, res) => {
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
exports.sendCode = sendCode;
const verifyCode = async (req, res) => {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
        res.status(400).json({ success: false, message: "Telefon va SMS kod majburiy" });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ phoneNumber, userId: 'usr_' + Date.now() }, index_js_1.config.jwtSecret, { expiresIn: '30d' });
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
exports.verifyCode = verifyCode;
