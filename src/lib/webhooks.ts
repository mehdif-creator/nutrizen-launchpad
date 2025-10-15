import { supabase } from '@/integrations/supabase/client';

export interface WebhookEvent {
  event: string;
  ts?: number;
  user_id?: string;
  [key: string]: any;
}

export const emitWebhookEvent = async (eventData: WebhookEvent) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.warn('No active session, webhook not emitted');
      return;
    }

    await supabase.functions.invoke('emit-webhook', {
      body: eventData,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  } catch (error) {
    console.error('Webhook emit error:', error);
  }
};
