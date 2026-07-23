import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  telegramId?: string;
  googleId?: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  isOnline: boolean;
  allowCalls: boolean;
  refreshToken?: string;
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    telegramId: { type: String, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    username: { type: String, unique: true, sparse: true },
    phone: { type: String, unique: true, sparse: true },
    bio: { type: String, default: 'Xabarchi ilovasidan foydalanmoqda ✨' },
    avatarUrl: { type: String },
    isOnline: { type: Boolean, default: true },
    allowCalls: { type: Boolean, default: true },
    refreshToken: { type: String }
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
