import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { config } from '../config/index.js';

// In-memory or active session manager for Telegram GramJS connections
class TelegramService {
  private activeClients: Map<string, TelegramClient> = new Map();

  // Initialize or connect client with optional session string
  async getOrCreateClient(sessionString: string = ''): Promise<TelegramClient | null> {
    if (!config.telegram.apiId || !config.telegram.apiHash) {
      console.log('[Xabarchi Telegram Service] Real Telegram credentials not provided, operating in Mock/Hybrid mode.');
      return null;
    }

    try {
      const stringSession = new StringSession(sessionString);
      const client = new TelegramClient(stringSession, config.telegram.apiId, config.telegram.apiHash, {
        connectionRetries: 5,
      });
      await client.connect();
      return client;
    } catch (err) {
      console.error('[Xabarchi Telegram Service] Connection error:', err);
      return null;
    }
  }
}

export const telegramService = new TelegramService();
