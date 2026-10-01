import { NETWORK_CONFIG } from './NetworkConfig';

export type WakeupProgressCallback = (statusText: string, elapsedMs: number) => void;

export class ServerWakeupService {
  private static isServerOnline = false;

  /**
   * Ensures the Fly.io sleeping server is awake before making socket or online API calls.
   * Retries every 2.5 seconds up to CONNECT_TIMEOUT_MS (35 seconds).
   */
  public static async wakeUpServer(onProgress?: WakeupProgressCallback): Promise<boolean> {
    const startTime = Date.now();
    const timeout = NETWORK_CONFIG.CONNECT_TIMEOUT_MS;
    const retryInterval = 2500;

    if (onProgress) {
      onProgress('Подключение к серверу... Пробуждение мира (5-10 сек)', 0);
    }

    while (Date.now() - startTime < timeout) {
      const elapsed = Date.now() - startTime;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        // Try local server endpoint first if running in AI Studio, fallback to fly.dev
        const targetUrl = window.location.hostname.includes('fly.dev') 
          ? `${NETWORK_CONFIG.SERVER_URL}/health`
          : `${window.location.origin}/health`;

        const response = await fetch(targetUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: { 'Accept': 'text/plain, application/json' }
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (response && response.status === 200) {
          this.isServerOnline = true;
          if (onProgress) {
            onProgress('Сервер онлайн! Вход...', elapsed);
          }
          await new Promise(resolve => setTimeout(resolve, 300));
          return true;
        }
      } catch {
        // Continue retry loop
      }

      if (onProgress) {
        const remainingSec = Math.ceil((timeout - elapsed) / 1000);
        onProgress(`Подключение к серверу... Пробуждение мира (${remainingSec} сек)`, elapsed);
      }

      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }

    // Secondary fallback: test current local origin health endpoint
    try {
      const localCheck = await fetch('/health').catch(() => null);
      if (localCheck && localCheck.status === 200) {
        this.isServerOnline = true;
        if (onProgress) onProgress('Сервер онлайн! Вход...', timeout);
        return true;
      }
    } catch {
      // Ignore
    }

    if (onProgress) {
      onProgress('Ошибка подключения. Попробуйте еще раз', timeout);
    }
    return false;
  }

  public static getIsOnline(): boolean {
    return this.isServerOnline;
  }
}
