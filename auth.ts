import NextAuth, { CredentialsSignin } from 'next-auth';
import type { User } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import GitHub from 'next-auth/providers/github';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './lib/prisma';
import { tempUsers } from './lib/tempUsers';

const isDbEnabled = Boolean(process.env.DATABASE_URL);
const dbAdapter = isDbEnabled
  ? (() => {
      const baseAdapter = PrismaAdapter(prisma);

      return {
        ...baseAdapter,
        async createUser(user: unknown) {
          const data = { ...(user as Record<string, unknown>) };
          delete data.emailVerified;
          delete data.image;
          return baseAdapter.createUser!(data as never);
        },
        async updateUser(user: unknown) {
          const data = { ...(user as Record<string, unknown>) };
          delete data.emailVerified;
          delete data.image;
          return baseAdapter.updateUser!(data as never);
        },
      };
    })()
  : undefined;

class NoUserError extends CredentialsSignin {
  code = 'NO_USER';
}
class BadPasswordError extends CredentialsSignin {
  code = 'BAD_PASSWORD';
}
class MissingFieldsError extends CredentialsSignin {
  code = 'MISSING_FIELDS';
}
class NoPasswordError extends CredentialsSignin {
  code = 'NO_PASSWORD';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: dbAdapter,
  session: {
    strategy: 'jwt',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),

    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        const rawEmail = credentials?.email;
        const rawPassword = credentials?.password;

        if (!rawEmail || !rawPassword) throw new MissingFieldsError();

        const email = String(rawEmail).toLowerCase().trim();
        const password = String(rawPassword);

        if (isDbEnabled) {
          const dbUser = await prisma.user.findUnique({ where: { email } });
          if (!dbUser) throw new NoUserError();
          if (!dbUser.passwordHash) throw new NoPasswordError();

          const isValid = await bcrypt.compare(password, dbUser.passwordHash);
          if (!isValid) throw new BadPasswordError();

          return {
            id: dbUser.id,
            email: dbUser.email ?? undefined,
            name: dbUser.name ?? undefined,
          };
        }

        const user = tempUsers.find((u) => u.email.toLowerCase().trim() === email);
        if (!user) throw new NoUserError();

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) throw new BadPasswordError();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
});
