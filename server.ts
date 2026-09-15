import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// Fix for ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Strict Security Headers & CSP (Blocker 7)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Configured CSP specifically to align with AI Studio and Vite mechanics
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data: blob: https://* android-webview-video-poster:; " +
      "media-src 'self' blob:; " +
      "connect-src 'self' https://* wss://* ws://*;"
    );
    next();
  });

  app.use(express.json());

  // API ROOTS FIRST
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'active',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
    });
  });

  // Secure Gemini API Proxy Route
  app.post('/api/ai/process', async (req, res) => {
    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      console.warn('[Server] No valid GEMINI_API_KEY configured. Prompting fallback mock processing.');
      return res.json({
        text: `### Insight Summary (No API Key Configured)\nYour voice journal was analyzed successfully locally, but the server does not have an active Gemini API Key configured in settings. Go to the Settings panel in AI Studio and configure GEMINI_API_KEY to see live models.`,
        tokensUsed: 0,
        provider: 'Google Gemini (Mocked Key)',
      });
    }

    try {
      // Lazy initialization of the GoogleGenAI client (avoids crash on load)
      const ai = new GoogleGenAI({ apiKey });
      
      console.log('[Server] Dispatching requests to Gemini API...');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || 'You are an empathetic, clinical journaling assistant.',
          maxOutputTokens: 800,
          temperature: 0.7,
        },
      });

      const responseText = response.text || 'No thoughts generated.';
      
      res.json({
        text: responseText,
        tokensUsed: response.usageMetadata?.totalTokenCount || 250,
        provider: 'Google Gemini 3.5 (Flash)',
      });
    } catch (err: any) {
      console.error('[Server] Gemini SDK execution error:', err);
      res.status(500).json({
        error: 'Gemini processing failed.',
        details: err.message || err,
      });
    }
  });

  // VITE DEV MIDDLEWARE vs PRODUCTION STATIC BUNDLE
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Launching in Development Mode with Vite Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Launching in Production Mode serving static files...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LogEasy Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((e) => {
  console.error('[Server] Severe crash on bootstrap:', e);
});
