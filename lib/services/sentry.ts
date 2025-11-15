import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';

type RouteContext = { params?: Record<string, string | string[]> } | undefined;

type ExtraContext = Record<string, unknown> | RouteContext;

export const captureException = (error: unknown, context?: ExtraContext) => {
  Sentry.captureException(error, { extra: context });
};

export const captureMessage = (message: string, context?: ExtraContext) => {
  Sentry.captureMessage(message, { extra: context });
};

export type SentryUserInput = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
} | null;

export const setUser = (user: SentryUserInput) => {
  if (user) {
    Sentry.setUser({
      id: user.id ?? undefined,
      email: user.email ?? undefined,
      username: user.name ?? undefined,
    });
  } else {
    Sentry.setUser(null);
  }
};

export const setUserFromRequest = (req: NextRequest) => {
  const id = req.headers.get('x-user-id') ?? undefined;
  const email = req.headers.get('x-user-email') ?? undefined;
  const name = req.headers.get('x-user-name') ?? undefined;
  setUser({ id, email, name });
};

export const withSentryUser = (handler: (req: NextRequest) => Promise<Response> | Response) => {
  return async (req: NextRequest) => {
    setUserFromRequest(req);
    try {
      return await handler(req);
    } finally {
      Sentry.setUser(null);
    }
  };
};

export const withSentryUserCtx = <Params extends Record<string, string | string[]>>(
  handler: (req: NextRequest, context: { params: Params }) => Promise<Response> | Response,
) => {
  return async (req: NextRequest, context: { params: Params }) => {
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
