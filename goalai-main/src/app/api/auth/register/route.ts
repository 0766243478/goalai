import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';
import { applySupabaseCookies, createSupabaseRouteClient } from '@/lib/supabase/route';

export async function POST(req: NextRequest) {
  try {
    let email: string | undefined;
    let password: string | undefined;
    try {
      const body = await req.json();
      email = body.email?.trim();
      password = body.password;
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check Prisma for existing email
    const existingPrismaUser = await prisma.user.findUnique({ where: { email } });
    if (existingPrismaUser) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
    }

    // Create user in Supabase Auth using service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Auth service not configured' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Failed to create user in auth system' }, { status: 500 });
    }

    // Create corresponding Prisma user
    try {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email ?? email,
          northStar: null,
          valueSkill: null,
          frictionTrigger: 'OVERTHINKING',
          dailyWindowMinutes: 30,
          internalTrustScore: 0.5,
          trustScore: 500,
          loadMultiplier: 1.0,
        },
      });
    } catch (dbError) {
      // Prisma failed — roll back Supabase user to avoid orphan accounts
      try {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      } catch {
        // Non-critical cleanup
      }
      const message = dbError instanceof Error ? dbError.message : 'Database error';
      return NextResponse.json({ error: `Failed to create profile: ${message}` }, { status: 500 });
    }

    // Sign the user in to establish a session (so they don't need to manually log in)
    const { supabase: routeSupabase, cookiesToSet } = await createSupabaseRouteClient();
    const { error: signInError } = await routeSupabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return applySupabaseCookies(
        NextResponse.json({
          success: true,
          user: { id: data.user.id, email: data.user.email ?? email },
          warning: 'Account created but auto-sign-in failed. Please sign in manually.',
        }),
        cookiesToSet
      );
    }

    return applySupabaseCookies(
      NextResponse.json({
        success: true,
        user: { id: data.user.id, email: data.user.email ?? email },
      }),
      cookiesToSet
    );
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
