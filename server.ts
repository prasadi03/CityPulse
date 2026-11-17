import express, { type NextFunction, type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load dotenv at the very top before reading process.env or starting routes
const shouldOverride = !process.env.GEMINI_API_KEY;
dotenv.config({ path: path.resolve(__dirname, '.env'), override: shouldOverride });
dotenv.config({
  path: path.resolve(__dirname, 'server', '.env'),
  override: !process.env.GEMINI_API_KEY,
});

import { handleNagaraChat, type NagaraRequestBody } from './server/nagara.ts';
import { translateDynamicText, type TargetLangCode } from './server/translate.ts';

function checkStartupSecrets() {
  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.warn(
      '[NagaraAI] Warning: GEMINI_API_KEY is not configured on the server. Add it to .env or Settings > Secrets.'
    );
  } else {
    console.log('[NagaraAI] GEMINI_API_KEY detected on server.');
  }
}

async function startServer() {
  checkStartupSecrets();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Parse JSON request bodies before routes
  app.use(express.json({ limit: '1mb' }));

  // 1. Health Check Route
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  // 2. NagaraAI Chat Route
  app.post('/api/nagara/chat', async (req: Request, res: Response) => {
    try {
      if (!process.env.GEMINI_API_KEY?.trim()) {
        res.status(500).json({
          reply: '',
          error: 'GEMINI_API_KEY is not configured on the server',
        });
        return;
      }
      const body = (req.body ?? {}) as NagaraRequestBody;
      const result = await handleNagaraChat(body);
      res.status(200).json(result);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to process NagaraAI request.';
      const status = message.includes('is not configured on the server')
        ? 500
        : 502;
      res.status(status).json({ reply: '', error: message });
    }
  });

  // 2b. Dynamic Civic Content Translation Route (announcements, worker replies, citizen reports)
  app.post('/api/translate', async (req: Request, res: Response) => {
    try {
      if (!process.env.GEMINI_API_KEY?.trim()) {
        res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server',
        });
        return;
      }
      const rawText = typeof req.body?.text === 'string' ? req.body.text : '';
      const rawLang = typeof req.body?.targetLang === 'string' ? req.body.targetLang : 'en';
      const targetLang: TargetLangCode =
        rawLang === 'kn' || rawLang === 'hi' ? rawLang : 'en';

      if (!rawText.trim()) {
        res.status(400).json({ error: 'Text to translate is required.' });
        return;
      }

      const translation = await translateDynamicText(rawText, targetLang);
      res.status(200).json({ translation });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Translation request failed.';
      res.status(502).json({ error: message });
    }
  });

  // 3. Unknown /api routes MUST return JSON 404 (never fall through to SPA HTML)
  app.use('/api', (req: Request, res: Response) => {
    res.status(404).json({
      reply: '',
      error: `API route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // 4. Final /api error handler: always return JSON, never HTML
  app.use(
    '/api',
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const status =
        typeof err === 'object' &&
        err !== null &&
        'status' in err &&
        typeof (err as { status?: unknown }).status === 'number'
          ? (err as { status: number }).status
          : 500;
      const message =
        err instanceof Error ? err.message : 'Unexpected server API error.';
      res.status(status).json({ reply: '', error: message });
    }
  );

  // 5. Frontend Vite / Static Assets (strictly skip /api paths)
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      vite.middlewares(req, res, next);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CityPulse Bengaluru server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start CityPulse Bengaluru server:', err);
  process.exit(1);
});
