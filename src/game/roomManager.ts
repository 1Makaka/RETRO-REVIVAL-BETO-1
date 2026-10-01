/**
 * Frantic Battles - Room Manager (Local Storage & Memory Persistent Room Registry)
 */

export interface GameRoom {
  code: string;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  isPrivate: boolean;
  password?: string;
  createdAt: number;
}

const STORAGE_KEY = 'retro_revival_active_rooms';

export class RoomManager {
  public static getRooms(): GameRoom[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const rooms: GameRoom[] = JSON.parse(data);
      const now = Date.now();
      // Filter out rooms older than 30 minutes
      const activeRooms = rooms.filter(r => now - r.createdAt < 30 * 60 * 1000);
      return activeRooms;
    } catch {
      return [];
    }
  }

  public static createRoom(room: {
    code: string;
    name: string;
    maxPlayers: number;
    isPrivate?: boolean;
    password?: string;
  }): GameRoom {
    const rooms = this.getRooms();
    // Remove if duplicate code exists
    const filtered = rooms.filter(r => r.code !== room.code);

    const newRoom: GameRoom = {
      code: room.code,
      name: room.name || `Комната ${room.code}`,
      maxPlayers: room.maxPlayers || 4,
      currentPlayers: 1,
      isPrivate: !!room.isPrivate,
      password: room.password || '',
      createdAt: Date.now()
    };

    filtered.unshift(newRoom);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch {
      // Memory fallback
    }
    return newRoom;
  }

  public static getRoomByCode(code: string): GameRoom | null {
    const cleanCode = code.trim().toUpperCase();
    const rooms = this.getRooms();
    return rooms.find(r => r.code.toUpperCase() === cleanCode) || null;
  }

  public static updateRoomPlayers(code: string, count: number) {
    const rooms = this.getRooms();
    const room = rooms.find(r => r.code.toUpperCase() === code.trim().toUpperCase());
    if (room) {
      room.currentPlayers = count;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
      } catch {
        // Fallback
      }
    }
  }
}
