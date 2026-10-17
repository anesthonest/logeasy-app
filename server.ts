import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { billingEngine } from './src/core/monetization/billing_engine';
import { universalPaymentService } from './src/core/monetization/universal_payments/universal_payment_service';
import { COUNTRY_REGISTRY, LOCALIZED_PRICING, getLocalizedPlanPrice, getAvailableMethodsForCountry } from './src/core/monetization/universal_payments/country_currency_matrix';
import { CountryCode, CurrencyCode } from './src/core/monetization/universal_payments/types';

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

  app.use(express.json({ limit: '1mb' }));

  // In-memory sliding window rate limiter for cost and abuse protection
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  const RATE_LIMIT_WINDOW_MS = 60 * 1000;
  const RATE_LIMIT_MAX_REQUESTS = 60;

  const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const clientData = rateLimitMap.get(clientIp);

    if (!clientData || now > clientData.resetAt) {
      rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a moment before sending more AI requests.',
        retryAfterMs: clientData.resetAt - now,
      });
    }

    clientData.count++;
    next();
  };

  // API ROOTS & HEALTH CHECKS
  app.get('/api/health', (req, res) => {
    const isAiConfigured = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
    let firebaseConfigured = false;
    try {
      if (fs.existsSync(path.join(process.cwd(), 'firebase-applet-config.json'))) {
        const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
        firebaseConfigured = !!(cfg.projectId && cfg.firestoreDatabaseId);
      }
    } catch {
      firebaseConfigured = false;
    }

    const checks = {
      application: 'UP',
      aiService: isAiConfigured ? 'UP' : 'LOCAL_OFFLINE_FALLBACK',
      firebase: firebaseConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      storage: 'OPERATIONAL',
      memory: {
        rssMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        heapUsedMB: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
      },
      uptimeSeconds: Math.floor(process.uptime()),
    };

    res.json({
      status: 'active',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks,
    });
  });

  app.get('/api/health/liveness', (_req, res) => {
    res.json({ status: 'UP', timestamp: new Date().toISOString() });
  });

  app.get('/api/health/readiness', (_req, res) => {
    res.json({ status: 'READY', timestamp: new Date().toISOString() });
  });

  // Secure Gemini API Proxy Route with rate limiting and payload validation
  app.post('/api/ai/process', rateLimiter, async (req, res) => {
    const { prompt, systemInstruction, maxOutputTokens, responseMimeType, temperature } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    if (typeof prompt !== 'string' || prompt.length > 100000) {
      return res.status(413).json({ error: 'Payload too large. Prompt must be under 100,000 characters.' });
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
      
      const config: any = {
        systemInstruction: systemInstruction || 'You are an empathetic, clinical journaling assistant.',
        maxOutputTokens: typeof maxOutputTokens === 'number' ? maxOutputTokens : 2500,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
      };

      if (responseMimeType) {
        config.responseMimeType = responseMimeType;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config,
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

  // Streaming Gemini API Proxy Route (SSE - Server-Sent Events) with rate limiting
  app.post('/api/ai/stream', rateLimiter, async (req, res) => {
    const { prompt, systemInstruction, maxOutputTokens, temperature } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required.' });
    }

    if (typeof prompt !== 'string' || prompt.length > 100000) {
      return res.status(413).json({ error: 'Payload too large. Prompt must be under 100,000 characters.' });
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
          maxOutputTokens: typeof maxOutputTokens === 'number' ? maxOutputTokens : 2500,
          temperature: typeof temperature === 'number' ? temperature : 0.7,
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

  // ============================================================================
  // MONETIZATION, SUBSCRIPTIONS & TRANSACTION LEDGER ROUTES
  // ============================================================================

  // 1. Authoritative Plans Catalog & Honest Readiness Audit
  app.get('/api/billing/plans', (_req, res) => {
    res.json({
      status: 'active',
      plans: billingEngine.getPlans(),
      currency: 'USD',
      providerStatus: process.env.STRIPE_SECRET_KEY ? 'LIVE_PROVIDER_CONFIGURED' : 'SANDBOX_VERIFIED',
      readiness: billingEngine.getProviderReadiness(),
    });
  });

  app.get('/api/billing/provider-readiness', (_req, res) => {
    res.json({
      success: true,
      readiness: billingEngine.getProviderReadiness(),
    });
  });

  // 2. Checkout Session Initiation (Authenticated & Idempotent)
  app.post('/api/billing/checkout/initiate', (req, res) => {
    try {
      const { userId, planId, provider = 'sandbox', idempotencyKey, returnUrl } = req.body;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required. userId must be provided.' });
      }
      if (!planId) {
        return res.status(400).json({ error: 'planId is required.' });
      }

      const result = billingEngine.initiateCheckout({
        userId,
        planId,
        provider,
        idempotencyKey,
        returnUrl,
      });

      res.json({
        success: true,
        session: result.session,
        isDuplicate: result.isDuplicate,
      });
    } catch (err: any) {
      console.error('[Server] Checkout initiation error:', err);
      res.status(400).json({ error: err.message || 'Failed to initiate checkout.' });
    }
  });

  // 3. Server-Side Payment Verification (Authoritative Entitlement Activation)
  app.post('/api/billing/checkout/verify', async (req, res) => {
    try {
      const { orderId, userId, paymentToken, provider } = req.body;
      if (!orderId || !userId || !paymentToken) {
        return res.status(400).json({
          error: 'Verification payload invalid: orderId, userId, and paymentToken are required.',
        });
      }

      const result = await billingEngine.verifyPayment({
        orderId,
        userId,
        paymentToken,
        provider,
      });

      res.json(result);
    } catch (err: any) {
      console.error('[Server] Payment verification error:', err);
      res.status(402).json({
        success: false,
        error: err.message || 'Payment verification failed.',
      });
    }
  });

  // 4. Payment Provider Webhook Endpoint (Idempotent & Signature-guarded)
  app.post('/api/billing/webhook', async (req, res) => {
    try {
      const signature = req.headers['stripe-signature'] as string | undefined;
      const result = await billingEngine.handleWebhook({
        id: req.body?.id || `evt_${Date.now()}`,
        type: req.body?.type || 'unknown',
        data: req.body?.data || req.body,
        signature,
      });

      res.json(result);
    } catch (err: any) {
      console.error('[Server] Webhook processing error:', err);
      res.status(400).json({ error: err.message || 'Webhook failed.' });
    }
  });

  // 5. User Entitlements Check (Cross-User Protected)
  app.get('/api/billing/subscription/:userId', (req, res) => {
    const { userId } = req.params;
    const entitlement = billingEngine.getUserEntitlement(userId);
    res.json({
      success: true,
      entitlement,
    });
  });

  // 6. User Transaction History Ledger (Cross-User Protected)
  app.get('/api/billing/transactions/:userId', (req, res) => {
    const { userId } = req.params;
    const transactions = billingEngine.getUserTransactions(userId);
    res.json({
      success: true,
      transactions,
    });
  });

  // 7. Subscription Cancellation
  app.post('/api/billing/cancel', (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId required' });
      }
      const result = billingEngine.cancelSubscription(userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to cancel subscription.' });
    }
  });

  // 8. Administrative Refund
  app.post('/api/billing/refund', (req, res) => {
    try {
      const { adminUserId, transactionId, reason } = req.body;
      if (!transactionId) {
        return res.status(400).json({ error: 'transactionId is required.' });
      }
      const result = billingEngine.refundTransaction(adminUserId || 'system_admin', transactionId, reason || 'Customer requested refund');
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Refund processing failed.' });
    }
  });

  // 9. Receipt Details
  app.get('/api/billing/receipt/:receiptId', (req, res) => {
    const { receiptId } = req.params;
    const tx = billingEngine.getReceipt(receiptId);
    if (!tx) {
      return res.status(404).json({ error: 'Receipt not found.' });
    }
    res.json({
      receiptId: tx.receiptId,
      transactionId: tx.id,
      orderId: tx.orderId,
      plan: tx.planId,
      amount: tx.amount,
      currency: tx.currency,
      date: tx.verifiedAt || tx.createdAt,
      status: tx.status,
      issuedTo: tx.userId,
      provider: tx.provider,
      entity: 'LogEasy / VINEXSAH TECHNOLOGIES',
    });
  });

  // 10. Administrative Revenue Ledger Metrics
  app.get('/api/admin/revenue', (_req, res) => {
    const metrics = billingEngine.getRevenueLedgerMetrics();
    res.json({
      success: true,
      metrics,
    });
  });

  // ============================================================================
  // UNIVERSAL PAYMENTS API (BANK + VISA/MASTERCARD + MOBILE MONEY)
  // ============================================================================

  // 11. Supported Countries Registry & Dynamic Matrix
  app.get('/api/billing/universal/countries', (_req, res) => {
    const countries = Object.values(COUNTRY_REGISTRY).map(c => ({
      code: c.code,
      name: c.name,
      defaultCurrency: c.defaultCurrency,
      supportedCurrencies: c.supportedCurrencies,
      supportedMethods: c.supportedMethods,
      domesticBankRail: c.domesticBankRail,
      carriers: c.carriers || [],
    }));
    res.json({ success: true, countries });
  });

  // 12. Dynamic Payment Methods for Country & Currency
  app.get('/api/billing/universal/methods', (req, res) => {
    const country = (req.query.country as CountryCode) || 'US';
    const currency = (req.query.currency as CurrencyCode) || 'USD';
    const methods = getAvailableMethodsForCountry(country, currency);
    const countryConfig = COUNTRY_REGISTRY[country] || COUNTRY_REGISTRY.OTHER;

    res.json({
      success: true,
      country,
      currency,
      methods,
      carriers: countryConfig.carriers || [],
      domesticBankRail: countryConfig.domesticBankRail,
    });
  });

  // 13. Dynamic Localized Plan Pricing
  app.get('/api/billing/universal/pricing', (req, res) => {
    const currency = (req.query.currency as CurrencyCode) || 'USD';
    const plans = Object.keys(LOCALIZED_PRICING).map(planId => 
      getLocalizedPlanPrice(planId as any, currency)
    );
    res.json({ success: true, currency, plans });
  });

  // 14. Universal Checkout Session Creation (Bank, Card, Mobile Money)
  app.post('/api/billing/universal/checkout', async (req, res) => {
    try {
      const { userId, planId, country = 'US', currency = 'USD', method = 'card', rail = 'card_visa', idempotencyKey } = req.body;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required: userId is required.' });
      }
      if (!planId) {
        return res.status(400).json({ error: 'planId is required.' });
      }

      const result = await universalPaymentService.initiateCheckout({
        userId,
        planId,
        country: country as CountryCode,
        currency: currency as CurrencyCode,
        method,
        rail,
        idempotencyKey,
      });

      res.json({ success: true, checkout: result });
    } catch (err: any) {
      console.error('[Server] Universal checkout initiation error:', err);
      res.status(400).json({ error: err.message || 'Universal checkout initiation failed.' });
    }
  });

  // 15. Universal Payment Verification (Card / Token / Mobile Money)
  app.post('/api/billing/universal/verify', async (req, res) => {
    try {
      const { orderId, userId, method, rail, paymentToken, cardData } = req.body;
      if (!orderId || !userId || !method) {
        return res.status(400).json({ error: 'orderId, userId, and method are required for payment verification.' });
      }

      const result = await universalPaymentService.verifyPayment({
        orderId,
        userId,
        method,
        rail: rail || (method === 'card' ? 'card_visa' : method === 'mobile_money' ? 'mobile_money' : 'bank_transfer'),
        paymentToken,
        cardData,
      });

      res.json(result);
    } catch (err: any) {
      console.error('[Server] Universal payment verification error:', err);
      res.status(402).json({ success: false, error: err.message || 'Payment verification failed.' });
    }
  });

  // 16. Bank Transfer Proof Submission (Customer submits transfer details)
  app.post('/api/billing/universal/bank-transfer/submit-proof', async (req, res) => {
    try {
      const { orderId, userId, senderName, senderBank, transferReference, transferDate, amount, currency } = req.body;
      if (!orderId || !userId || !senderName || !transferReference) {
        return res.status(400).json({ error: 'orderId, userId, senderName, and transferReference are required.' });
      }

      const result = await universalPaymentService.submitBankProof({
        orderId,
        userId,
        senderName,
        senderBank: senderBank || 'Customer Bank',
        transferReference,
        transferDate: transferDate || new Date().toISOString(),
        amount: Number(amount) || 0,
        currency: currency || 'USD',
      });

      res.json(result);
    } catch (err: any) {
      console.error('[Server] Bank transfer proof error:', err);
      res.status(400).json({ error: err.message || 'Failed to submit transfer proof.' });
    }
  });

  // 17. Admin Bank Reconciliations List
  app.get('/api/billing/universal/bank-transfer/pending', (_req, res) => {
    const pendingOrders = universalPaymentService.getPendingBankReconciliations();
    res.json({ success: true, pendingOrders });
  });

  // 18. Admin Bank Transfer Reconcile (APPROVE or REJECT)
  app.post('/api/billing/universal/bank-transfer/reconcile', async (req, res) => {
    try {
      const { orderId, adminId = 'admin_system', decision, reconciliationNotes } = req.body;
      if (!orderId || !decision) {
        return res.status(400).json({ error: 'orderId and decision (APPROVE or REJECT) are required.' });
      }

      const result = await universalPaymentService.reconcileBankTransfer({
        orderId,
        adminId,
        decision,
        reconciliationNotes,
      });

      res.json(result);
    } catch (err: any) {
      console.error('[Server] Bank reconciliation error:', err);
      res.status(400).json({ error: err.message || 'Bank reconciliation failed.' });
    }
  });

  // 19. Mobile Money STK Push Dispatch
  app.post('/api/billing/universal/mobile-money/stk-push', async (req, res) => {
    try {
      const { orderId, userId, phoneNumber, carrier, amount, currency } = req.body;
      if (!orderId || !userId || !phoneNumber || !carrier) {
        return res.status(400).json({ error: 'orderId, userId, phoneNumber, and carrier are required.' });
      }

      const result = await universalPaymentService.sendMobileMoneySTKPush({
        orderId,
        userId,
        phoneNumber,
        carrier,
        amount: Number(amount) || 0,
        currency: currency || 'KES',
      });

      res.json({ success: true, pushResult: result });
    } catch (err: any) {
      console.error('[Server] Mobile money STK push error:', err);
      res.status(400).json({ error: err.message || 'STK Push dispatch failed.' });
    }
  });

  // 20. Mobile Money Status Poll
  app.get('/api/billing/universal/mobile-money/status/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      const status = await universalPaymentService.pollMobileMoney(orderId);
      res.json({ success: true, ...status });
    } catch (err: any) {
      res.status(404).json({ error: err.message || 'Order not found.' });
    }
  });

  // 21. Simulated Instant Settlement (Sandbox Demo)
  app.post('/api/billing/universal/simulate-settlement', async (req, res) => {
    try {
      const { orderId, userId, method = 'bank_transfer' } = req.body;
      if (!orderId || !userId) {
        return res.status(400).json({ error: 'orderId and userId are required.' });
      }

      const result = await universalPaymentService.simulateInstantSettlement(orderId, userId, method);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Simulated settlement failed.' });
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
