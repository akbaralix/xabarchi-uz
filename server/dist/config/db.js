"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const index_js_1 = require("./index.js");
const connectDB = async () => {
    try {
        if (!index_js_1.config.mongoUri) {
            console.log('[Xabarchi DB] MongoUri is not defined, using local fallback mode.');
            return;
        }
        await mongoose_1.default.connect(index_js_1.config.mongoUri);
        console.log('[Xabarchi DB] MongoDB muvaffaqiyatli ulandi! 🍃');
    }
    catch (error) {
        console.warn('[Xabarchi DB] MongoDB ulanishida ogohlantirish (fallback ishlatiladi):', error);
    }
};
exports.connectDB = connectDB;
