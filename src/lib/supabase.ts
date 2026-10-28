import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Client Security Architecture:
 * 1. The frontend MUST ONLY use the Supabase Publishable Key ('sb_publishable_...')
 *    or the legacy public 'anon' key.
 * 2. Privileged secret keys ('sb_secret_...', 'service_role') must NEVER be exposed
 *    to the browser. If a privileged key is mistakenly set in client environment
 *    variables, initialization is proactively blocked to protect the database.
 * 3. Privileged administrative operations are routed through the secure Express
 *    backend (/api/*) where the server-side secret is kept in server memory.
 */

export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL || '';
}

export function getSupabaseAnonKey(): string {
  return (
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    ''
  );
}

export function getSupabaseProjectRef(): string {
  const envRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (envRef) return envRef;

  const url = getSupabaseUrl();
  if (url) {
    try {
      const parsed = new URL(url);
      const hostParts = parsed.hostname.split('.');
      if (hostParts.length > 2 && hostParts[1] === 'supabase') {
        return hostParts[0];
      }
    } catch {
      // ignore parse failure
    }
  }
  return '';
}

/**
 * Defensive Security Check: Inspects whether a given key is a privileged secret key.
 * Detects:
 * - Modern Supabase Secret Key prefix: 'sb_secret_'
 * - Explicit 'service_role' strings
 * - JWTs with payload role === 'service_role' or 'supabase_admin'
 */
export function isPrivilegedSecretKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();

  // 1. Direct prefix detection
  if (trimmed.startsWith('sb_secret_') || trimmed.startsWith('service_role')) {
    return true;
  }

  // 2. JWT payload inspection (for legacy service_role keys)
  if (trimmed.startsWith('ey') && trimmed.includes('.')) {
    try {
      const parts = trimmed.split('.');
      if (parts.length >= 2) {
        // Base64Url decode without external libraries
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const parsed = JSON.parse(jsonPayload);
        if (parsed.role === 'service_role' || parsed.role === 'supabase_admin') {
          return true;
        }
      }
    } catch {
      // If decoding fails, check for substring
      if (trimmed.includes('service_role')) return true;
    }
  }

  return false;
}

export function getKeyArchitectureAudit(): {
  isSecure: boolean;
  keyType: 'publishable' | 'anon' | 'secret_blocked' | 'missing';
  warning?: string;
} {
  const key = getSupabaseAnonKey();
  if (!key) {
    return { isSecure: true, keyType: 'missing' };
  }

  if (isPrivilegedSecretKey(key)) {
    return {
      isSecure: false,
      keyType: 'secret_blocked',
      warning:
        'SECURITY ALERT: A privileged Supabase secret key / service_role key was provided in client environment variables. Frontend initialization was blocked for security. Please rotate this key in your Supabase Dashboard and replace it with a publishable key (sb_publishable_...) or anon key.',
    };
  }

  if (key.startsWith('sb_publishable_')) {
    return { isSecure: true, keyType: 'publishable' };
  }

  return { isSecure: true, keyType: 'anon' };
}

let _supabaseInstance: SupabaseClient | null = null;
let _hasWarnedSecurityViolation = false;

export function getSupabaseClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();

  if (!url || !key) {
    return null;
  }

  // PROACTIVE SECURITY GUARD:
  // Never allow a secret_role or secret key to initialize in the browser!
  if (isPrivilegedSecretKey(key)) {
    if (!_hasWarnedSecurityViolation) {
      console.error(
        '%c🚨 SECURITY VULNERABILITY BLOCKED:',
        'font-size: 14px; font-weight: bold; color: #ef4444;',
        'A privileged Supabase secret/service_role key was detected in client-side environment variables. ' +
        'Supabase secret keys bypass Row Level Security (RLS) and must NEVER be exposed in the frontend. ' +
        'Client-side initialization has been BLOCKED to prevent leaking credentials in browser requests. ' +
        'Action required: Rotate your secret key in the Supabase Dashboard and use only the publishable key (sb_publishable_...) or anon key.'
      );
      _hasWarnedSecurityViolation = true;
    }
    return null;
  }

  if (!_supabaseInstance) {
    _supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return _supabaseInstance;
}

export async function testSupabaseConnection(url?: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const testUrl = url || getSupabaseUrl();
  const audit = getKeyArchitectureAudit();

  if (!audit.isSecure) {
    return {
      success: false,
      message: audit.warning || 'Privileged secret key blocked from frontend use.',
    };
  }

  if (!testUrl) {
    return {
      success: false,
      message: 'VITE_SUPABASE_URL is not set in environment variables.',
    };
  }

  try {
    // Test public REST endpoint safely
    const res = await fetch(`${testUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.status === 200 || res.status === 401) {
      const ref = getSupabaseProjectRef();
      return {
        success: true,
        message: `Connected: Supabase cloud service${ref ? ` (${ref})` : ''} is active with secure client key (${audit.keyType}).`,
      };
    }

    return {
      success: true,
      message: `Supabase endpoint verified (${res.status} status).`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection error: ${err?.message || 'Network unreachable'}`,
    };
  }
}
