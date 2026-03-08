import { createClient } from '../_shared/deps.ts';
import { getCorsHeaders, withSecurity, SecurityError } from '../_shared/security.ts';

Deno.serve(async (req) => {
  return await withSecurity(req, {
    requireAuth: true,
    rateLimit: { maxTokens: 30, refillRate: 60, cost: 1 },
  }, async (context, _body, logger) => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    });

    // Get current week's challenge (Monday-based, Europe/Paris)
    const now = new Date();
    const parisDate = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const dayOfWeek = parisDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(parisDate);
    monday.setDate(parisDate.getDate() + mondayOffset);
    const weekStart = monday.toISOString().split('T')[0];

    logger.info('Fetching weekly challenge', { weekStart, userId: context.userId });

    const { data: challenge, error: challengeError } = await supabaseClient
      .from('weekly_challenges')
      .select('*')
      .eq('week_start', weekStart)
      .maybeSingle();

    if (challengeError) {
      logger.error('Challenge fetch error', challengeError);
      throw new SecurityError('Unable to fetch challenge', 'DB_ERROR', 500);
    }

    if (!challenge) {
      logger.info('No challenge found for this week');
      return { 
        success: false, 
        message: 'Aucun défi disponible cette semaine'
      };
    }

    // Check if already completed
    const { data: completion, error: completionError } = await supabaseClient
      .from('user_challenge_completions')
      .select('id')
      .eq('user_id', context.userId)
      .eq('challenge_id', challenge.id)
      .maybeSingle();

    if (completionError) {
      logger.error('Completion check error', completionError);
      throw new SecurityError('Unable to check completion status', 'DB_ERROR', 500);
    }

    if (completion) {
      logger.info('Challenge already completed', { challengeId: challenge.id });
      return { 
        success: false, 
        message: 'Défi déjà complété cette semaine'
      };
    }

    // Create completion record
    const { error: insertError } = await supabaseClient
      .from('user_challenge_completions')
      .insert({ user_id: context.userId, challenge_id: challenge.id });

    if (insertError) {
      logger.error('Completion insert error', insertError);
      throw new SecurityError('Unable to record completion', 'DB_ERROR', 500);
    }

    // Award points via unified V2 gamification system
    const { data: awardResult, error: awardError } = await supabaseClient.rpc('fn_emit_gamification_event', {
      p_event_type: 'WEEKLY_CHALLENGE_COMPLETED',
      p_meta: { 
        challengeCode: challenge.code,
        challengeTitle: challenge.title,
        weekStart,
      },
      p_idempotency_key: `challenge:${context.userId}:${challenge.id}`,
    });

    if (awardError) {
      logger.error('Award points error', awardError);
      logger.warn('Points not awarded, but challenge marked complete');
    }

    const pointsAwarded = awardResult?.points_awarded || challenge.points_reward;

    logger.info('Challenge completed successfully', { 
      challengeId: challenge.id,
      points: pointsAwarded,
    });

    return { 
      success: true, 
      points: pointsAwarded,
      challenge: challenge.title,
      message: `🎉 Défi complété ! +${pointsAwarded} points`
    };
  });
});
