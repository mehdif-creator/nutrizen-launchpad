-- Fix search_path security warnings for normalization functions

ALTER FUNCTION public.parse_quantity_text(text) SET search_path = public;
ALTER FUNCTION public.normalize_unit(text) SET search_path = public;
ALTER FUNCTION public.parse_ingredient_line(text) SET search_path = public;