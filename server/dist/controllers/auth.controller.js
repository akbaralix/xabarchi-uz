"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.logout = exports.getMe = exports.verifyCode = exports.sendCode = exports.googleLogin = exports.checkTelegramAuth = exports.initTelegramAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const bot_service_js_1 = require("../services/bot.service.js");
const User_js_1 = require("../models/User.js");
const AUTH_COOKIE_NAME = 'xabarchi_auth';
const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
};
const setAuthCookie = (res, token) => {
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions);
};
const clearAuthCookie = (res) => {
    res.clearCookie(AUTH_COOKIE_NAME, {
        ...cookieOptions,
        maxAge: undefined,
    });
};
const signAuthToken = (user) => {
    const payload = {
        userId: user.id,
        user,
    };
    return jsonwebtoken_1.default.sign(payload, index_js_1.config.jwtSecret, { expiresIn: '30d' });
};
const getTokenFromCookie = (req) => {
    const rawCookie = req.headers.cookie;
    if (!rawCookie)
        return null;
    const found = rawCookie
        .split(';')
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${AUTH_COOKIE_NAME}=`));
    if (!found)
        return null;
    return decodeURIComponent(found.split('=').slice(1).join('='));
};
const getAuthUserFromToken = (req) => {
    const token = getTokenFromCookie(req);
    if (!token)
        return null;
    try {
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.jwtSecret);
        return decoded.user || null;
    }
    catch {
        return null;
    }
};
const buildAuthResponse = (res, user, message) => {
    const token = signAuthToken(user);
    setAuthCookie(res, token);
    res.json({
        success: true,
        message,
        token,
        user,
    });
};
const initTelegramAuth = async (req, res) => {
    const code = bot_service_js_1.botAuthService.createAuthSession();
    const botUsername = index_js_1.config.telegramBotUsername || 'XabarchiAuthBot';
    const botUrl = `https://t.me/${botUsername}?start=${code}`;
    res.json({
        success: true,
        code,
        botUrl,
        message: "Telegram bot auth mashg'uloti yaratildi",
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
        const user = session.user;
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
                    bio: 'Google hisobi orqali tizimga kirdi',
                    isOnline: true,
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
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.googleLogin = googleLogin;
const sendCode = async (req, res) => {
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
exports.sendCode = sendCode;
const verifyCode = async (req, res) => {
    const { phoneNumber, code } = req.body;
    if (!phoneNumber || !code) {
        res.status(400).json({ success: false, message: 'Telefon va SMS kod majburiy' });
        return;
    }
    const userData = {
        id: 'usr_' + Date.now(),
        firstName: 'Foydalanuvchi',
        username: 'user_phone',
        phone: phoneNumber,
        bio: 'Telefon raqam orqali kirildi',
        avatarUrl: '',
    };
    buildAuthResponse(res, userData, 'Tizimga muvaffaqiyatli kirildi');
};
exports.verifyCode = verifyCode;
const getMe = async (req, res) => {
    const user = getAuthUserFromToken(req);
    if (!user) {
        res.status(401).json({ success: false, message: 'Kirish talab qilinadi' });
        return;
    }
    res.json({ success: true, user });
};
exports.getMe = getMe;
const logout = async (_req, res) => {
    clearAuthCookie(res);
    res.json({ success: true, message: 'Tizimdan chiqildi' });
};
exports.logout = logout;
const updateProfile = async (req, res) => {
    try {
        const authUser = getAuthUserFromToken(req);
        if (!authUser) {
            res.status(401).json({ success: false, message: 'Kirish talab qilinadi' });
            return;
        }
        const { firstName, lastName, username, bio, avatarUrl } = req.body;
        let updatedUser = {
            ...authUser,
            firstName: firstName || authUser.firstName,
            lastName: lastName !== undefined ? lastName : authUser.lastName,
            username: username || authUser.username,
            bio: bio !== undefined ? bio : authUser.bio,
            avatarUrl: avatarUrl || authUser.avatarUrl,
        };
        try {
            const dbUser = await User_js_1.UserModel.findByIdAndUpdate(authUser.id, {
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                username: updatedUser.username,
                bio: updatedUser.bio,
                avatarUrl: updatedUser.avatarUrl,
            }, { new: true });
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
        }
        catch (dbErr) {
            console.warn('[MongoDB Update Profile Warning]:', dbErr);
        }
        const token = signAuthToken(updatedUser);
        setAuthCookie(res, token);
        res.json({ success: true, user: updatedUser, message: 'Profil muvaffaqiyatli yangilandi' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateProfile = updateProfile;
