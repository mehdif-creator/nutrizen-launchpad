-- Fix drifted dashboard credits: sync from wallet (source of truth)
UPDATE user_dashboard_stats d
SET credits_zen = COALESCE(
  (SELECT w.subscription_credits + w.lifetime_credits FROM user_wallets w WHERE w.user_id = d.user_id),
  0
)
WHERE EXISTS (
  SELECT 1 FROM user_wallets w 
  WHERE w.user_id = d.user_id 
  AND (w.subscription_credits + w.lifetime_credits) != d.credits_zen
);