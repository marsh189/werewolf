import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { tempUsers } from '@/lib/tempUsers';

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const name = String(body?.name ?? '').trim();
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

  const exists = tempUsers.some((u) => u.email.toLowerCase().trim() === email);
  if (exists) {
    return NextResponse.json(
      { ok: false, error: 'EMAIL_TAKEN' },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  tempUsers.push({
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash,
  });

  return NextResponse.json({ ok: true });
}
