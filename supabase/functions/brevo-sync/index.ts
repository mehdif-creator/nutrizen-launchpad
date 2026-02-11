import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrevoContact {
  email: string;
  attributes?: Record<string, any>;
  listIds?: number[];
  updateEnabled?: boolean;
}

/**
 * Edge Function: brevo-sync
 * 
 * Syncs user data to Brevo CRM for marketing automation.
 * Called on key user events: signup, onboarding completed, credits purchased, etc.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Authenticate: only service role calls allowed
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const token = authHeader?.replace('Bearer ', '');

  if (token !== serviceRoleKey) {
    console.warn('[brevo-sync] Unauthorized call attempt');
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const brevoListId = Deno.env.get('BREVO_LIST_ID');

    if (!brevoApiKey) {
      console.log('[brevo-sync] BREVO_API_KEY not configured, skipping sync');
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: 'Brevo not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse request body
    const body = await req.json();
    const { user_id, event_type, payload } = body;

    if (!user_id || !event_type) {
      throw new Error('Missing required fields: user_id, event_type');
    }

    console.log(`[brevo-sync] Processing event: ${event_type} for user: ${user_id.substring(0, 8)}...`);

    // Fetch user data from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name, created_at')
      .eq('id', user_id)
      .single();

    if (profileError || !profile?.email) {
      console.error('[brevo-sync] Could not fetch user profile:', profileError);
      throw new Error('User profile not found or missing email');
    }

    // Fetch additional user data
    const [walletRes, prefsRes, gamificationRes] = await Promise.all([
      supabase.from('user_wallets').select('balance_purchased, balance_allowance, reset_cadence').eq('user_id', user_id).maybeSingle(),
      supabase.from('user_profiles').select('onboarding_status, household_adults, household_children').eq('id', user_id).maybeSingle(),
      supabase.from('user_gamification').select('level, points, streak_days').eq('user_id', user_id).maybeSingle(),
    ]);

    const wallet = walletRes.data;
    const userProfile = prefsRes.data;
    const gamification = gamificationRes.data;

    // Build Brevo contact attributes
    const attributes: Record<string, any> = {
      PRENOM: profile.full_name?.split(' ')[0] || '',
      NOM: profile.full_name?.split(' ').slice(1).join(' ') || '',
      DATE_INSCRIPTION: profile.created_at,
      LAST_SYNC_AT: new Date().toISOString(),
      EVENT_TYPE: event_type,
    };

    // Add wallet attributes
    if (wallet) {
      attributes.CREDITS_PURCHASED = wallet.balance_purchased || 0;
      attributes.CREDITS_ALLOWANCE = wallet.balance_allowance || 0;
      attributes.CREDITS_TOTAL = (wallet.balance_purchased || 0) + (wallet.balance_allowance || 0);
      attributes.PLAN_MODE = wallet.reset_cadence === 'none' ? 'free_core_credits' : wallet.reset_cadence;
    }

    // Add profile attributes
    if (userProfile) {
      attributes.ONBOARDING_STATUS = userProfile.onboarding_status || 'not_started';
      attributes.HOUSEHOLD_SIZE = (userProfile.household_adults || 1) + (userProfile.household_children || 0);
    }

    // Add gamification attributes
    if (gamification) {
      attributes.LEVEL = gamification.level || 1;
      attributes.POINTS = gamification.points || 0;
      attributes.STREAK_DAYS = gamification.streak_days || 0;
    }

    // Add event-specific payload data
    if (payload) {
      if (payload.credits_added) {
        attributes.LAST_CREDITS_ADDED = payload.credits_added;
      }
      if (payload.menu_generated) {
        attributes.LAST_MENU_AT = new Date().toISOString();
      }
    }

    // Build Brevo API request
    const brevoContact: BrevoContact = {
      email: profile.email,
      attributes,
      updateEnabled: true, // Update if exists
    };

    // Add to list if configured
    if (brevoListId) {
      brevoContact.listIds = [parseInt(brevoListId, 10)];
    }

    console.log(`[brevo-sync] Syncing contact: ${profile.email.substring(0, 3)}***`);

    // Call Brevo API to upsert contact
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(brevoContact),
    });

    let brevoResult: any = {};
    const responseText = await brevoResponse.text();
    
    try {
      brevoResult = JSON.parse(responseText);
    } catch {
      brevoResult = { raw: responseText };
    }

    // Handle duplicate contact (already exists) - this is expected
    if (brevoResponse.status === 400 && brevoResult?.code === 'duplicate_parameter') {
      console.log('[brevo-sync] Contact already exists, updating...');
      
      // Use PUT to update existing contact
      const updateResponse = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(profile.email)}`, {
        method: 'PUT',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ attributes }),
      });

      if (!updateResponse.ok) {
        const updateError = await updateResponse.text();
        console.error('[brevo-sync] Error updating contact:', updateError);
      } else {
        console.log('[brevo-sync] Contact updated successfully');
      }
    } else if (!brevoResponse.ok) {
      console.error('[brevo-sync] Brevo API error:', brevoResult);
      // Don't throw - log the event as error but don't block the user
    } else {
      console.log('[brevo-sync] Contact created/updated successfully');
    }

    // Log the event
    await supabase.from('email_events').insert({
      user_id,
      event_type: `sync_${event_type}`,
      provider: 'brevo',
      status: brevoResponse.ok || brevoResponse.status === 400 ? 'sent' : 'error',
      error: !brevoResponse.ok && brevoResponse.status !== 400 ? JSON.stringify(brevoResult) : null,
      metadata: { attributes_synced: Object.keys(attributes) },
    });

    console.log(`[brevo-sync] ✅ Completed sync for ${event_type}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        event_type,
        contact_synced: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[brevo-sync] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
