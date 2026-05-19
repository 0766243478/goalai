export class GanLogic {
  static async generateIntegrityHash(data: unknown): Promise<string> {
    const payload = {
      data,
      salt: import.meta.env.VITE_INTEGRITY_SECRET || 'gan-network',
    };

    const input = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return GanLogic.bytesToHex(new Uint8Array(digest));
  }
  
  // Enforce Integrity Interval (minimum time between task completions)
  static canCompleteTask(lastCompletedAt: Date): { allowed: boolean; retryAfter: number } {
    const INTEGRITY_WINDOW = 3600; // 1 hour in seconds
    const now = new Date();
    const diff = now.getTime() - lastCompletedAt.getTime();
    const secondsSinceLast = diff / 1000;
    
    if (secondsSinceLast < INTEGRITY_WINDOW) {
      return {
        allowed: false,
        retryAfter: Math.ceil(INTEGRITY_WINDOW - secondsSinceLast)
      };
    }
    
    return { allowed: true, retryAfter: 0 };
  }

  // Format time for countdown display
  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private static bytesToHex(bytes: Uint8Array): string {
    let hex = '';
    for (let i = 0; i < bytes.length; i += 1) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }
}
