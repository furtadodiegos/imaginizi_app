import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { SentryService } from '@/lib/services/sentry';

type ValidatedImageRequest = {
  file: File;
  mime: string;
  prompt: string;
  context: string | null;
  inlineImage: {
    inlineData: {
      data: string;
      mimeType: string;
    };
  };
};

type HandlerWithValidatedImage = (
  req: NextRequest,
  session: Session,
  validated: ValidatedImageRequest,
) => Promise<NextResponse> | NextResponse;

export function withValidatedImageFieldsRequest(handler: HandlerWithValidatedImage) {
  return async (req: NextRequest, session: Session): Promise<NextResponse> => {
    try {
      const formData = await req.formData();

      const file = formData.get('image');
      if (!(file instanceof File)) {
        SentryService.captureMessage('Missing image', { params: { route: 'api/image', method: 'POST' } });
        return NextResponse.json({ error: 'Missing image' }, { status: 400 });
      }

      const allowedTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
      const mime = file.type || 'application/octet-stream';
      if (!allowedTypes.has(mime)) {
        return NextResponse.json({ error: 'Unsupported image type. Use PNG, JPEG or WEBP.' }, { status: 415 });
      }

      const MAX_SIZE = 8 * 1024 * 1024;
      if (typeof file.size === 'number' && file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'Image too large (max 8MB).' }, { status: 413 });
      }

      const promptRaw = formData.get('prompt');
      const prompt = typeof promptRaw === 'string' ? promptRaw.trim() : '';
      if (!prompt) {
        SentryService.captureMessage('Missing prompt', { params: { route: 'api/image', method: 'POST' } });
        return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
      }

      const contextRaw = formData.get('context');
      const context = typeof contextRaw === 'string' && contextRaw.length ? contextRaw : null;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const inlineImage = {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: mime,
        },
      };

      return handler(req, session, {
        file,
        mime,
        prompt,
        context,
        inlineImage,
      });
    } catch (error) {
      SentryService.captureException(error, { params: { route: 'api/image', method: 'POST', stage: 'validation' } });
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }
  };
}
