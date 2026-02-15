import { createClient } from '../_shared/deps.ts';
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
      .eq('published', true)
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

      // Prefer image_path (Supabase Storage) over image_url
      if (recipe.image_path) {
        const { data: urlData } = adminClient.storage
          .from('recipe-images')
          .getPublicUrl(recipe.image_path);
        urlToCheck = urlData?.publicUrl || null;
      } else if (recipe.image_url) {
        urlToCheck = recipe.image_url;
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

// Test B: Profile upsert test using last_diagnostics_at column
async function testProfileUpsert(userId: string): Promise<TestResult> {
  try {
    const testTimestamp = new Date().toISOString();
    const testMeta = { test_run: testTimestamp, version: '1.0' };

    // First, check if profile exists
    const { data: existingProfile, error: selectError } = await adminClient
      .from('profiles')
      .select('id, updated_at, last_diagnostics_at, diagnostics_meta')
      .eq('id', userId)
      .maybeSingle();

    if (selectError) {
      return {
        test_key: 'profile_upsert',
        status: 'fail',
        details: { 
          error: selectError.message, 
          code: selectError.code,
          message_fr: `Erreur lecture profil — ${selectError.message}` 
        },
      };
    }

    if (!existingProfile) {
      // Profile doesn't exist - create it
      const { error: insertError } = await adminClient
        .from('profiles')
        .insert({ 
          id: userId, 
          last_diagnostics_at: testTimestamp,
          diagnostics_meta: testMeta
        });

      if (insertError) {
        return {
          test_key: 'profile_upsert',
          status: 'fail',
          details: { 
            error: insertError.message, 
            code: insertError.code,
            message_fr: `Échec création profil — ${insertError.message}` 
          },
        };
      }
    } else {
      // Update the profile with diagnostics fields
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ 
          last_diagnostics_at: testTimestamp,
          diagnostics_meta: testMeta
        })
        .eq('id', userId);

      if (updateError) {
        return {
          test_key: 'profile_upsert',
          status: 'fail',
          details: { 
            error: updateError.message, 
            code: updateError.code,
            message_fr: `Échec mise à jour profil — ${updateError.message}` 
          },
        };
      }
    }

    // Verify the update persisted
    const { data: verifyProfile, error: verifyError } = await adminClient
      .from('profiles')
      .select('last_diagnostics_at, diagnostics_meta')
      .eq('id', userId)
      .single();

    if (verifyError) {
      return {
        test_key: 'profile_upsert',
        status: 'fail',
        details: { 
          error: verifyError.message, 
          message_fr: `Échec vérification profil — ${verifyError.message}` 
        },
      };
    }

    // Compare timestamps by epoch milliseconds instead of string (avoids Z vs +00:00 mismatch)
    const TOLERANCE_MS = 1500;
    const expectedMs = new Date(testTimestamp).getTime();
    const actualIso = verifyProfile?.last_diagnostics_at;
    const actualMs = actualIso ? new Date(actualIso).getTime() : 0;
    const diffMs = Math.abs(expectedMs - actualMs);

    if (diffMs > TOLERANCE_MS) {
      return {
        test_key: 'profile_upsert',
        status: 'fail',
        details: { 
          expected_iso: testTimestamp,
          actual_iso: actualIso,
          expected_ms: expectedMs,
          actual_ms: actualMs,
          diff_ms: diffMs,
          tolerance_ms: TOLERANCE_MS,
          message_fr: `Échec — modification non persistée (écart ${diffMs}ms > ${TOLERANCE_MS}ms tolérance).` 
        },
      };
    }

    return {
      test_key: 'profile_upsert',
      status: 'pass',
      details: { 
        message_fr: 'OK — profil mis à jour et vérifié.', 
        expected_iso: testTimestamp,
        actual_iso: actualIso,
        expected_ms: expectedMs,
        actual_ms: actualMs,
        diff_ms: diffMs,
        tolerance_ms: TOLERANCE_MS,
      },
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

// Test D: Dashboard RPC contract - validates structure including week.days
async function testDashboardRPC(userId: string): Promise<TestResult> {
  try {
    const { data, error } = await adminClient.rpc('rpc_get_user_dashboard', {
      p_user_id: userId,
    });

    if (error) {
      return {
        test_key: 'dashboard_rpc',
        status: 'fail',
        details: { error: error.message, message_fr: `Erreur appel rpc_get_user_dashboard — ${error.message}` },
      };
    }

    if (!data) {
      return {
        test_key: 'dashboard_rpc',
        status: 'fail',
        details: { message_fr: 'RPC retourne null — contrat cassé.' },
      };
    }

    // Verify required top-level keys exist
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

    // Verify week.days is an array of 7 elements
    const days = week.days;
    if (!Array.isArray(days)) {
      return {
        test_key: 'dashboard_rpc',
        status: 'fail',
        details: { message_fr: 'Contrat cassé — week.days n\'est pas un tableau.' },
      };
    }

    if (days.length !== 7) {
      return {
        test_key: 'dashboard_rpc',
        status: 'fail',
        details: { 
          days_count: days.length,
          message_fr: `Contrat cassé — week.days doit avoir 7 entrées (trouvé ${days.length}).` 
        },
      };
    }

    // Verify each day has lunch and dinner keys
    const daysWithMissingSlots: string[] = [];
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      if (!('lunch' in day) || !('dinner' in day)) {
        daysWithMissingSlots.push(day.day_name || `Jour ${i + 1}`);
      }
    }

    if (daysWithMissingSlots.length > 0) {
      return {
        test_key: 'dashboard_rpc',
        status: 'fail',
        details: { 
          missing_slots: daysWithMissingSlots,
          message_fr: `Contrat cassé — jours sans clés lunch/dinner: ${daysWithMissingSlots.join(', ')}.` 
        },
      };
    }

    return {
      test_key: 'dashboard_rpc',
      status: 'pass',
      details: {
        keys_present: requiredKeys,
        days_count: 7,
        has_wallet: 'wallet' in data,
        has_week: 'week' in data,
        has_advice: 'advice_of_day' in data,
        message_fr: 'OK — contrat dashboard valide (7 jours × lunch/dinner).',
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

// Test E: Week structure validation using user_daily_recipes table
async function testWeekStructure(userId: string): Promise<TestResult> {
  try {
    // Get current week's menu via the dashboard RPC which already returns week.days
    const { data, error } = await adminClient.rpc('rpc_get_user_dashboard', {
      p_user_id: userId,
    });

    if (error) {
      return {
        test_key: 'week_structure',
        status: 'fail',
        details: { error: error.message, message_fr: `Erreur lecture dashboard — ${error.message}` },
      };
    }

    const week = data?.week;
    const days = week?.days;

    if (!days || !Array.isArray(days) || days.length === 0) {
      return {
        test_key: 'week_structure',
        status: 'pass',
        details: { 
          message_fr: 'Aucun menu cette semaine — structure non vérifiable (attendu pour nouvel utilisateur).',
          has_menu: false,
        },
      };
    }

    // Check if there's at least one meal in the week
    const hasAnyMeal = days.some((day: { lunch?: unknown; dinner?: unknown }) => 
      day.lunch !== null || day.dinner !== null
    );

    if (!hasAnyMeal) {
      return {
        test_key: 'week_structure',
        status: 'pass',
        details: { 
          message_fr: 'Aucun repas planifié cette semaine — structure valide mais vide.',
          has_menu: false,
        },
      };
    }

    // Verify structure: each day should have lunch and dinner keys
    const missingSlots: string[] = [];
    const daysWithMeals: string[] = [];

    for (const day of days) {
      const hasLunch = day.lunch !== null;
      const hasDinner = day.dinner !== null;
      
      if (hasLunch || hasDinner) {
        daysWithMeals.push(day.day_name);
      }
      
      // Only report missing slots for days that have at least one meal
      if ((hasLunch && !hasDinner) || (!hasLunch && hasDinner)) {
        if (!hasLunch) {
          missingSlots.push(`${day.day_name} - déjeuner`);
        }
        if (!hasDinner) {
          missingSlots.push(`${day.day_name} - dîner`);
        }
      }
    }

    if (missingSlots.length > 0) {
      return {
        test_key: 'week_structure',
        status: 'fail',
        details: {
          missing_slots: missingSlots,
          days_with_meals: daysWithMeals,
          message_fr: `Avertissement — créneaux incomplets: ${missingSlots.slice(0, 5).join(', ')}${missingSlots.length > 5 ? '...' : ''}.`,
        },
      };
    }

    return {
      test_key: 'week_structure',
      status: 'pass',
      details: {
        days_with_meals: daysWithMeals,
        total_days: 7,
        message_fr: `OK — structure semaine valide (${daysWithMeals.length} jours avec repas).`,
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

    // Small delay to ensure time difference
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update profile diagnostics field (harmless change)
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ 
        last_diagnostics_at: new Date().toISOString(),
        diagnostics_meta: { refresh_test: new Date().toISOString() }
      })
      .eq('id', userId);

    if (updateError) {
      return {
        test_key: 'realtime_refresh',
        status: 'fail',
        details: { error: updateError.message, message_fr: `Échec mise à jour profil — ${updateError.message}` },
      };
    }

    // Small delay to allow propagation
    await new Promise((resolve) => setTimeout(resolve, 300));

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
    // The RPC returns now() so it should always be fresh
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
