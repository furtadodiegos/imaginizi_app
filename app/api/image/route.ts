import { GoogleGenAI, Part } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
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

    return NextResponse.json({
      image: `data:${mimeType};base64,${base64}`,
    });
  } catch (e) {
    console.error(e);

    return NextResponse.json({ error: 'Erro interno com o Gemini' }, { status: 500 });
  }
}
