import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';

import type { User } from '@/lib/generated/prisma/client';

type RouteContext = { params?: Record<string, string | string[]> } | undefined;

const captureException = (error: unknown, context?: RouteContext) => {
  Sentry.captureException(error, {
    extra: context,
  });
};

const captureMessage = (message: string, context?: RouteContext) => {
  Sentry.captureMessage(message, {
    extra: context,
  });
};

type SentryUserInput = Pick<User, 'id' | 'email' | 'name'> | null;

const setUser = (user: SentryUserInput) => Sentry.setUser(user);

export const setUserFromRequest = (req: NextRequest) => {
  const id = req.headers.get('x-user-id') ?? '';
  const email = req.headers.get('x-user-email') ?? '';
  const name = req.headers.get('x-user-name') ?? '';

  setUser({ id, email, name });
};

export const withSentryUser = (handler: (req: NextRequest, context?: RouteContext) => Promise<Response> | Response) => {
  return async (req: NextRequest, context?: RouteContext) => {
    setUserFromRequest(req);

    try {
      return await handler(req, context);
    } finally {
      Sentry.setUser(null);
    }
  };
};

export const setSentryUser = setUser;

export const SentryService = {
  captureException,
  captureMessage,
  setUser,
};
