import TelegramBot from 'node-telegram-bot-api';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { UserModel } from '../models/User.js';
import { logger } from '../config/logger.js';

interface PendingAuth {
  code: string;
  userId?: string;
  status: 'pending' | 'authenticated';
  createdAt: number;
}

class BotAuthService {
  private bot: TelegramBot | null = null;
  private pendingAuths: Map<string, PendingAuth> = new Map();

  constructor() {
    this.initBot();
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

        const codeMatch = text.match(/\b\d{6}\b/);
        const code = codeMatch ? codeMatch[0] : (text.startsWith('/start ') ? text.replace('/start ', '').trim() : '');

        if (!code) {
          if (text === '/start') {
            await this.bot?.sendMessage(
              chatId,
              "Salom! <b>Xabarchi Web</b> ilovasiga kirish uchun web-saytdagi <b>'Telegram orqali kirish'</b> tugmasini bosing va botni oching.",
              { parse_mode: 'HTML' }
            );
          }
          return;
        }

        logger.info(`[Telegram Bot Auth] Code received: ${code} from User: ${tgUser.first_name} (@${tgUser.username})`);

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

        this.authenticateSession(code, dbUser._id.toString());

        const welcomeMessage = `<b>Xabarchi Web</b> ilovasiga xush kelibsiz, <b>${tgUser.first_name}</b>! 🚀\n\nSiz muvaffaqiyatli avtorizatsiyadan o'tdingiz. Brauzeringiz avtomatik ravishda ilovaga kiradi.`;
        await this.bot?.sendMessage(chatId, welcomeMessage, { parse_mode: 'HTML' });
      });
    } catch (error) {
      logger.error(`[Telegram Bot Initialization Error]: ${error}`);
    }
  }

  createAuthSession(): string {
    const code = String(crypto.randomInt(100000, 999999));
    this.pendingAuths.set(code, {
      code,
      status: 'pending',
      createdAt: Date.now()
    });
    return code;
  }

  authenticateSession(code: string, userId: string): PendingAuth {
    const cleanCode = code.trim();
    const existing = this.pendingAuths.get(cleanCode);

    const authenticatedSession: PendingAuth = {
      code: cleanCode,
      userId,
      status: 'authenticated',
      createdAt: existing ? existing.createdAt : Date.now()
    };

    this.pendingAuths.set(cleanCode, authenticatedSession);
    return authenticatedSession;
  }

  checkAuthSession(code: string): PendingAuth | undefined {
    return this.pendingAuths.get(code.trim());
  }
}

export const botAuthService = new BotAuthService();
