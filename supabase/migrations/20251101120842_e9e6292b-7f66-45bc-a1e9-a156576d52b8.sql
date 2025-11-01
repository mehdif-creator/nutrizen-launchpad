-- ============================================================================
-- Migration: Fix function search_path security issue
-- Purpose: Set search_path on to_num function to prevent search path attacks
-- Security Issue: WARN level - Function without fixed search_path
-- ============================================================================

-- Fix the to_num function to have a fixed search_path
ALTER FUNCTION public.to_num(text) SET search_path = public;