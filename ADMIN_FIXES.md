# Corrections des problèmes identifiés

## 1. ✅ Rôle Admin manquant

L'utilisateur `appnutrizen@gmail.com` (ID: 55866f59-de43-4cdf-b5a0-59165de6cbc5) n'avait pas de rôle admin dans la table `user_roles`.

**Solution :**
Exécute le script SQL suivant dans le **SQL Editor** de Supabase :

```sql
-- Ajouter le rôle admin
INSERT INTO public.user_roles (user_id, role) 
VALUES ('55866f59-de43-4cdf-b5a0-59165de6cbc5', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Ou utilise le fichier : `scripts/fix-admin-role.sql`

**Lien vers SQL Editor :**
https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/sql/new

Après avoir exécuté ce script, l'utilisateur `appnutrizen@gmail.com` pourra :
- Gérer les crédits des utilisateurs
- Créer/supprimer des utilisateurs
- Accéder au dashboard admin
- Réinitialiser les comptes utilisateurs

---

## 2. ✅ Contrôles Thème/Langue ajoutés

Les contrôles pour changer le thème (clair/sombre) et la langue ont été ajoutés dans l'AppHeader :

**Desktop :**
- Icône Lune/Soleil pour changer le thème
- Menu déroulant avec drapeau pour changer la langue (FR, EN, ES, DE)

**Mobile :**
- Boutons complets avec texte dans le menu mobile
- Même fonctionnalité que sur desktop

Les paramètres sont sauvegardés automatiquement dans localStorage et persistent entre les sessions.

---

## 3. ⚠️ Mise à jour de la table Preferences

Le code de sauvegarde des préférences est correct. Si tu rencontres toujours des problèmes :

**Vérifications à faire :**

1. **Rate limiting** : Il y a une limite de 5 minutes entre chaque modification. Si tu vois le message "Trop rapide", attends simplement 5 minutes.

2. **Permissions RLS** : Vérifie que l'utilisateur est bien connecté. La policy RLS vérifie `auth.uid() = user_id`.

3. **Console du navigateur** : Ouvre les DevTools (F12) et vérifie s'il y a des erreurs dans la console lors de la sauvegarde.

**Test de débogage :**
```sql
-- Vérifier les préférences d'un utilisateur
SELECT * FROM preferences WHERE user_id = 'YOUR_USER_ID';

-- Vérifier la dernière mise à jour
SELECT user_id, updated_at FROM preferences WHERE user_id = 'YOUR_USER_ID';
```

**Si le problème persiste :**
1. Vérifie les logs de console dans le navigateur
2. Vérifie les logs Supabase pour voir si la requête arrive
3. Assure-toi que l'utilisateur a bien le droit d'écrire dans la table preferences

---

## 4. Test après corrections

1. **Teste le rôle admin** :
   - Connecte-toi avec `appnutrizen@gmail.com`
   - Va sur `/admin/users`
   - Essaie de modifier les crédits d'un utilisateur
   - Devrait fonctionner maintenant ✅

2. **Teste thème/langue** :
   - Clique sur l'icône Lune/Soleil → Le thème devrait changer
   - Clique sur le menu langue (icône Globe + drapeau) → Change la langue
   - Recharge la page → Les paramètres persistent ✅

3. **Teste les préférences** :
   - Va sur `/app/profile`
   - Modifie des préférences
   - Clique sur "Sauvegarder"
   - Attends 5 minutes si tu viens de modifier
   - Recharge la page → Les modifications persistent ✅

---

## Notes importantes

- **Rôle admin** : Seuls les utilisateurs avec le rôle 'admin' dans `user_roles` peuvent gérer les crédits
- **Rate limiting** : Les préférences ont un rate limit de 5 minutes pour éviter les abus
- **Thème/Langue** : Sauvegardés dans localStorage, pas dans la base de données
- **Préférences** : Sauvegardées dans la table `preferences` avec trigger automatique de `updated_at`
