/**
 * Shared image validation for the AI vision Edge Functions.
 *
 * Goals (security hardening, no functional change):
 *  - accept only image/jpeg, image/png, image/webp
 *  - hard byte cap BEFORE and AFTER base64 decoding
 *  - never trust the client-declared MIME: verify the real magic bytes
 *  - clear 400 messages, never a stack trace
 *
 * Quality is untouched: no downscaling, no `detail` change.
 */

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6 MB decoded
/** base64 inflates by ~4/3; +1024 tolerance for the data-URL prefix and padding */
export const MAX_IMAGE_BASE64_CHARS = Math.ceil((MAX_IMAGE_BYTES / 3) * 4) + 1024;

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

const MB = (n: number) => `${Math.round((n / (1024 * 1024)) * 10) / 10} Mo`;

export type ImageValidationResult =
  | { ok: true; base64: string; mimeType: AllowedImageMime; byteLength: number }
  | { ok: false; error: string };

/** Normalise a declared MIME (image/jpg → image/jpeg) or return null when unsupported. */
export function normalizeImageMime(mime: string | null | undefined): AllowedImageMime | null {
  if (!mime) return null;
  const m = mime.split(';')[0].trim().toLowerCase();
  if (m === 'image/jpg' || m === 'image/pjpeg') return 'image/jpeg';
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(m) ? (m as AllowedImageMime) : null;
}

/** Detect the real image type from the first bytes. Returns null when not an allowed image. */
export function sniffImageMime(bytes: Uint8Array): AllowedImageMime | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'image/png';

  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp';

  return null;
}

/**
 * Validate a base64 payload (raw base64 or `data:<mime>;base64,...`).
 * Returns the clean base64 plus the REAL mime type detected from the bytes.
 */
export function validateBase64Image(input: unknown): ImageValidationResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { ok: false, error: 'Image manquante ou invalide.' };
  }

  // 1) Cheap length check BEFORE decoding (avoids decoding a multi-MB payload).
  if (input.length > MAX_IMAGE_BASE64_CHARS) {
    return { ok: false, error: `Image trop volumineuse (maximum ${MB(MAX_IMAGE_BYTES)}). Réduisez la qualité de la photo et réessayez.` };
  }

  // 2) Split the optional data-URL prefix and check the declared MIME.
  let base64 = input;
  const dataUrlMatch = input.match(/^data:([^;,]+);base64,/i);
  if (dataUrlMatch) {
    if (!normalizeImageMime(dataUrlMatch[1])) {
      return { ok: false, error: 'Format d\'image non pris en charge. Utilisez JPEG, PNG ou WEBP.' };
    }
    base64 = input.slice(dataUrlMatch[0].length);
  } else if (input.startsWith('data:')) {
    return { ok: false, error: 'Image invalide (données non reconnues).' };
  }

  base64 = base64.replace(/\s/g, '');
  if (base64.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
    return { ok: false, error: 'Image invalide (encodage base64 incorrect).' };
  }

  // 3) Decode and check the real byte size.
  let bytes: Uint8Array;
  let byteLength: number;
  try {
    const binary = atob(base64);
    byteLength = binary.length;
    if (byteLength > MAX_IMAGE_BYTES) {
      return { ok: false, error: `Image trop volumineuse (maximum ${MB(MAX_IMAGE_BYTES)}). Réduisez la qualité de la photo et réessayez.` };
    }
    bytes = new Uint8Array(Math.min(byteLength, 64));
    for (let i = 0; i < bytes.length; i++) bytes[i] = binary.charCodeAt(i);
  } catch {
    return { ok: false, error: 'Image invalide (encodage base64 incorrect).' };
  }

  // 4) Never trust the declared MIME: check the magic bytes.
  const realMime = sniffImageMime(bytes);
  if (!realMime) {
    return { ok: false, error: 'Le fichier envoyé n\'est pas une image valide (JPEG, PNG ou WEBP attendu).' };
  }

  return { ok: true, base64, mimeType: realMime, byteLength };
}

/** Validate an uploaded File (multipart/form-data). */
export async function validateImageFile(
  file: File
): Promise<{ ok: true; bytes: Uint8Array; mimeType: AllowedImageMime } | { ok: false; error: string }> {
  if (typeof file.size === 'number' && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Image trop volumineuse (maximum ${MB(MAX_IMAGE_BYTES)}). Réduisez la qualité de la photo et réessayez.` };
  }
  if (file.type && !normalizeImageMime(file.type)) {
    return { ok: false, error: 'Format d\'image non pris en charge. Utilisez JPEG, PNG ou WEBP.' };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Image trop volumineuse (maximum ${MB(MAX_IMAGE_BYTES)}). Réduisez la qualité de la photo et réessayez.` };
  }

  const realMime = sniffImageMime(bytes);
  if (!realMime) {
    return { ok: false, error: 'Le fichier envoyé n\'est pas une image valide (JPEG, PNG ou WEBP attendu).' };
  }
  return { ok: true, bytes, mimeType: realMime };
}
