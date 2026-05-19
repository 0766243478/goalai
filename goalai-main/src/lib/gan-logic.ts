import crypto from 'crypto';

export function generateIntegrityHash(input: unknown): string {
  const secret = process.env.INTEGRITY_SECRET ?? '';
  const payload = JSON.stringify(input) + secret;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function getIntegrityWindowRetryAfterSeconds(input: {
  createdAt: Date;
  now: Date;
  minimumMinutes: number;
}): number {
  const elapsedSeconds = Math.floor((input.now.getTime() - input.createdAt.getTime()) / 1000);
  const minimumSeconds = Math.max(0, Math.floor(input.minimumMinutes * 60));
  return Math.max(0, minimumSeconds - elapsedSeconds);
}

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

