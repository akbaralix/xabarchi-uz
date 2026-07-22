import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

export const socket: Socket = io(API_BASE_URL, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket', 'polling']
});
