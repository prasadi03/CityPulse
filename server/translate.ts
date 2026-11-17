import { GoogleGenAI } from '@google/genai';

export type TargetLangCode = 'en' | 'kn' | 'hi';

const LANGUAGE_NAMES: Record<TargetLangCode, string> = {
  en: 'English',
  kn: 'Kannada (ಕನ್ನಡ)',
  hi: 'Hindi (हिन्दी)',
};

const GEMINI_MODEL = 'gemini-3.1-flash-lite';

export async function translateDynamicText(
  text: string,
  targetLang: TargetLangCode
): Promise<string> {
  const clean = text.trim();
  if (!clean) return text;

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 12000,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const languageName = LANGUAGE_NAMES[targetLang] ?? 'English';
  const systemInstruction = `Translate faithfully into ${languageName}. Do not add, remove or change any numbers, dates, times, units, place names or IDs. Keep acronyms unchanged. Return only the translation.`;

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: clean,
    config: {
      systemInstruction,
    },
  });

  const translated = response.text?.trim();
  if (!translated) {
    throw new Error('Empty translation received from Gemini.');
  }
  return translated;
}
