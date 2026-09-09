import { describe, expect, it } from 'vitest';
import { getCorsHeaders, isAllowedOrigin } from '../../../supabase/functions/_shared/cors';

describe('CORS web et Capacitor', () => {
  it.each([
    'https://localhost',
    'http://localhost',
    'capacitor://localhost',
    'https://mynutrizen.fr',
    'https://www.mynutrizen.fr',
    'https://nutrizen-launchpad.lovable.app',
    'https://id-preview--example.lovable.app',
    'https://example.lovableproject.com',
  ])('autorise exactement %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(true);
    expect(getCorsHeaders(origin)['Access-Control-Allow-Origin']).toBe(origin);
    expect(getCorsHeaders(origin)['Vary']).toBe('Origin');
  });

  it.each([
    'null',
    'https://localhost.evil.example',
    'https://mynutrizen.fr.evil.example',
    'https://preview.lovable.app.evil.example',
    'capacitor://evil.example',
    'http://preview.lovable.app',
    'https://preview.lovable.app/path',
    'https://preview.lovable.app@evil.example',
    'not an origin',
  ])('ne reflète pas une origine non autorisée : %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(false);
    expect(getCorsHeaders(origin)['Access-Control-Allow-Origin']).not.toBe(origin);
    expect(getCorsHeaders(origin)['Access-Control-Allow-Origin']).not.toBe('*');
  });

  it('accepte les en-têtes des analyses JSON et multipart sans supprimer l’authentification', () => {
    const headers = getCorsHeaders('https://localhost');
    expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS');
    for (const header of ['authorization', 'apikey', 'content-type', 'x-client-info']) {
      expect(headers['Access-Control-Allow-Headers']).toContain(header);
    }
    expect(isAllowedOrigin(null)).toBe(false);
    expect(getCorsHeaders(null)['Access-Control-Allow-Origin']).toBe('https://mynutrizen.fr');
  });
});