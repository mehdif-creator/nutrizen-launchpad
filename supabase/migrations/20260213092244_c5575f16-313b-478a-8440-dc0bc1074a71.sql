-- Enable RLS on pinterest_board_map
ALTER TABLE public.pinterest_board_map ENABLE ROW LEVEL SECURITY;

-- Public read access (non-sensitive mapping data)
CREATE POLICY "Anyone can view board mappings"
  ON public.pinterest_board_map
  FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage board mappings"
  ON public.pinterest_board_map
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));