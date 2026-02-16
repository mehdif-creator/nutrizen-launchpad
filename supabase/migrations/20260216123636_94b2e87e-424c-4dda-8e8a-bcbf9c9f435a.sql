
-- Atomic RPC to award points, replacing the SELECT+UPDATE race condition
CREATE OR REPLACE FUNCTION public.rpc_award_points(
  p_user_id uuid,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points_to_award int;
  v_row user_points%ROWTYPE;
  v_new_total int;
  v_new_level text;
  v_new_streak int;
  v_today date := current_date;
  v_diff_days int;
  v_result jsonb;
BEGIN
  -- Determine points for action
  v_points_to_award := CASE p_action
    WHEN 'daily_login' THEN 1
    WHEN 'meal_generated' THEN 1
    WHEN 'meal_completed' THEN 2
    WHEN 'meal_swap' THEN 2
    WHEN 'referral' THEN 5
    WHEN 'weekly_completion' THEN 10
    ELSE 0
  END;

  IF v_points_to_award = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'unknown_action');
  END IF;

  -- Lock and fetch the row
  SELECT * INTO v_row
    FROM user_points
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    -- Insert new row
    INSERT INTO user_points (
      user_id, total_points, current_level,
      login_streak, last_login_date,
      meals_generated, meals_completed, referrals
    ) VALUES (
      p_user_id, v_points_to_award, 'Bronze',
      CASE WHEN p_action = 'daily_login' THEN 1 ELSE 0 END,
      CASE WHEN p_action = 'daily_login' THEN v_today ELSE NULL END,
      CASE WHEN p_action = 'meal_generated' THEN 1 ELSE 0 END,
      CASE WHEN p_action IN ('meal_completed','meal_swap') THEN 1 ELSE 0 END,
      CASE WHEN p_action = 'referral' THEN 1 ELSE 0 END
    );

    RETURN jsonb_build_object(
      'success', true,
      'points_awarded', v_points_to_award,
      'new_total', v_points_to_award,
      'new_level', 'Bronze'
    );
  END IF;

  -- Handle daily_login duplicate check
  IF p_action = 'daily_login' AND v_row.last_login_date = v_today THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_logged_today');
  END IF;

  v_new_total := v_row.total_points + v_points_to_award;

  -- Calculate level
  v_new_level := CASE
    WHEN v_new_total >= 300 THEN 'Platinum'
    WHEN v_new_total >= 150 THEN 'Gold'
    WHEN v_new_total >= 50 THEN 'Silver'
    ELSE 'Bronze'
  END;

  -- Build the update
  UPDATE user_points SET
    total_points = v_new_total,
    current_level = v_new_level,
    login_streak = CASE
      WHEN p_action = 'daily_login' AND v_row.last_login_date IS NOT NULL
        AND (v_today - v_row.last_login_date) = 1 THEN v_row.login_streak + 1
      WHEN p_action = 'daily_login' THEN 1
      ELSE login_streak
    END,
    last_login_date = CASE
      WHEN p_action = 'daily_login' THEN v_today
      ELSE last_login_date
    END,
    meals_generated = CASE
      WHEN p_action = 'meal_generated' THEN v_row.meals_generated + 1
      ELSE meals_generated
    END,
    meals_completed = CASE
      WHEN p_action IN ('meal_completed','meal_swap') THEN v_row.meals_completed + 1
      ELSE meals_completed
    END,
    referrals = CASE
      WHEN p_action = 'referral' THEN v_row.referrals + 1
      ELSE referrals
    END,
    updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points_to_award,
    'new_total', v_new_total,
    'new_level', v_new_level
  );
END;
$$;
