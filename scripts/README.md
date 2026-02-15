# Scripts SQL opérationnels

## ⚠️ Règles de sécurité

1. **Ne JAMAIS committer d'emails réels** (Gmail, Hotmail, etc.) dans ces scripts.
2. Utilisez des placeholders comme `admin@example.com` ou `user@example.com`.
3. Remplacez les placeholders par les vraies valeurs **uniquement au moment de l'exécution** dans le SQL Editor Supabase.
4. Pour les opérations de production sensibles, utilisez des runbooks opérationnels en dehors de Git.

## Scripts disponibles

| Fichier | Description |
|---------|-------------|
| `add-admin-user.sql` | Ajouter/vérifier/retirer le rôle admin d'un utilisateur |
| `fix-admin-role.sql` | Correction rapide du rôle admin par email |
| `reset-user-mouldi.sql` | Réinitialisation complète d'un compte utilisateur (gamification, crédits, menus) |

## Utilisation

1. Ouvrez le [SQL Editor Supabase](https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/sql/new)
2. Copiez le contenu du script
3. **Remplacez les placeholders** (`admin@example.com`, `user@example.com`) par les emails réels
4. Exécutez le script
