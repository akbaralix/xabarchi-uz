"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.botAuthService = void 0;
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const crypto_1 = __importDefault(require("crypto"));
const index_js_1 = require("../config/index.js");
const User_js_1 = require("../models/User.js");
const logger_js_1 = require("../config/logger.js");
class BotAuthService {
    bot = null;
    pendingAuths = new Map();
    constructor() {
        this.initBot();
        // Periodically clean up expired auth sessions (older than 10 minutes)
        setInterval(() => {
            const now = Date.now();
            for (const [token, session] of this.pendingAuths.entries()) {
                if (now - session.createdAt > 10 * 60 * 1000) {
                    this.pendingAuths.delete(token);
                }
            }
        }, 60 * 1000);
    }
    initBot() {
        if (!index_js_1.config.telegramBotEnabled) {
            logger_js_1.logger.warn('[Telegram Bot Service] TELEGRAM_BOT_ENABLED false, bot polling o\'chirildi.');
            return;
        }
        if (!index_js_1.config.telegramBotToken) {
            logger_js_1.logger.warn('[Telegram Bot Service] TELEGRAM_BOT_TOKEN kiritilmagan.');
            return;
        }
        try {
            this.bot = new node_telegram_bot_api_1.default(index_js_1.config.telegramBotToken, { polling: true });
            logger_js_1.logger.info('[Telegram Bot Service] Bot polling muvaffaqiyatli ishga tushdi! 🤖');
            this.bot.on('polling_error', (error) => {
                logger_js_1.logger.warn(`[Telegram Bot Polling Warning]: ${error.message || error}`);
            });
            this.bot.on('message', async (msg) => {
                const chatId = msg.chat.id;
                const text = msg.text || '';
                const tgUser = msg.from;
                if (!tgUser || !text)
                    return;
                const tokenMatch = text.startsWith('/start ') ? text.replace('/start ', '').trim() : text.trim();
                if (!tokenMatch || tokenMatch === '/start') {
                    await this.bot?.sendMessage(chatId, "Salom! <b>Xabarchi Web</b> ilovasiga kirish uchun web-saytdagi <b>'Telegram orqali kirish'</b> tugmasini bosing.", { parse_mode: 'HTML' });
                    return;
                }
                const session = this.pendingAuths.get(tokenMatch);
                if (!session) {
                    await this.bot?.sendMessage(chatId, "⚠️ Avtorizatsiya sessiyasi eskirgan yoki mavjud emas. Iltimos, web-saytdan qaytadan urinib ko'ring.", { parse_mode: 'HTML' });
                    return;
                }
                logger_js_1.logger.info(`[Telegram Bot Auth] Valid token received from User: ${tgUser.first_name} (@${tgUser.username})`);
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
                    logger_js_1.logger.warn(`[Telegram Bot Avatar Fetch Error]: ${error}`);
                }
                let dbUser = await User_js_1.UserModel.findOneAndUpdate({ telegramId: String(tgUser.id) }, {
                    telegramId: String(tgUser.id),
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name || '',
                    username: tgUser.username || `tg_${tgUser.id}`,
                    avatarUrl,
                    isOnline: true,
                    allowCalls: true
                }, { upsert: true, new: true });
                this.authenticateSession(tokenMatch, dbUser._id.toString());
                const welcomeMessage = `<b>Xabarchi Web</b> ilovasiga xush kelibsiz, <b>${tgUser.first_name}</b>! 🚀\n\nSiz muvaffaqiyatli avtorizatsiyadan o'tdingiz. Brauzeringiz avtomatik ravishda ilovaga kiradi.`;
                await this.bot?.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
            });
        }
        catch (error) {
            logger_js_1.logger.error(`[Telegram Bot Initialization Error]: ${error}`);
        }
    }
    createAuthSession() {
        const token = crypto_1.default.randomBytes(32).toString('hex');
        this.pendingAuths.set(token, {
            token,
            status: 'pending',
            createdAt: Date.now()
        });
        return token;
    }
    authenticateSession(token, userId) {
        const cleanToken = token.trim();
        const existing = this.pendingAuths.get(cleanToken);
        const authenticatedSession = {
            token: cleanToken,
            userId,
            status: 'authenticated',
            createdAt: existing ? existing.createdAt : Date.now()
        };
        this.pendingAuths.set(cleanToken, authenticatedSession);
        return authenticatedSession;
    }
    checkAuthSession(token) {
        return this.pendingAuths.get(token.trim());
    }
    consumeAuthSession(token) {
        this.pendingAuths.delete(token.trim());
    }
}
exports.botAuthService = new BotAuthService();
