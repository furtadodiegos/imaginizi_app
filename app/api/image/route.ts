import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs"; // garante Node runtime (SDK pede Node 20+)

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    console.log(">>>", "POST", req.body);

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string | null;

    if (!file || !prompt) {
      return NextResponse.json(
        { error: "Faltou imagem ou prompt" },
        { status: 400 }
      );
    }

    // Lê a imagem enviada (binary -> base64)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const inlineImage = {
      inlineData: {
        data: buffer.toString("base64"),
        mimeType: file.type || "image/png",
      },
    };

    console.log(">>>", "1");
    // Modelo de imagem do Gemini (Nano Banana / Flash Image)
    // Ver docs: gemini-2.5-flash-image / imagem & edição. :contentReference[oaicite:2]{index=2}
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
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

    console.log(">>>", "2");

    const candidate = result.candidates?.[0];
    const partWithImage = candidate?.content?.parts?.find(
      (p: any) => p.inlineData
    ) as any;

    console.log(">>>", "3");

    if (!partWithImage?.inlineData?.data) {
      console.error(
        "Nenhuma imagem retornada",
        JSON.stringify(result, null, 2)
      );
      return NextResponse.json(
        { error: "Gemini não retornou imagem" },
        { status: 500 }
      );
    }

    console.log(">>>", "4");
    const base64 = partWithImage.inlineData.data as string;
    const mimeType = partWithImage.inlineData.mimeType || "image/png";

    console.log(">>>", "5");

    return NextResponse.json({
      image: `data:${mimeType};base64,${base64}`,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erro interno com o Gemini" },
      { status: 500 }
    );
  }
}

// >>> 2 {
//   "sdkHttpResponse": {
//     "headers": {
//       "alt-svc": "h3=\":443\"; ma=2592000,h3-29=\":443\"; ma=2592000",
//       "content-encoding": "gzip",
//       "content-type": "application/json; charset=UTF-8",
//       "date": "Sun, 09 Nov 2025 17:11:54 GMT",
//       "server": "scaffolding on HTTPServer2",
//       "server-timing": "gfet4t7; dur=12617",
//       "transfer-encoding": "chunked",
//       "vary": "Origin, X-Origin, Referer",
//       "x-content-type-options": "nosniff",
//       "x-frame-options": "SAMEORIGIN",
//       "x-xss-protection": "0"
//     }
//   },
//   "candidates": [
//     {
//       "content": {
//         "parts": [
//           {
//             "text": "Com certeza! Aqui está você como Buzz Lightyear, mantendo o seu rosto reconhecível e com uma iluminação bonita e realista:\n\n"
//           },
//           {
//             "inlineData": {
//               "mimeType": "image/png",
//               // "data": "iVBORw0KGgoAAAANSUhEUgAABKAAAANg"
//             }
//           }
//         ],
//         "role": "model"
//       },
//       "finishReason": "STOP",
//       "index": 0
//     }
//   ],
//   "modelVersion": "gemini-2.5-flash-image",
//   "responseId": "WssQaaTPDprpz7IPmoG3qQ0",
//   "usageMetadata": {
//     "promptTokenCount": 323,
//     "candidatesTokenCount": 1319,
//     "totalTokenCount": 1642,
//     "promptTokensDetails": [
//       {
//         "modality": "TEXT",
//         "tokenCount": 65
//       },
//       {
//         "modality": "IMAGE",
//         "tokenCount": 258
//       }
//     ],
//     "candidatesTokensDetails": [
//       {
//         "modality": "IMAGE",
//         "tokenCount": 1290
//       }
//     ]
//   }
// }
