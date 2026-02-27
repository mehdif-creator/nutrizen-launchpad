CREATE OR REPLACE FUNCTION public.grant_welcome_credits(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_already_granted boolean;
BEGIN
  SELECT welcome_credits_granted INTO v_already_granted
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_already_granted IS TRUE THEN
    RETURN jsonb_build_object('success', true, 'already_granted', true, 'credits', 0);
  END IF;

  INSERT INTO public.user_wallets (
    user_id, subscription_credits, lifetime_credits,
    credits_total, balance_purchased, balance_allowance
  )
  VALUES (p_user_id, 0, 14, 14, 14, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_credits = public.user_wallets.lifetime_credits + 14,
    credits_total    = public.user_wallets.credits_total + 14,
    balance_purchased = public.user_wallets.balance_purchased + 14,
    updated_at       = now();

  UPDATE public.profiles
  SET welcome_credits_granted = true
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'already_granted', false, 'credits', 14);
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_welcome_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_welcome_credits(uuid) TO service_role;