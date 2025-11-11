import { GoogleGenAI, Part } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (user.quota <= 0) {
      return NextResponse.json({ error: 'User out of quota' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const prompt = formData.get('prompt') as string | null;

    if (!file || !prompt) {
      return NextResponse.json({ error: 'Faltou imagem ou prompt' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const inlineImage = {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType: file.type || 'image/png',
      },
    };

    const result = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          role: 'user',
          parts: [
            inlineImage,
            {
              text: `
Você recebeu uma foto de uma pessoa.
A pessoa da foto quer ficar parecido com: ${prompt}.
Mantenha o rosto reconhecível, estilo realista, iluminação bonita, foto com qualidade alta.
Não mude traços principais do rosto, apenas roupa, cenário e estilo.
              `.trim(),
            },
          ],
        },
      ],
    });

    const candidate = result.candidates?.[0];
    const partWithImage = candidate?.content?.parts?.find((p: Part) => p.inlineData);

    if (!partWithImage?.inlineData?.data) {
      console.error('Nenhuma imagem retornada', JSON.stringify(result, null, 2));

      return NextResponse.json({ error: 'Gemini não retornou imagem' }, { status: 500 });
    }

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
    console.error(e);

    return NextResponse.json({ error: 'Erro interno com o Gemini' }, { status: 500 });
  }
}
