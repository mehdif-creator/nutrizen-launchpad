import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function: generate-grocery-list
 * 
 * Generates/regenerates grocery list for a weekly menu.
 * Delegates to the RPC function for aggregation and portion scaling.
 * Preserves checked states on regeneration.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT and get user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    console.log(`[generate-grocery-list] Processing for user: ${user.id.substring(0, 8)}...`);

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { weekly_menu_id, week_start } = body;

    let menuId = weekly_menu_id;

    // If no menu_id provided, find current week's menu
    if (!menuId) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() + diff);
      weekStartDate.setHours(0, 0, 0, 0);
      const weekStartStr = week_start || weekStartDate.toISOString().split('T')[0];

      const { data: menu, error: menuError } = await supabase
        .from('user_weekly_menus')
        .select('menu_id')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr)
        .maybeSingle();

      if (menuError) {
        console.error('[generate-grocery-list] Error fetching menu:', menuError);
        throw new Error('Failed to fetch menu');
      }

      if (!menu) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Aucun menu trouvé pour cette semaine. Génère d\'abord ton menu hebdomadaire.' 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      menuId = menu.menu_id;
    }

    console.log(`[generate-grocery-list] Generating for menu: ${menuId}`);

    // Verify user owns this menu
    const { data: menuCheck, error: checkError } = await supabase
      .from('user_weekly_menus')
      .select('user_id, week_start')
      .eq('menu_id', menuId)
      .single();

    if (checkError || !menuCheck || menuCheck.user_id !== user.id) {
      throw new Error('Menu not found or access denied');
    }

    // Call the RPC function to generate grocery list (handles aggregation + portion scaling + checked state preservation)
    const { data: items, error: rpcError } = await supabase
      .rpc('generate_grocery_list', { p_weekly_menu_id: menuId });

    if (rpcError) {
      console.error('[generate-grocery-list] RPC error:', rpcError);
      throw new Error('Échec de la génération de la liste de courses');
    }

    // Fetch the persisted grocery list to get the ID
    const { data: groceryList, error: listError } = await supabase
      .from('grocery_lists')
      .select('id, generated_at')
      .eq('weekly_menu_id', menuId)
      .single();

    if (listError) {
      console.error('[generate-grocery-list] Error fetching grocery list:', listError);
    }

    const itemCount = Array.isArray(items) ? items.length : 0;
    console.log(`[generate-grocery-list] ✅ Generated ${itemCount} items`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        grocery_list_id: groceryList?.id,
        items: items || [],
        generated_at: groceryList?.generated_at || new Date().toISOString(),
        week_start: menuCheck.week_start,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-grocery-list] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
