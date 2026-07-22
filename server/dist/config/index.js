"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: Number(process.env.PORT || 5000),
    jwtSecret: process.env.JWT_SECRET || 'change-me-in-env',
    mongoUri: process.env.MONGODB_URI || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramBotEnabled: process.env.TELEGRAM_BOT_ENABLED === 'true',
    telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || 'XabarchiAuthBot',
    telegram: {
        apiId: parseInt(process.env.TELEGRAM_API_ID || '0', 10),
        apiHash: process.env.TELEGRAM_API_HASH || '',
    },
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
    }
};
