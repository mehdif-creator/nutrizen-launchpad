import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

export const WebhookEventSchema = z.object({
  event: z.string().min(1).max(100).regex(/^[a-z_]+$/),
  ts: z.number().int().positive().optional(),
  user_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

export const emitWebhookEvent = async (eventData: WebhookEvent) => {
  // Validate before sending
  const parsed = WebhookEventSchema.safeParse(eventData);
  if (!parsed.success) {
    console.warn('Invalid webhook event, dropping:', parsed.error.issues);
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('No active session, webhook not emitted');
      return;
    }

    await supabase.functions.invoke('emit-webhook', {
      body: parsed.data,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch (error) {
    console.error('Webhook emit error:', error);
  }
};
