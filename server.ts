import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

// Determine base directory safely in both ESM (tsx dev) and CommonJS (bundled dist/server.cjs)
const getDirname = (): string => {
  if (typeof __dirname !== 'undefined') {
    return __dirname;
  }
  return process.cwd();
};

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
        model: 'gemini-3.8-flash',
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
        provider: 'Google Gemini 3.8 (Flash)',
      });
    } catch (err: any) {
      console.error('[Server] Gemini SDK execution error:', err);
      res.status(500).json({
        error: 'Gemini processing failed.',
        details: err.message || err,
      });
    }
  });

  // Streaming Gemini API Proxy Route (SSE - Server-Sent Events)
  app.post('/api/ai/stream', async (req, res) => {
    const { prompt, systemInstruction } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      const fallbackText = "### Insight Summary (Offline/Simulated)\nYour thought was captured and analyzed locally. Connect your GEMINI_API_KEY to enable live multi-agent intelligence.";
      const words = fallbackText.split(' ');
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ chunk: word + ' ' })}\n\n`);
        await new Promise(r => setTimeout(r, 25));
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const stream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || 'You are an empathetic, deep-listening journaling companion.',
          maxOutputTokens: 1000,
          temperature: 0.7,
        }
      });

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      console.error('[Server] Gemini Stream error:', err);
      res.write(`data: ${JSON.stringify({ error: err.message || 'Stream processing failed.' })}\n\n`);
      res.end();
    }
  });

  // Determine if running compiled production bundle vs live development tsx
  const isProduction = process.env.NODE_ENV === 'production' || 
    (Boolean(process.argv[1]) && (process.argv[1].endsWith('server.cjs') || process.argv[1].endsWith('server.js')));

  // VITE DEV MIDDLEWARE vs PRODUCTION STATIC BUNDLE
  if (!isProduction) {
    console.log('[Server] Launching in Development Mode with Vite Middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Launching in Production Mode serving static files...');
    // Look for dist/ directory whether running from workspace root or inside dist/
    const currentDir = getDirname();
    const candidatePaths = [
      path.join(process.cwd(), 'dist'),
      path.resolve(currentDir, 'dist'),
      currentDir,
      path.resolve(currentDir, '..', 'dist'),
    ];

    const distPath = candidatePaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || candidatePaths[0];
    console.log(`[Server] Static assets resolved at: ${distPath}`);

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Production build not found. Please ensure "npm run build" has run.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LogEasy Server] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  // Graceful shutdown handling for container lifecycle events (Render, Cloud Run, Docker)
  const handleShutdown = (signal: string) => {
    console.log(`[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[Server] HTTP server closed cleanly.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

startServer().catch((e) => {
  console.error('[Server] Severe crash on bootstrap:', e);
});
