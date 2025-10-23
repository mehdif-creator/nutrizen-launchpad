/**
 * Vite Plugin for Security Headers
 * Adds security headers to development server
 */

import type { Plugin } from 'vite';

export function securityHeadersPlugin(): Plugin {
  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Content Security Policy
        res.setHeader(
          'Content-Security-Policy',
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
            "img-src 'self' https://*.supabase.co data: blob:",
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self' data:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
          ].join('; ')
        );

        // HSTS
        res.setHeader(
          'Strict-Transport-Security',
          'max-age=63072000; includeSubDomains; preload'
        );

        // Prevent MIME sniffing
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Referrer Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions Policy
        res.setHeader(
          'Permissions-Policy',
          'geolocation=(), camera=(), microphone=(), payment=()'
        );

        // Cross-Origin Policies
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

        // X-Frame-Options (legacy support)
        res.setHeader('X-Frame-Options', 'DENY');

        // Remove X-Powered-By header
        res.removeHeader('X-Powered-By');

        next();
      });
    },
  };
}
