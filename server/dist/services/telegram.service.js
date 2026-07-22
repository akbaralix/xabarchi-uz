"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramService = void 0;
const telegram_1 = require("telegram");
const sessions_1 = require("telegram/sessions");
const index_js_1 = require("../config/index.js");
// In-memory or active session manager for Telegram GramJS connections
class TelegramService {
    activeClients = new Map();
    // Initialize or connect client with optional session string
    async getOrCreateClient(sessionString = '') {
        if (!index_js_1.config.telegram.apiId || !index_js_1.config.telegram.apiHash) {
            console.log('[Xabarchi Telegram Service] Real Telegram credentials not provided, operating in Mock/Hybrid mode.');
            return null;
        }
        try {
            const stringSession = new sessions_1.StringSession(sessionString);
            const client = new telegram_1.TelegramClient(stringSession, index_js_1.config.telegram.apiId, index_js_1.config.telegram.apiHash, {
                connectionRetries: 5,
            });
            await client.connect();
            return client;
        }
        catch (err) {
            console.error('[Xabarchi Telegram Service] Connection error:', err);
            return null;
        }
    }
}
exports.telegramService = new TelegramService();
