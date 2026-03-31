import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { tempUsers } from '@/lib/tempUsers';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const name = String(body?.name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const email = String(body?.email ?? '')
    .toLowerCase()
    .trim();
  const password = String(body?.password ?? '');

  if (!name || !email || !password) {
    return NextResponse.json(
      { ok: false, error: 'MISSING_FIELDS' },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // If DATABASE_URL is configured, persist users in Postgres via Prisma.
  if (process.env.DATABASE_URL) {
    try {
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
        },
      });
      return NextResponse.json({ ok: true });
    } catch (err: unknown) {
      // Prisma unique constraint violation
      const code = (err as { code?: unknown } | null)?.code;
      if (code === 'P2002') {
        return NextResponse.json(
          { ok: false, error: 'EMAIL_TAKEN' },
          { status: 409 },
        );
      }
      console.error('Signup DB error:', err);
      return NextResponse.json(
        { ok: false, error: 'SERVER_ERROR' },
        { status: 500 },
      );
    }
  }

  // Fallback for dev/test when no DB is configured.
  const exists = tempUsers.some((u) => u.email.toLowerCase().trim() === email);
  if (exists) {
    return NextResponse.json(
      { ok: false, error: 'EMAIL_TAKEN' },
      { status: 409 },
    );
  }

  tempUsers.push({
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
  });

  return NextResponse.json({ ok: true });
}
