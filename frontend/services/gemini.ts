import Groq from 'groq-sdk';
import * as pdfjsLib from 'pdfjs-dist';
import { SongData } from '../types';
import { preprocessChordSheet } from './chordParser';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

const groq = new Groq({
  apiKey: process.env.API_KEY,
  dangerouslyAllowBrowser: true,
});

const systemInstruction = `Eres un músico experto y transcriptor.
Tu tarea es extraer letras y acordes de canciones a partir de texto, imágenes o búsquedas.

REGLA CRÍTICA ANTI-ALUCINACIÓN:
Si NO conoces con certeza la letra COMPLETA y los acordes REALES de la canción pedida, responde ÚNICAMENTE con:
{"error": "No encontré acordes verificados para esta canción. Buscala en Cifraclub o Ultimate Guitar y pegá la letra aquí."}
NUNCA inventes letras. NUNCA inventes acordes. Es preferible devolver error que inventar.

Si SÍ conoces la canción con certeza, responde SOLO con un JSON válido, sin texto adicional ni markdown:
{
  "title": "título de la canción",
  "artist": "artista o banda",
  "originalKey": "tono original (ej. C, G, Am)",
  "lines": ["líneas de la canción..."]
}
Usa formato ChordPro: incrusta los acordes con corchetes '[' y ']' justo antes de la sílaba donde ocurre el cambio.
Ejemplo: "[C]Quiero [G]decirte que [Am]te a[F]mo"
Línea instrumental: "[C]  [G]  [Am]  [F]"
Si hay secciones (Verso, Coro, Puente), agrégalas como líneas de texto sin corchetes.`;

const SCRAPER_URL = 'http://localhost:5001';

// Intenta buscar con el scraper local (Cifraclub). Lanza error si no está disponible.
export const searchWithScraper = async (query: string): Promise<SongData> => {
  const res = await fetch(`${SCRAPER_URL}/scraper-proxy/find?q=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(60000),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error || 'Error del scraper');

  const song = json.song as SongData;
  // Convierte formato tradicional (acordes encima) a ChordPro inline ([Acorde]letra)
  const processed = preprocessChordSheet(song.lines.join('\n'));
  return { ...song, lines: processed.split('\n') };
};

// Verifica si el servidor scraper está corriendo
export const scraperAvailable = async (): Promise<boolean> => {
  try {
    const res = await fetch(`${SCRAPER_URL}/scraper-proxy/ping`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const searchSongText = async (query: string): Promise<SongData> => {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: `Busca la letra y acordes de la canción: ${query}` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('No se recibió respuesta del modelo.');

  const parsed = JSON.parse(text) as SongData & { error?: string };
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
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
  if (!text) throw new Error('No se pudo procesar el archivo.');
  return JSON.parse(text) as SongData;
};

export const fileToBase64 = (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const match = result.match(/^data:(.*?);base64,(.*)$/);
      if (match) resolve({ mimeType: match[1], data: match[2] });
      else reject(new Error('Error al leer el archivo'));
    };
    reader.onerror = error => reject(error);
  });
};
