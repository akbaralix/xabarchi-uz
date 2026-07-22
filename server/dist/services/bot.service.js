"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botAuthService = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const index_js_1 = require("../config/index.js");
const User_js_1 = require("../models/User.js");
class BotAuthService {
    bot = null;
    pendingAuths = new Map();
    pollingStopped = false;
    constructor() {
        this.initBot();
    }
    initBot() {
        if (!index_js_1.config.telegramBotEnabled) {
            console.warn('[Telegram Bot Service] TELEGRAM_BOT_ENABLED false, bot polling o\'chirildi.');
            return;
        }
        if (!index_js_1.config.telegramBotToken) {
            console.warn('[Telegram Bot Service] TELEGRAM_BOT_TOKEN kiritilmagan.');
            return;
        }
        try {
            this.bot = new node_telegram_bot_api_1.default(index_js_1.config.telegramBotToken, { polling: true });
            console.log('[Telegram Bot Service] Bot polling muvaffaqiyatli ishga tushdi! 🤖');
            this.bot.on('polling_error', (error) => {
                console.warn('[Telegram Bot Polling Warning]:', error);
                if (!this.pollingStopped) {
                    this.pollingStopped = true;
                    void this.bot?.stopPolling().catch((stopError) => {
                        console.warn('[Telegram Bot Stop Warning]:', stopError);
                    });
                }
            });
            this.bot.onText(/\/start (.+)/, async (msg, match) => {
                const chatId = msg.chat.id;
                const code = match ? match[1].trim() : '';
                if (!code)
                    return;
                const tgUser = msg.from;
                if (!tgUser)
                    return;
                console.log(`[Telegram Bot Auth] Code received: ${code} from User: ${tgUser.first_name} (@${tgUser.username})`);
                let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgUser.id}`;
                try {
                    const photos = await this.bot?.getUserProfilePhotos(tgUser.id, { limit: 1 });
                    if (photos && photos.total_count > 0 && photos.photos[0].length > 0) {
                        const fileId = photos.photos[0][0].file_id;
                        const file = await this.bot?.getFile(fileId);
                        if (file && file.file_path) {
                            avatarUrl = `https://api.telegram.org/file/bot${index_js_1.config.telegramBotToken}/${file.file_path}`;
                        }
                    }
                }
                catch (error) {
                    console.warn('[Telegram Bot Avatar Fetch Error]:', error);
                }
                let dbUser = null;
                try {
                    dbUser = await User_js_1.UserModel.findOneAndUpdate({ telegramId: String(tgUser.id) }, {
                        telegramId: String(tgUser.id),
                        firstName: tgUser.first_name,
                        lastName: tgUser.last_name || '',
                        username: tgUser.username || `tg_${tgUser.id}`,
                        avatarUrl,
                        isOnline: true
                    }, { upsert: true, new: true });
                }
                catch (dbErr) {
                    console.warn('[MongoDB Atlas User Save Warning]:', dbErr);
                }
                const userData = dbUser ? {
                    id: dbUser._id.toString(),
                    telegramId: dbUser.telegramId,
                    firstName: dbUser.firstName,
                    lastName: dbUser.lastName,
                    username: dbUser.username,
                    avatarUrl: dbUser.avatarUrl,
                    bio: 'Telegram Bot orqali kirdi рџљЂ'
                } : {
                    id: 'usr_tg_' + tgUser.id,
                    telegramId: String(tgUser.id),
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name || '',
                    username: tgUser.username || `tg_${tgUser.id}`,
                    avatarUrl,
                    bio: 'Telegram Bot orqali kirdi рџљЂ'
                };
                const authenticated = this.authenticateSession(code, userData);
                if (!authenticated) {
                    await this.bot?.sendMessage(chatId, "Bu kod topilmadi yoki muddati o'tgan. Iltimos, web-ilovadan yangi kirish kodi yarating.", { parse_mode: 'HTML' });
                    return;
                }
                const welcomeMessage = `<b>Xabarchi Web</b> ilovasiga xush kelibsiz, <b>${tgUser.first_name}</b>! рџљЂ\n\nSiz muvaffaqiyatli avtorizatsiyadan o'tdingiz. Brauzeringiz avtomatik ravishda ilovaga kiradi.`;
                await this.bot?.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
            });
            this.bot.onText(/\/start$/, async (msg) => {
                const chatId = msg.chat.id;
                await this.bot?.sendMessage(chatId, "Salom! <b>Xabarchi Web</b> ilovasiga kirish uchun web-saytdagi <b>'Telegram orqali kirish'</b> tugmasini bosing.", { parse_mode: 'HTML' });
            });
        }
        catch (error) {
            console.error('[Telegram Bot Initialization Error]:', error);
        }
    }
    createAuthSession() {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        this.pendingAuths.set(code, {
            code,
            status: 'pending',
            createdAt: Date.now()
        });
        return code;
    }
    authenticateSession(code, user) {
        const session = this.pendingAuths.get(code);
        if (!session) {
            return null;
        }
        const authenticatedSession = {
            ...session,
            user,
            status: 'authenticated'
        };
        this.pendingAuths.set(code, authenticatedSession);
        return authenticatedSession;
    }
    checkAuthSession(code) {
        return this.pendingAuths.get(code);
    }
}
exports.botAuthService = new BotAuthService();
