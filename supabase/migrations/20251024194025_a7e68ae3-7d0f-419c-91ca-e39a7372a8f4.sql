-- ============================================================================
-- Migration: Create stripe_events table for webhook idempotency
-- Purpose: Prevent duplicate webhook processing
-- Author: AI Security Engineer
-- Date: 2025-10-24
-- ============================================================================

-- Create stripe_events table to track processed Stripe webhook events
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on stripe_events
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Only service_role can manage stripe_events
CREATE POLICY "Service role can manage stripe_events"
  ON public.stripe_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id ON public.stripe_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON public.stripe_events(created_at);