import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { UserModel } from '../models/User.js';
import { logger } from '../config/logger.js';

interface PendingAuth {
  token: string;
  userId?: string;
  status: 'pending' | 'authenticated';
  createdAt: number;
}

class BotAuthService {
  private bot: TelegramBot | null = null;
  private pendingAuths: Map<string, PendingAuth> = new Map();

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

  private initBot() {
    if (!config.telegramBotEnabled) {
      logger.warn('[Telegram Bot Service] TELEGRAM_BOT_ENABLED false, bot polling o\'chirildi.');
      return;
    }

    if (!config.telegramBotToken) {
      logger.warn('[Telegram Bot Service] TELEGRAM_BOT_TOKEN kiritilmagan.');
      return;
    }

    try {
      this.bot = new TelegramBot(config.telegramBotToken, { polling: true });
      logger.info('[Telegram Bot Service] Bot polling muvaffaqiyatli ishga tushdi! 🤖');

      this.bot.on('polling_error', (error) => {
        logger.warn(`[Telegram Bot Polling Warning]: ${error.message || error}`);
      });

      this.bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text || '';
        const tgUser = msg.from;
        if (!tgUser || !text) return;

        const tokenMatch = text.startsWith('/start ') ? text.replace('/start ', '').trim() : text.trim();

        if (!tokenMatch || tokenMatch === '/start') {
          await this.bot?.sendMessage(
            chatId,
            "Salom! <b>Xabarchi Web</b> ilovasiga kirish uchun web-saytdagi <b>'Telegram orqali kirish'</b> tugmasini bosing.",
            { parse_mode: 'HTML' }
          );
          return;
        }

        const session = this.pendingAuths.get(tokenMatch);
        if (!session) {
          await this.bot?.sendMessage(
            chatId,
            "⚠️ Avtorizatsiya sessiyasi eskirgan yoki mavjud emas. Iltimos, web-saytdan qaytadan urinib ko'ring.",
            { parse_mode: 'HTML' }
          );
          return;
        }

        logger.info(`[Telegram Bot Auth] Valid token received from User: ${tgUser.first_name} (@${tgUser.username})`);

        let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgUser.id}`;
        try {
          const photos = await this.bot?.getUserProfilePhotos(tgUser.id, { limit: 1 });
          if (photos && photos.total_count > 0 && photos.photos[0].length > 0) {
            const fileId = photos.photos[0][0].file_id;
            const file = await this.bot?.getFile(fileId);
            if (file && file.file_path) {
              avatarUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;
            }
          }
        } catch (error) {
          logger.warn(`[Telegram Bot Avatar Fetch Error]: ${error}`);
        }

        let dbUser = await UserModel.findOneAndUpdate(
          { telegramId: String(tgUser.id) },
          {
            telegramId: String(tgUser.id),
            firstName: tgUser.first_name,
            lastName: tgUser.last_name || '',
            username: tgUser.username || `tg_${tgUser.id}`,
            avatarUrl,
            isOnline: true,
            allowCalls: true
          },
          { upsert: true, new: true }
        );

        this.authenticateSession(tokenMatch, dbUser._id.toString());

        const welcomeMessage = `<b>Xabarchi Web</b> ilovasiga xush kelibsiz, <b>${tgUser.first_name}</b>! 🚀\n\nSiz muvaffaqiyatli avtorizatsiyadan o'tdingiz. Brauzeringiz avtomatik ravishda ilovaga kiradi.`;
        await this.bot?.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
      });
    } catch (error) {
      logger.error(`[Telegram Bot Initialization Error]: ${error}`);
    }
  }

  createAuthSession(): string {
    const token = crypto.randomBytes(32).toString('hex');
    this.pendingAuths.set(token, {
      token,
      status: 'pending',
      createdAt: Date.now()
    });
    return token;
  }

  authenticateSession(token: string, userId: string): PendingAuth {
    const cleanToken = token.trim();
    const existing = this.pendingAuths.get(cleanToken);

    const authenticatedSession: PendingAuth = {
      token: cleanToken,
      userId,
      status: 'authenticated',
      createdAt: existing ? existing.createdAt : Date.now()
    };

    this.pendingAuths.set(cleanToken, authenticatedSession);
    return authenticatedSession;
  }

  checkAuthSession(token: string): PendingAuth | undefined {
    return this.pendingAuths.get(token.trim());
  }

  consumeAuthSession(token: string): void {
    this.pendingAuths.delete(token.trim());
  }
}

export const botAuthService = new BotAuthService();
