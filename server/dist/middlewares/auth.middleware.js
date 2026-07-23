"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateJwt = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_js_1 = require("../config/index.js");
const User_js_1 = require("../models/User.js");
const AUTH_COOKIE_NAME = 'xabarchi_auth';
const authenticateJwt = async (req, res, next) => {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    }
    if (!token && req.headers.cookie) {
        const found = req.headers.cookie
            .split(';')
            .map((entry) => entry.trim())
            .find((entry) => entry.startsWith(`${AUTH_COOKIE_NAME}=`));
        if (found) {
            token = decodeURIComponent(found.split('=').slice(1).join('='));
        }
    }
    if (!token) {
        res.status(401).json({ success: false, message: 'Autentifikatsiya talab qilinadi' });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, index_js_1.config.jwtSecret);
        if (!decoded.userId) {
            res.status(401).json({ success: false, message: 'Yaroqsiz token' });
            return;
        }
        const user = await User_js_1.UserModel.findById(decoded.userId);
        if (!user) {
            res.status(401).json({ success: false, message: 'Foydalanuvchi topilmadi' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, message: 'Token muddati o\'tgan yoki yaroqsiz' });
    }
};
exports.authenticateJwt = authenticateJwt;
