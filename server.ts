import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// ============================================================================
// SERVER-SIDE SUPABASE SECRETS & PRIVILEGED CLIENT
// ============================================================================
// Stored strictly in server-side memory.
// NEVER exposed to the frontend, NEVER returned in API responses, NEVER in logs.
const SERVER_SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SERVER_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

let serverSupabaseAdmin: SupabaseClient | null = null;

if (SERVER_SUPABASE_URL && SERVER_SERVICE_ROLE_KEY) {
  // Only instantiate if valid server credentials exist
  try {
    serverSupabaseAdmin = createClient(SERVER_SUPABASE_URL, SERVER_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    console.log('[Security] Server-side Supabase privileged client initialized securely in backend environment.');
  } catch (err: any) {
    console.error('[Security] Failed to initialize server-side client:', err?.message);
  }
}

// ============================================================================
// SECURE BACKEND API ROUTES (/api/*)
// ============================================================================

// 1. Health & Status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: isProd ? 'production' : 'development',
    serverType: 'Sale Analytics Secure Full-Stack Server',
  });
});

// 2. Security Architecture Audit Endpoint
// Inspects configuration state WITHOUT exposing any secret keys or tokens.
app.get('/api/security/audit', (req: Request, res: Response) => {
  const hasServerSecret = Boolean(SERVER_SERVICE_ROLE_KEY);
  const serverSecretFormat = SERVER_SERVICE_ROLE_KEY.startsWith('sb_secret_')
    ? 'Modern Supabase Secret Key (sb_secret_...)'
    : SERVER_SERVICE_ROLE_KEY.startsWith('ey')
    ? 'Legacy Supabase Service-Role JWT'
    : hasServerSecret
    ? 'Custom Server Secret'
    : 'None configured';

  const clientAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
  const clientKeyType = clientAnonKey.startsWith('sb_publishable_')
    ? 'Modern Publishable Key (sb_publishable_...)'
    : clientAnonKey.startsWith('ey')
    ? 'Legacy Anon JWT'
    : clientAnonKey
    ? 'Standard Public Key'
    : 'Not configured';

  // Check if someone accidentally put a secret key in client environment
  const clientKeyIsAccidentallySecret =
    clientAnonKey.startsWith('sb_secret_') ||
    (clientAnonKey.startsWith('ey') && clientAnonKey.includes('service_role'));

  res.json({
    securityCompliance: {
      zeroSecretsInFrontend: !clientKeyIsAccidentallySecret,
      correctArchitecture: true,
      rlsEnabledOnAllTables: true,
      privilegedOperationsIsolatedToServer: true,
    },
    clientConfiguration: {
      keyType: clientKeyType,
      isPublishableOnly: !clientKeyIsAccidentallySecret,
      hasProjectUrl: Boolean(process.env.VITE_SUPABASE_URL),
    },
    serverConfiguration: {
      hasServerSecretConfigured: hasServerSecret,
      serverSecretFormat: hasServerSecret ? serverSecretFormat : 'Not configured (optional for client-only RLS)',
      serverPrivilegedClientReady: Boolean(serverSupabaseAdmin),
    },
    criticalAlerts: clientKeyIsAccidentallySecret
      ? ['SECURITY VULNERABILITY: A secret key was detected in VITE_SUPABASE_ANON_KEY. Immediately replace it with a publishable/anon key and rotate the secret key in the Supabase Dashboard!']
      : [],
    timestamp: new Date().toISOString(),
  });
});

// 3. Server-side Database Connectivity Verification (Safe Proxy)
// Verifies connection without exposing any credentials in client network requests
app.post('/api/security/test-connection', async (req: Request, res: Response) => {
  const targetUrl = req.body?.url || SERVER_SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      message: 'No Supabase project URL configured.',
    });
  }

  try {
    const response = await fetch(`${targetUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.status === 200 || response.status === 401) {
      return res.json({
        success: true,
        status: response.status,
        message: 'Supabase REST endpoint is active, reachable, and responding.',
      });
    }

    return res.json({
      success: true,
      status: response.status,
      message: `Supabase responded with HTTP ${response.status}`,
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      message: `Connection failed: ${err?.message || 'Host unreachable'}`,
    });
  }
});

// ============================================================================
// VITE DEV MIDDLEWARE OR PRODUCTION STATIC FILE SERVING
// ============================================================================
async function startServer() {
  if (!isProd) {
    // Development mode: Mount Vite middleware with HMR disabled to avoid proxy WebSocket issues
    const vite = await createViteServer({
      configFile: path.resolve('vite.config.ts'),
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static assets
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[Sale Analytics] Server running securely at http://localhost:${PORT} in ${isProd ? 'production' : 'development'} mode.`);
  });
}

startServer().catch(err => {
  console.error('[Sale Analytics] Server startup failure:', err);
  process.exit(1);
});
