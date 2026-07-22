import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatId: string;
  senderId: string;
  senderName?: string;
  text: string;
  time: string;
  date: string;
  isOutgoing: boolean;
  status: 'sending' | 'delivered' | 'seen';
  reactions?: string[];
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  media?: {
    type: 'image' | 'voice' | 'file';
    url: string;
    name?: string;
    duration?: string;
    size?: string;
  };
  isPinned?: boolean;
  views?: number;
  isEdited?: boolean;
  editedAt?: string;
  deletedFor?: string[];
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    chatId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    senderName: { type: String },
    text: { type: String, default: '' },
    time: { type: String, required: true },
    date: { type: String, default: 'Bugun' },
    isOutgoing: { type: Boolean, default: true },
    status: { type: String, enum: ['sending', 'delivered', 'seen'], default: 'delivered' },
    reactions: [{ type: String }],
    replyTo: {
      id: { type: String },
      senderName: { type: String },
      text: { type: String },
    },
    media: {
      type: { type: String, enum: ['image', 'voice', 'file'] },
      url: { type: String },
      name: { type: String },
      duration: { type: String },
      size: { type: String },
    },
    isPinned: { type: Boolean, default: false },
    views: { type: Number, default: 0 },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: String },
    deletedFor: [{ type: String }]
  },
  { timestamps: true }
);

export const MessageModel = mongoose.model<IMessage>('Message', MessageSchema);
