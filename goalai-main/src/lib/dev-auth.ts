import { prisma } from './db';

export const DEV_USER_ID = '00000000-0000-0000-0000-000000000001';
export const GUEST_COOKIE = 'goalai_guest';

export async function ensureGuestUser(): Promise<{ id: string; email: string | null; northStar: string | null }> {
  const existing = await prisma.user.findUnique({ where: { id: DEV_USER_ID } });
  if (existing) return existing;

  await prisma.user.create({
    data: {
      id: DEV_USER_ID,
      email: 'dev@goalai.local',
      isGuest: true,
      northStar: 'Master local development',
      valueSkill: 'full-stack engineering',
      frictionTrigger: 'DISTRACTION',
      dailyWindowMinutes: 45,
      internalTrustScore: 0.5,
      trustScore: 500,
      loadMultiplier: 1.0,
    },
  });

  const user = await prisma.user.findUnique({ where: { id: DEV_USER_ID } });
  return user!;
}
