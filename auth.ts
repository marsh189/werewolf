import NextAuth, { CredentialsSignin } from 'next-auth';
import type { User } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import GitHub from 'next-auth/providers/github';
import { tempUsers } from './lib/tempUsers';

// ✅ Custom error classes
class NoUserError extends CredentialsSignin {
  code = 'NO_USER';
}
class BadPasswordError extends CredentialsSignin {
  code = 'BAD_PASSWORD';
}
class MissingFieldsError extends CredentialsSignin {
  code = 'MISSING_FIELDS';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        const user = tempUsers.find(
          (u) => u.email.toLowerCase().trim() === email,
        );
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
