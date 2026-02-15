-- Script pour donner le rôle admin à un utilisateur
-- Usage: Exécutez ce script dans Supabase SQL Editor
-- IMPORTANT: Remplacez 'admin@example.com' par l'email réel AVANT d'exécuter.
-- NE JAMAIS committer d'emails réels dans ce fichier.

-- ============================================
-- OPTION 1: Donner le rôle admin à un utilisateur par email
-- ============================================

DO $$
DECLARE
  target_email TEXT := 'admin@example.com'; -- ← REMPLACER par l'email réel
  target_user_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur avec email % non trouvé', target_email;
  END IF;
  
  -- Ajouter le rôle admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Rôle admin ajouté pour % (ID: %)', target_email, target_user_id;
END $$;

-- ============================================
-- OPTION 2: Vérifier tous les admins actuels
-- ============================================

SELECT 
  u.email,
  u.id,
  ur.role,
  u.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'admin'
ORDER BY u.email;

-- ============================================
-- OPTION 3: Retirer le rôle admin (si nécessaire)
-- ============================================

-- Décommentez et modifiez l'email pour retirer un admin
-- DELETE FROM public.user_roles 
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@example.com')
--   AND role = 'admin';
