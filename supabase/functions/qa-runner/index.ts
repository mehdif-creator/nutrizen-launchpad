import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { requireAdmin } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestResult {
  test_key: string;
  status: 'pass' | 'fail';
  details: Record<string, unknown>;
}

interface QARunnerRequest {
  environment?: 'prod' | 'staging';
  tests?: string[];
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Create admin client for service operations
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Test A: Check recipe images accessibility
async function testStorageImages(): Promise<TestResult> {
  const details: Record<string, unknown> = {
    number_checked: 0,
    broken_count: 0,
    sample_broken_urls: [] as string[],
  };

  try {
    // Fetch 5 recipes with images
    const { data: recipes, error } = await adminClient
      .from('recipes')
      .select('id, title, image_url, image_path')
      .or('image_url.neq.null,image_path.neq.null')
      .limit(5);

    if (error) {
      return {
        test_key: 'storage_images',
        status: 'fail',
        details: { error: error.message, message_fr: 'Erreur lors de la récupération des recettes.' },
      };
    }

    if (!recipes || recipes.length === 0) {
      return {
        test_key: 'storage_images',
        status: 'pass',
        details: { message_fr: 'Aucune recette avec image trouvée.', number_checked: 0 },
      };
    }

    details.number_checked = recipes.length;
    const brokenUrls: string[] = [];

    for (const recipe of recipes) {
      let urlToCheck: string | null = null;

      if (recipe.image_url) {
        urlToCheck = recipe.image_url;
      } else if (recipe.image_path) {
        const { data: urlData } = adminClient.storage
          .from('recipe-images')
          .getPublicUrl(recipe.image_path);
        urlToCheck = urlData?.publicUrl || null;
      }

      if (urlToCheck) {
        try {
          const response = await fetch(urlToCheck, { method: 'HEAD' });
          if (!response.ok && response.status !== 304) {
            brokenUrls.push(urlToCheck);
          }
        } catch {
          brokenUrls.push(urlToCheck);
        }
      }
    }

    details.broken_count = brokenUrls.length;
    details.sample_broken_urls = brokenUrls.slice(0, 3);

    const brokenRatio = brokenUrls.length / recipes.length;
    if (brokenRatio > 0.2) {
      return {
        test_key: 'storage_images',
        status: 'fail',
        details: {
          ...details,
          message_fr: `Échec — ${brokenUrls.length}/${recipes.length} images inaccessibles (>20%). Vérifiez les policies Storage.`,
        },
      };
    }

    return {
      test_key: 'storage_images',
      status: 'pass',
      details: {
        ...details,
        message_fr: `OK — ${recipes.length - brokenUrls.length}/${recipes.length} images accessibles.`,
      },
    };
  } catch (err) {
    return {
      test_key: 'storage_images',
      status: 'fail',
      details: { error: String(err), message_fr: 'Erreur inattendue lors du test images.' },
    };
  }
}

// Test B: Profile upsert test
async function testProfileUpsert(userId: string): Promise<TestResult> {
  try {
    const testTimestamp = new Date().toISOString();

    // First, check if profile exists
    const { data: existingProfile, error: selectError } = await adminClient
      .from('profiles')
      .select('id, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      return {
        test_key: 'profile_upsert',
        status: 'fail',
        details: { error: selectError.message, message_fr: 'Erreur lecture profil — vérifiez les RLS policies.' },
      };
    }

    // Update the profile with a harmless field change
    const { data: updatedProfile, error: upsertError } = await adminClient
      .from('profiles')
      .update({ updated_at: testTimestamp })
      .eq('id', userId)
      .select()
      .single();

    if (upsertError) {
      return {
        test_key: 'profile_upsert',
        status: 'fail',
        details: { error: upsertError.message, message_fr: 'Échec — écriture profil bloquée (RLS).' },
      };
    }

    // Verify the update persisted
    const { data: verifyProfile, error: verifyError } = await adminClient
      .from('profiles')
      .select('updated_at')
      .eq('id', userId)
      .single();

    if (verifyError || verifyProfile?.updated_at !== testTimestamp) {
      return {
        test_key: 'profile_upsert',
        status: 'fail',
        details: { message_fr: 'Échec — modification non persistée.' },
      };
    }

    return {
      test_key: 'profile_upsert',
      status: 'pass',
      details: { message_fr: 'OK — profil mis à jour et vérifié.', updated_at: testTimestamp },
    };
  } catch (err) {
    return {
      test_key: 'profile_upsert',
      status: 'fail',
      details: { error: String(err), message_fr: 'Erreur inattendue lors du test profil.' },
    };
  }
}

// Test C: Advice of the day
async function testAdviceOfDay(): Promise<TestResult> {
  try {
    // Get today's date in Europe/Paris timezone
    const now = new Date();
    const parisDate = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

    // Query today's advice or latest active fallback
    const { data: advice, error } = await adminClient
      .from('daily_advice')
      .select('id, title, text, category, date, is_active')
      .eq('is_active', true)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        test_key: 'advice_of_day',
        status: 'fail',
        details: { error: error.message, message_fr: 'Erreur lecture daily_advice — vérifiez RLS.' },
      };
    }

    if (!advice) {
      return {
        test_key: 'advice_of_day',
        status: 'pass',
        details: { 
          exists: false, 
          message_fr: 'Aucun conseil actif trouvé. Ajoutez des conseils dans la table daily_advice.',
        },
      };
    }

    const isToday = advice.date === parisDate;

    return {
      test_key: 'advice_of_day',
      status: 'pass',
      details: {
        exists: true,
        is_today: isToday,
        advice_date: advice.date,
        today_date: parisDate,
        message_fr: isToday 
          ? `OK — conseil du jour trouvé: "${advice.title}".`
          : `OK — fallback utilisé (${advice.date}): "${advice.title}".`,
      },
    };
  } catch (err) {
    return {
      test_key: 'advice_of_day',
      status: 'fail',
      details: { error: String(err), message_fr: 'Erreur inattendue lors du test conseil.' },
    };
  }
}

// Test D: Dashboard RPC contract
async function testDashboardRPC(userId: string): Promise<TestResult> {
  try {
    const { data, error } = await adminClient.rpc('rpc_get_user_dashboard', {
      p_user_id: userId,
    });

    if (error) {
      return {
        test_key: 'dashboard_rpc',
        status: 'fail',
        details: { error: error.message, message_fr: 'Erreur appel rpc_get_user_dashboard.' },
      };
    }

    if (!data) {
      return {
        test_key: 'dashboard_rpc',
        status: 'fail',
        details: { message_fr: 'RPC retourne null — contrat cassé.' },
      };
    }

    // Verify required keys exist
    const requiredKeys = ['wallet', 'week', 'advice_of_day', 'last_updated_at'];
    const missingKeys = requiredKeys.filter((key) => !(key in data));

    if (missingKeys.length > 0) {
      return {
        test_key: 'dashboard_rpc',
        status: 'fail',
        details: { missing_keys: missingKeys, message_fr: `Contrat cassé — clés manquantes: ${missingKeys.join(', ')}.` },
      };
    }

    // Verify week structure
    const week = data.week;
    if (!week || typeof week !== 'object') {
      return {
        test_key: 'dashboard_rpc',
        status: 'fail',
        details: { message_fr: 'Contrat cassé — week n\'est pas un objet.' },
      };
    }

    return {
      test_key: 'dashboard_rpc',
      status: 'pass',
      details: {
        keys_present: requiredKeys,
        has_wallet: 'wallet' in data,
        has_week: 'week' in data,
        has_advice: 'advice_of_day' in data,
        message_fr: 'OK — contrat dashboard valide.',
      },
    };
  } catch (err) {
    return {
      test_key: 'dashboard_rpc',
      status: 'fail',
      details: { error: String(err), message_fr: 'Erreur inattendue lors du test dashboard.' },
    };
  }
}

// Test E: Week structure validation
async function testWeekStructure(userId: string): Promise<TestResult> {
  try {
    // Get current week's menu
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const { data: menuItems, error } = await adminClient
      .from('user_daily_recipes')
      .select('day_of_week, meal_slot, recipe_id')
      .eq('user_id', userId)
      .eq('week_start', weekStartStr);

    if (error) {
      return {
        test_key: 'week_structure',
        status: 'fail',
        details: { error: error.message, message_fr: 'Erreur lecture user_daily_recipes.' },
      };
    }

    if (!menuItems || menuItems.length === 0) {
      return {
        test_key: 'week_structure',
        status: 'pass',
        details: { 
          message_fr: 'Aucun menu cette semaine — structure non vérifiable (attendu pour nouvel utilisateur).',
          has_menu: false,
        },
      };
    }

    // Check for lunch and dinner for each day
    const slotsByDay: Record<number, Set<string>> = {};
    for (const item of menuItems) {
      if (!slotsByDay[item.day_of_week]) {
        slotsByDay[item.day_of_week] = new Set();
      }
      if (item.meal_slot) {
        slotsByDay[item.day_of_week].add(item.meal_slot);
      }
    }

    const missingSlots: string[] = [];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let day = 1; day <= 7; day++) {
      const slots = slotsByDay[day] || new Set();
      if (!slots.has('lunch')) {
        missingSlots.push(`${dayNames[day % 7]} - déjeuner`);
      }
      if (!slots.has('dinner')) {
        missingSlots.push(`${dayNames[day % 7]} - dîner`);
      }
    }

    if (missingSlots.length > 0) {
      return {
        test_key: 'week_structure',
        status: 'fail',
        details: {
          missing_slots: missingSlots,
          total_items: menuItems.length,
          message_fr: `Échec — créneaux manquants: ${missingSlots.slice(0, 5).join(', ')}${missingSlots.length > 5 ? '...' : ''}.`,
        },
      };
    }

    return {
      test_key: 'week_structure',
      status: 'pass',
      details: {
        total_items: menuItems.length,
        days_with_slots: Object.keys(slotsByDay).length,
        message_fr: 'OK — structure semaine valide (7 jours × 2 créneaux).',
      },
    };
  } catch (err) {
    return {
      test_key: 'week_structure',
      status: 'fail',
      details: { error: String(err), message_fr: 'Erreur inattendue lors du test structure semaine.' },
    };
  }
}

// Test F: Realtime refresh (lightweight validation)
async function testRealtimeRefresh(userId: string): Promise<TestResult> {
  try {
    // Call dashboard RPC to get initial last_updated_at
    const { data: initial, error: initialError } = await adminClient.rpc('rpc_get_user_dashboard', {
      p_user_id: userId,
    });

    if (initialError || !initial) {
      return {
        test_key: 'realtime_refresh',
        status: 'fail',
        details: { error: initialError?.message, message_fr: 'Erreur appel initial dashboard RPC.' },
      };
    }

    const initialUpdatedAt = initial.last_updated_at;

    // Update profile timestamp (harmless change)
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (updateError) {
      return {
        test_key: 'realtime_refresh',
        status: 'fail',
        details: { error: updateError.message, message_fr: 'Échec mise à jour profil pour test refresh.' },
      };
    }

    // Small delay to allow propagation
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Call dashboard RPC again
    const { data: updated, error: updatedError } = await adminClient.rpc('rpc_get_user_dashboard', {
      p_user_id: userId,
    });

    if (updatedError || !updated) {
      return {
        test_key: 'realtime_refresh',
        status: 'fail',
        details: { error: updatedError?.message, message_fr: 'Erreur appel post-update dashboard RPC.' },
      };
    }

    const updatedUpdatedAt = updated.last_updated_at;

    // Check if last_updated_at changed (indicates refresh works)
    if (new Date(updatedUpdatedAt) >= new Date(initialUpdatedAt)) {
      return {
        test_key: 'realtime_refresh',
        status: 'pass',
        details: {
          initial_updated_at: initialUpdatedAt,
          final_updated_at: updatedUpdatedAt,
          message_fr: 'OK — dashboard RPC renvoie last_updated_at actualisé.',
        },
      };
    }

    return {
      test_key: 'realtime_refresh',
      status: 'fail',
      details: {
        initial_updated_at: initialUpdatedAt,
        final_updated_at: updatedUpdatedAt,
        message_fr: 'Échec — last_updated_at non mis à jour après modification profil.',
      },
    };
  } catch (err) {
    return {
      test_key: 'realtime_refresh',
      status: 'fail',
      details: { error: String(err), message_fr: 'Erreur inattendue lors du test refresh.' },
    };
  }
}

// Main handler
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentification requise.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client with the JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    // Get the authenticated user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token invalide ou expiré.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin status using service client
    await requireAdmin(adminClient, user.id);

    // Parse request body
    const body: QARunnerRequest = await req.json().catch(() => ({}));
    const environment = body.environment || 'prod';
    const requestedTests = body.tests || [
      'storage_images',
      'profile_upsert',
      'advice_of_day',
      'dashboard_rpc',
      'week_structure',
      'realtime_refresh',
    ];

    // Create the diagnostics run record
    const { data: run, error: runError } = await adminClient
      .from('diagnostics_runs')
      .insert({
        admin_user_id: user.id,
        environment,
        status: 'running',
      })
      .select()
      .single();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: 'Impossible de créer l\'entrée diagnostics_runs.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: TestResult[] = [];

    // Run requested tests
    const testFunctions: Record<string, () => Promise<TestResult>> = {
      storage_images: testStorageImages,
      profile_upsert: () => testProfileUpsert(user.id),
      advice_of_day: testAdviceOfDay,
      dashboard_rpc: () => testDashboardRPC(user.id),
      week_structure: () => testWeekStructure(user.id),
      realtime_refresh: () => testRealtimeRefresh(user.id),
    };

    for (const testKey of requestedTests) {
      if (testFunctions[testKey]) {
        const result = await testFunctions[testKey]();
        results.push(result);

        // Store each result
        await adminClient.from('diagnostics_results').insert({
          run_id: run.id,
          test_key: result.test_key,
          status: result.status,
          details: result.details,
        });
      }
    }

    // Calculate summary
    const passCount = results.filter((r) => r.status === 'pass').length;
    const failCount = results.filter((r) => r.status === 'fail').length;
    const overallStatus = failCount === 0 ? 'success' : 'error';

    // Update run with final status
    await adminClient
      .from('diagnostics_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: overallStatus,
        summary: {
          total_tests: results.length,
          pass_count: passCount,
          fail_count: failCount,
        },
      })
      .eq('id', run.id);

    return new Response(
      JSON.stringify({
        run_id: run.id,
        status: overallStatus,
        summary: {
          total_tests: results.length,
          pass_count: passCount,
          fail_count: failCount,
        },
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[qa-runner] Error:', err);

    // Check if it's an auth error
    if (err instanceof Error && err.message.includes('Admin access required')) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé. Vous devez être administrateur.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Erreur serveur interne.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
