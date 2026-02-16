/**
 * Vite Plugin for Security Headers (Development Server)
 *
 * ⚠️  SYNC NOTICE — This file MUST stay in sync with `public/_headers`.
 *     `public/_headers` defines production security headers (Netlify / Cloudflare Pages).
 *     This plugin mirrors them for the Vite dev server so behaviour is consistent.
 *
 *     When adding or changing any CSP directive, Cache-Control rule, or security
 *     header here, update `public/_headers` as well (and vice-versa).
 *
 *  Differences allowed between dev and prod:
 *    - frame-ancestors: dev uses '*' (needed for Lovable preview iframe), prod uses 'none'
 *    - upgrade-insecure-requests: omitted in dev
 *    - HSTS / Cross-Origin-*-Policy: prod-only
 */

import type { Plugin } from 'vite';

export function securityHeadersPlugin(): Plugin {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const isDev = process.env.NODE_ENV !== 'production';
        const url = req.url || '';

        // Cache-Control: no-store for authenticated app/admin routes
        // Mirrors: public/_headers /app/* and /admin/* blocks
        if (url.startsWith('/app') || url.startsWith('/admin')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }

        // Content Security Policy — NO unsafe-eval
        // Mirrors: public/_headers Content-Security-Policy
        res.setHeader(
          'Content-Security-Policy',
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://js.stripe.com https://*.googletagmanager.com",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.google-analytics.com https://*.googletagmanager.com",
            "img-src 'self' https://*.supabase.co https://storage.googleapis.com data: blob: https:",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' data:",
            "frame-src https://js.stripe.com https://*.googletagmanager.com",
            isDev ? "frame-ancestors *" : "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            isDev ? '' : 'upgrade-insecure-requests',
          ]
            .filter(Boolean)
            .join('; ')
        );

        // HSTS - only in production
        if (!isDev) {
          res.setHeader(
            'Strict-Transport-Security',
            'max-age=63072000; includeSubDomains; preload'
          );
        }

        // Prevent MIME sniffing — Mirrors: public/_headers X-Content-Type-Options
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Referrer Policy — Mirrors: public/_headers Referrer-Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions Policy — Mirrors: public/_headers Permissions-Policy
        res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        // Cross-Origin Policies - relaxed in development
        if (!isDev) {
          res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
          res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
        }

        // X-Frame-Options — Mirrors: public/_headers (prod = DENY)
        // Dev allows all for Lovable preview iframe
        res.setHeader('X-Frame-Options', isDev ? 'ALLOWALL' : 'DENY');

        // Remove X-Powered-By header
        res.removeHeader('X-Powered-By');

        next();
      });
    },
  };
}
