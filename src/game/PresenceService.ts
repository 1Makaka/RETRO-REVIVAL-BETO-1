import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export class PresenceService {
  private static intervalId: any = null;

  /**
   * Starts sending a heartbeat timestamp every 25 seconds to the Firestore user document.
   */
  public static startHeartbeat() {
    if (this.intervalId) return;

    const sendHeartbeat = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            lastSeen: Date.now()
          });
        } catch (e) {
          // Ignore if document is not yet fully initialized or offline
        }
      }
    };

    // Trigger immediately on session start
    sendHeartbeat();

    // Repeat every 25 seconds
    this.intervalId = setInterval(sendHeartbeat, 25000);

    // Setup tab unload handler
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.setOffline);
    }
  }

  /**
   * Stops the active presence heartbeat loop.
   */
  public static stopHeartbeat() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.setOffline);
    }
  }

  /**
   * Mutes presence by resetting lastSeen to 0.
   */
  public static async setOffline() {
    const user = auth.currentUser;
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          lastSeen: 0
        });
      } catch (e) {
        // Catch gracefully during browser close/unload
      }
    }
  }

  /**
   * Returns formatted status details containing text indicator, color, and status state.
   */
  public static getStatusString(lastSeen: number): { text: string; color: string; isOnline: boolean } {
    if (!lastSeen) {
      return { text: '⚪ Не в сети', color: '#94a3b8', isOnline: false };
    }
    
    const isOnline = Date.now() - lastSeen < 60000; // Online threshold of 60 seconds
    if (isOnline) {
      return { text: '🟢 В сети', color: '#22c55e', isOnline: true };
    }

    const seconds = Math.floor((Date.now() - lastSeen) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let text = '⚪ Был в сети ';
    if (minutes < 1) text += 'только что';
    else if (minutes < 60) text += `${minutes} мин. назад`;
    else if (hours < 24) text += `${hours} ч. назад`;
    else text += `${days} дн. назад`;

    return { text, color: '#94a3b8', isOnline: false };
  }
}
