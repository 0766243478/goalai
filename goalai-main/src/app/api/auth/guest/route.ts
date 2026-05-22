import { NextResponse } from 'next/server';
import { ensureGuestUser, GUEST_COOKIE, DEV_USER_ID } from '@/lib/dev-auth';

export async function POST() {
  try {
    const user = await ensureGuestUser();
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        northStar: user.northStar,
        isGuest: true,
      },
    });
    response.cookies.set(GUEST_COOKIE, DEV_USER_ID, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Guest session creation failed:', error);
    return NextResponse.json({ error: 'Failed to create guest session' }, { status: 500 });
  }
}
