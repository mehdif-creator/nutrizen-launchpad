-- Fix: add 'lifetime' and 'subscription' to the credit_type CHECK constraint
ALTER TABLE public.credit_transactions DROP CONSTRAINT credit_transactions_credit_type_check;

ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_credit_type_check
  CHECK (credit_type = ANY (ARRAY['allowance'::text, 'purchase'::text, 'one_time'::text, 'refill'::text, 'lifetime'::text, 'subscription'::text]));
