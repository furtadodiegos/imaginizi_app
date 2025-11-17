import { GoogleGenAI, Part } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';

import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SentryService, withSentryUser } from '@/lib/services/sentry';

export const runtime = 'nodejs';

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const postHandler = async (req: NextRequest, session: Session) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: session.user.email! } });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (process.env.NODE_ENV === 'production' && user.quota <= 0) {
      SentryService.captureMessage('User out of quota', { params: { route: 'api/image', method: 'POST' } });
      return NextResponse.json({ error: 'User out of quota' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const prompt = formData.get('prompt') as string | null;

    if (!file || !prompt) {
      SentryService.captureMessage('Missing image or prompt', { params: { route: 'api/image', method: 'POST' } });
      return NextResponse.json({ error: 'Missing image or prompt' }, { status: 400 });
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

    const promptSafe = String(prompt).trim().slice(0, 200);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const inlineImage = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: mime,
      },
    };

    const [character, ...universe] = promptSafe.split(' ');

    const text_prompt = `Transform the person in the photo so that they become the character: ${character}.

Important instructions:
1. **Transformation, not companionship**: The person in the photo should be transformed into the character. Do NOT place them next to the character in a scene.
2. **Recognizable face**: Keep the essential facial features of the original person so they remain recognizable, if the character uses a mask, make without the mask.
2. **Focus on the face and pose**: Keep the face in focus, if the character uses a mask, make without the mask, keep the pose of the original person.
3. **Character style**: Adapt clothes, hair, body, and the background to reflect the universe and appearance of ${universe.join(' ')}.
4. **Quality**: Generate a high-quality image, with cinematic lighting and realistic style.`.trim();

    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: [
            inlineImage,
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

export const POST = withSentryUser(requireAuth(postHandler));
