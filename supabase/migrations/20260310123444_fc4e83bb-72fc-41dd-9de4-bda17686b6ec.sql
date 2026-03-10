-- Fix RLS policies on article_queue to use user_roles instead of empty admin_users table
DROP POLICY IF EXISTS "Admins can select article_queue" ON article_queue;
DROP POLICY IF EXISTS "Admins can insert article_queue" ON article_queue;
DROP POLICY IF EXISTS "Admins can update article_queue" ON article_queue;
DROP POLICY IF EXISTS "Admins can delete article_queue" ON article_queue;

CREATE POLICY "Admins can select article_queue" ON article_queue
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can insert article_queue" ON article_queue
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update article_queue" ON article_queue
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete article_queue" ON article_queue
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));