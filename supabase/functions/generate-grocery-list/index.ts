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
 * Aggregates ingredients, scales by portions, normalizes units.
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
    if (!menuId && !week_start) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStartDate = new Date(now);
      weekStartDate.setDate(now.getDate() + diff);
      weekStartDate.setHours(0, 0, 0, 0);
      const weekStartStr = weekStartDate.toISOString().split('T')[0];

      const { data: menu, error: menuError } = await supabase
        .from('user_weekly_menus')
        .select('menu_id')
        .eq('user_id', user.id)
        .eq('week_start', weekStartStr)
        .single();

      if (menuError || !menu) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Aucun menu trouvé pour cette semaine' 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      menuId = menu.menu_id;
    }

    if (!menuId) {
      throw new Error('weekly_menu_id is required');
    }

    console.log(`[generate-grocery-list] Generating for menu: ${menuId}`);

    // Verify user owns this menu
    const { data: menuCheck, error: checkError } = await supabase
      .from('user_weekly_menus')
      .select('user_id')
      .eq('menu_id', menuId)
      .single();

    if (checkError || !menuCheck || menuCheck.user_id !== user.id) {
      throw new Error('Menu not found or access denied');
    }

    // Call the RPC function to generate grocery list
    const { data: items, error: rpcError } = await supabase
      .rpc('generate_grocery_list', { p_weekly_menu_id: menuId });

    if (rpcError) {
      console.error('[generate-grocery-list] RPC error:', rpcError);
      throw new Error('Failed to generate grocery list');
    }

    // Fetch the persisted grocery list
    const { data: groceryList, error: listError } = await supabase
      .from('grocery_lists')
      .select('*')
      .eq('weekly_menu_id', menuId)
      .single();

    if (listError) {
      console.error('[generate-grocery-list] Error fetching grocery list:', listError);
    }

    console.log(`[generate-grocery-list] ✅ Generated ${(items || []).length} items`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        grocery_list_id: groceryList?.id,
        items: items || [],
        generated_at: groceryList?.generated_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[generate-grocery-list] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
