import Groq from 'groq-sdk';
import * as pdfjsLib from 'pdfjs-dist';
import { SongData } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const groq = new Groq({
  apiKey: process.env.API_KEY,
  dangerouslyAllowBrowser: true,
});

const systemInstruction = `Eres un músico experto y transcriptor.
Tu tarea es extraer letras y acordes de canciones a partir de imágenes o búsquedas de texto.
Debes responder SOLO con un JSON válido, sin texto adicional ni markdown, con esta estructura exacta:
{
  "title": "título de la canción",
  "artist": "artista o banda",
  "originalKey": "tono original (ej. C, G, Am)",
  "lines": ["líneas de la canción..."]
}
REGLA MÁS IMPORTANTE: Usa el formato estilo ChordPro para las líneas.
Incrusta los acordes directamente en el texto usando corchetes '[' y ']' justo antes de la palabra o sílaba donde ocurre el cambio de acorde.
Ejemplo correcto: "Y [C]ahora que no [G]estás, [Am]todo es tan [F]distinto."
Ejemplo de intro sin letra: "[C]  [G]  [Am]  [F]"`;

export const searchSongText = async (query: string): Promise<SongData> => {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `Busca la letra y acordes de la canción: ${query}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No se recibió respuesta del modelo.");
  return JSON.parse(text) as SongData;
};

const extractTextFromPdf = async (base64Data: string): Promise<string> => {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return fullText.trim();
};

export const processSongFile = async (mimeType: string, base64Data: string): Promise<SongData> => {
  if (mimeType === 'application/pdf') {
    const pdfText = await extractTextFromPdf(base64Data);
    return searchSongText(`Extrae la letra y acordes de este texto:\n${pdfText}`);
  }

  const response = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [
      { role: 'system', content: systemInstruction },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Data}` }
          },
          { type: 'text', text: 'Extrae la letra y los acordes de este documento.' }
        ] as Groq.Chat.ChatCompletionContentPart[],
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("No se pudo procesar el archivo.");
  return JSON.parse(text) as SongData;
};

export const fileToBase64 = (file: File): Promise<{ mimeType: string, data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        resolve({ mimeType: match[1], data: match[2] });
      } else {
        reject(new Error("Error al leer el archivo"));
      }
    };
    reader.onerror = error => reject(error);
  });
};
