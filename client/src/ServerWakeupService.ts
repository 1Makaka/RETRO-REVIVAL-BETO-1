import { NETWORK_CONFIG } from './NetworkConfig';

export type WakeupProgressCallback = (statusText: string, elapsedMs: number) => void;

export class ServerWakeupService {
  private static isServerOnline = false;

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

        const targetUrl = `${NETWORK_CONFIG.SERVER_URL}/health`;

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

    if (onProgress) {
      onProgress('Ошибка подключения. Попробуйте еще раз', timeout);
    }
    return false;
  }

  public static getIsOnline(): boolean {
    return this.isServerOnline;
  }
}
