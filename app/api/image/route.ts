import { GoogleGenAI, Part } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { withValidatedImageRequest } from '@/lib/api/withValidatedImageRequest';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SentryService, withSentryUser } from '@/lib/services/sentry';
import { buildImagePrompt } from '@/lib/utils/imagePrompt';

export const runtime = 'nodejs';

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const postHandler = async (
  req: NextRequest,
  session: Session,
  validated: {
    inlineImage: { inlineData: { data: string; mimeType: string } };
    prompt: string;
    context: string | null;
  },
) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (process.env.NODE_ENV === 'production' && user.quota <= 0) {
      SentryService.captureMessage('User out of quota', { params: { route: 'api/image', method: 'POST' } });

      return NextResponse.json({ error: 'User out of quota' }, { status: 403 });
    }

    const text_prompt = buildImagePrompt(validated.prompt, validated.context);

    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: [
            validated.inlineImage,
            {
              text: text_prompt,
            },
          ],
        },
      ],
    });

    const candidate = result.candidates?.[0];
    const partWithImage = candidate?.content?.parts?.find((p: Part) => p.inlineData);

    if (!partWithImage?.inlineData?.data) throw new Error('Gemini did not return image');

    const base64 = partWithImage.inlineData.data as string;
    const mimeType = partWithImage.inlineData.mimeType || 'image/png';

    await prisma.user.update({
      where: { id: user.id },
      data: {
        used: { increment: 1 },
        quota: { decrement: 1 },
      },
    });

    return NextResponse.json({
      image: `data:${mimeType};base64,${base64}`,
    });
  } catch (e) {
    SentryService.captureException(e, { params: { route: 'api/image', method: 'POST' } });

    return NextResponse.json({ error: `Internal error: ${(e as Error)?.message || 'Unknown'}` }, { status: 500 });
  }
};

export const POST = withSentryUser(requireAuth(withValidatedImageRequest(postHandler)));
