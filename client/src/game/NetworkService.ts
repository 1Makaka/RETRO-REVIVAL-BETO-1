import { io, Socket } from 'socket.io-client';
import { NETWORK_CONFIG } from './NetworkConfig';
import { getActiveUserProfile } from './firebase';

export interface TavernPeer {
  id: string;
  name: string;
  hero: string;
  x: number;
  y: number;
  flipX?: boolean;
}

export class NetworkService {
  private static instance: NetworkService | null = null;
  private socket: Socket | null = null;
  private isConnected = false;
  private listeners: Map<string, Set<Function>> = new Map();

  public static getInstance(): NetworkService {
    if (!NetworkService.instance) {
      NetworkService.instance = new NetworkService();
    }
    return NetworkService.instance;
  }

  public connect(): Promise<boolean> {
    if (this.socket && this.isConnected) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      try {
        const targetUrl = NETWORK_CONFIG.SERVER_URL;

        this.socket = io(targetUrl, {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 10,
          reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
          this.isConnected = true;
          // Send initial heartbeat with user profile nickname
          const profile = getActiveUserProfile();
          this.socket?.emit('heartbeat', {
            name: profile.nickname,
            rating: profile.rating
          });
          resolve(true);
        });

        this.socket.on('connect_error', () => {
          this.isConnected = false;
          resolve(false);
        });

        this.socket.on('disconnect', () => {
          this.isConnected = false;
        });

        // Forward all events to registered listeners
        this.socket.onAny((event, ...args) => {
          const callbacks = this.listeners.get(event);
          if (callbacks) {
            callbacks.forEach(cb => cb(...args));
          }
        });

      } catch (err) {
        this.isConnected = false;
        resolve(false);
      }
    });
  }

  public on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  public emit(event: string, data?: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  public getSocketId(): string | null {
    return this.socket ? (this.socket.id || null) : null;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }
}
