import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function proxy(req: NextRequest) {
  const token = await getToken({ req });

  const requestHeaders = new Headers(req.headers);

  if (token?.sub) requestHeaders.set('x-user-id', String(token.sub));
  if (token?.email) requestHeaders.set('x-user-email', String(token.email));
  if (token?.name) requestHeaders.set('x-user-name', String(token.name));

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
