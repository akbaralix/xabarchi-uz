import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserModel, IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

const AUTH_COOKIE_NAME = 'xabarchi_auth';

export const authenticateJwt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | null = null;

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
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    if (!decoded.userId) {
      res.status(401).json({ success: false, message: 'Yaroqsiz token' });
      return;
    }

    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      res.status(401).json({ success: false, message: 'Foydalanuvchi topilmadi' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token muddati o\'tgan yoki yaroqsiz' });
  }
};
