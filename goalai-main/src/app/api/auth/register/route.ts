import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

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

    // Check Prisma for existing email (catches guest/dev users)
    const existingPrismaUser = await prisma.user.findUnique({ where: { email } });
    if (existingPrismaUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
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
      // Check if the error indicates a duplicate email from Supabase
      if (signUpError.message?.toLowerCase().includes('already') || signUpError.message?.toLowerCase().includes('exists') || signUpError.message?.toLowerCase().includes('duplicate')) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
      }
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Create corresponding Prisma user
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

    return NextResponse.json({
      success: true,
      user: { id: data.user.id, email: data.user.email ?? email },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 });
  }
}
