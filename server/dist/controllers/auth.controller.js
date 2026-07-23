"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.logout = exports.getMe = exports.verifyCode = exports.sendCode = exports.googleLogin = exports.checkTelegramAuth = exports.initTelegramAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const index_js_1 = require("../config/index.js");
const bot_service_js_1 = require("../services/bot.service.js");
const User_js_1 = require("../models/User.js");
const AUTH_COOKIE_NAME = 'xabarchi_auth';
const REFRESH_COOKIE_NAME = 'xabarchi_refresh';
const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
const signAccessToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId, type: 'access' }, index_js_1.config.jwtSecret, { expiresIn: '7d' });
};
const signRefreshToken = (userId) => {
    return jsonwebtoken_1.default.sign({ userId, type: 'refresh' }, index_js_1.config.jwtSecret, { expiresIn: '30d' });
};
const setAuthCookies = (res, accessToken, refreshToken) => {
    const cookieOptions = {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: AUTH_COOKIE_MAX_AGE,
    };
    res.cookie(AUTH_COOKIE_NAME, accessToken, cookieOptions);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
};
const serializeUser = (user) => ({
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
const initTelegramAuth = async (_req, res, next) => {
    try {
        const code = bot_service_js_1.botAuthService.createAuthSession();
        const botUsername = index_js_1.config.telegramBotUsername || 'XabarchiAuthBot';
        const botUrl = `https://t.me/${botUsername}?start=${code}`;
        res.json({
            success: true,
            code,
            botUrl,
            message: "Telegram bot auth sessiyasi yaratildi",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.initTelegramAuth = initTelegramAuth;
const checkTelegramAuth = async (req, res, next) => {
    try {
        const { code } = req.params;
        const cleanCode = code ? code.trim() : '';
        const session = bot_service_js_1.botAuthService.checkAuthSession(cleanCode);
        if (session && session.status === 'authenticated' && session.userId) {
            const user = await User_js_1.UserModel.findById(session.userId);
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
    }
    catch (error) {
        next(error);
    }
};
exports.checkTelegramAuth = checkTelegramAuth;
const GoogleAuthSchema = zod_1.z.object({
    googleId: zod_1.z.string().min(1, 'Google ID majburiy'),
    email: zod_1.z.string().email('Noto\'g\'ri email formati'),
    name: zod_1.z.string().min(1, 'Ism majburiy'),
    picture: zod_1.z.string().optional()
});
const googleLogin = async (req, res, next) => {
    try {
        const parsed = GoogleAuthSchema.parse(req.body);
        const { googleId, email, name, picture } = parsed;
        let user = await User_js_1.UserModel.findOne({
            $or: [{ googleId }, { phone: email }]
        });
        if (!user) {
            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '';
            const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
            user = await User_js_1.UserModel.create({
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
        }
        else {
            user.isOnline = true;
            if (picture && !user.avatarUrl)
                user.avatarUrl = picture;
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
    }
    catch (error) {
        next(error);
    }
};
exports.googleLogin = googleLogin;
const PhoneAuthSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().min(7, 'Telefon raqam noto\'g\'ri')
});
const sendCode = async (req, res, next) => {
    try {
        const { phoneNumber } = PhoneAuthSchema.parse(req.body);
        res.json({
            success: true,
            message: 'OTP tasdiqlash kodi telefoningizga yuborildi',
            phoneNumber
        });
    }
    catch (error) {
        next(error);
    }
};
exports.sendCode = sendCode;
const VerifyCodeSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().min(7, 'Telefon raqam noto\'g\'ri'),
    code: zod_1.z.string().min(4, 'Kod kamida 4 xonali bo\'lishi kerak'),
    firstName: zod_1.z.string().optional()
});
const verifyCode = async (req, res, next) => {
    try {
        const { phoneNumber, code, firstName } = VerifyCodeSchema.parse(req.body);
        let user = await User_js_1.UserModel.findOne({ phone: phoneNumber });
        if (!user) {
            const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
            user = await User_js_1.UserModel.create({
                phone: phoneNumber,
                firstName: firstName || `Foydalanuvchi_${cleanPhone.slice(-4)}`,
                username: `user_${cleanPhone.slice(-6)}`,
                bio: 'Telefon raqam orqali kirdi',
                isOnline: true,
                allowCalls: true
            });
        }
        else {
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
    }
    catch (error) {
        next(error);
    }
};
exports.verifyCode = verifyCode;
const getMe = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
            return;
        }
        res.json({ success: true, user: serializeUser(req.user) });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
const logout = async (req, res, next) => {
    try {
        if (req.user) {
            req.user.isOnline = false;
            req.user.refreshToken = undefined;
            await req.user.save();
        }
        res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
        res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
        res.json({ success: true, message: 'Tizimdan chiqildi' });
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const UpdateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().optional(),
    username: zod_1.z.string().min(3).max(32).optional(),
    bio: zod_1.z.string().max(200).optional(),
    avatarUrl: zod_1.z.string().optional(),
    allowCalls: zod_1.z.boolean().optional()
});
const updateProfile = async (req, res, next) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
            return;
        }
        const updates = UpdateProfileSchema.parse(req.body);
        if (updates.username && updates.username !== req.user.username) {
            const existing = await User_js_1.UserModel.findOne({ username: updates.username });
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
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
