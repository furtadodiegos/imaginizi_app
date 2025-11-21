import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions, Session } from 'next-auth';

import { prisma } from '@/lib/db';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing Google OAuth environment variables');
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  // TODO: Implement callbacks to set the user's id in the session when necessary
  // callbacks: {
  //   async session({ session, token }) {
  //     if (session.user) {
  //       session.user.id = (token.sub as string | undefined) ?? undefined;
  //     }
  //     return session;
  //   },
  // },
  events: {
    async signIn({ user }) {
      if (!user?.email) return;

      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
        create: {
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
      });
    },
  },
};

const getAuthSession = async () => getServerSession(authOptions);

export const requireAuth = (handler: (req: NextRequest, session: Session) => Promise<Response> | Response) => {
  return async (req: NextRequest) => {
    const session = await getAuthSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(req, session);
  };
};
