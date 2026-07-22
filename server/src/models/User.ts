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
  createdAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    telegramId: { type: String, unique: true, sparse: true },
    googleId: { type: String, unique: true, sparse: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    username: { type: String },
    phone: { type: String },
    bio: { type: String, default: 'Xabarchi ilovasidan foydalanmoqda ✨' },
    avatarUrl: { type: String },
    isOnline: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
