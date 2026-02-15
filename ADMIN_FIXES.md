# Corrections des problèmes identifiés

## 1. ✅ Rôle Admin manquant

Utilisez le script `scripts/add-admin-user.sql` pour ajouter le rôle admin à un utilisateur.

**Lien vers SQL Editor :**
https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/sql/new

Après avoir exécuté ce script, l'utilisateur admin pourra :
- Gérer les crédits des utilisateurs
- Créer/supprimer des utilisateurs
- Accéder au dashboard admin
- Réinitialiser les comptes utilisateurs

---

## 2. ✅ Contrôles Thème/Langue ajoutés

Les contrôles pour changer le thème (clair/sombre) et la langue ont été ajoutés dans l'AppHeader.

---

## 3. ⚠️ Mise à jour de la table Preferences

Le code de sauvegarde des préférences est correct. Voir la documentation pour le débogage.

---

## Notes importantes

- **Rôle admin** : Seuls les utilisateurs avec le rôle 'admin' dans `user_roles` peuvent gérer les crédits
- **Rate limiting** : Les préférences ont un rate limit de 5 minutes pour éviter les abus
- **Thème/Langue** : Sauvegardés dans localStorage
- **Scripts SQL** : Ne JAMAIS committer d'emails réels. Voir `scripts/README.md`.
