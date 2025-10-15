const N8N_WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_BASE || '';
const HMAC_SECRET = import.meta.env.VITE_HMAC_SECRET || 'your-secret-key';

export interface WebhookEvent {
  event: string;
  ts: number;
  user_id?: string;
  [key: string]: any;
}

const generateRandomId = () => {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

const hmacSign = async (message: string, secret: string): Promise<string> => {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

export const emitWebhookEvent = async (eventData: WebhookEvent) => {
  if (!N8N_WEBHOOK_BASE) {
    console.warn('N8N_WEBHOOK_BASE not configured');
    return;
  }

  const payload = {
    ...eventData,
    ts: Date.now(),
    idempotency_key: generateRandomId(),
  };

  const signature = await hmacSign(JSON.stringify(payload), HMAC_SECRET);

  try {
    await fetch(`${N8N_WEBHOOK_BASE}/${eventData.event}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Name': eventData.event,
        'X-Signature': `sha256=${signature}`,
        'X-Timestamp': payload.ts.toString(),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Webhook emit error:', error);
  }
};
