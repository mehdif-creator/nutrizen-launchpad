
Objectif: rendre le tri par statut réellement fonctionnel dans l’onglet **File d’attente** de SEO Factory (pas l’onglet Articles).

Constat (cause racine)
- Le tri actuel que j’avais modifié concerne `AdminSeoFactory.tsx` (liste des **articles SEO**), pas `SeoQueueTab.tsx` (liste de la **file d’attente**).
- Dans `SeoQueueTab.tsx`, la table n’a aucun état de tri côté UI.
- Dans `useArticleQueue.ts`, les données sont toujours récupérées en ordre fixe `priority ASC, created_at ASC`, donc impossible pour l’utilisateur de trier par statut.

Plan d’implémentation
1) Ajouter un vrai état de tri dans `SeoQueueTab.tsx`
- Créer un state dédié, par exemple:
  - `sortBy: 'queue' | 'status' | 'created_at' | 'priority'`
  - `sortDir: 'asc' | 'desc'`
- Valeur par défaut conservant l’ordre métier actuel (`queue` = priorité puis date de création).

2) Calculer les lignes affichées avec un tri local (useMemo)
- Ajouter un `sortedItems = useMemo(...)` basé sur `items`.
- Implémenter un ordre de statut explicite pour la file:
  - `pending`, `processing`, `error`, `done` (ou inversion selon `sortDir`).
- Prévoir un fallback pour les statuts inconnus (tri alphabétique en dernier).
- Remplacer `items.map(...)` par `sortedItems.map(...)` dans la table.

3) Exposer le tri dans l’UI de la file d’attente
- Ajouter un contrôle visible “Trier par” dans la barre de contrôle de `SeoQueueTab` (même style que l’onglet Articles).
- Optionnel mais recommandé: rendre l’en-tête “Statut” cliquable (icône de tri) pour basculer asc/desc rapidement.
- Garder les compteurs (`en attente`, `en cours`, etc.) inchangés: ils doivent continuer à refléter l’ensemble des items, pas seulement l’ordre d’affichage.

4) Vérification fonctionnelle
- Vérifier que le tri “Statut” regroupe correctement les lignes.
- Vérifier que le polling (5s) ne casse pas le tri sélectionné.
- Vérifier que les actions de ligne (Lancer, Supprimer, Réessayer) fonctionnent toujours après tri.
- Vérifier que l’ordre “queue” reste disponible pour revenir au comportement opérationnel initial.

Détails techniques (section dédiée)
- Fichiers ciblés:
  - `src/pages/admin/seo/SeoQueueTab.tsx` (principal)
  - éventuellement `src/pages/admin/seo/types.ts` pour centraliser une constante `QUEUE_STATUS_ORDER`.
- Aucun changement backend/Supabase nécessaire.
- Aucun impact sur le processeur auto (`useQueueProcessor`) ni sur l’ordre réel de traitement de la queue.
- Ne pas toucher de fichiers non liés (notamment `public/sitemap.xml`).

Critères d’acceptation
- Dans **File d’attente**, je peux choisir “Statut” et voir un ordre cohérent immédiatement.
- Le tri persiste visuellement pendant les rafraîchissements automatiques.
- Les éléments `pending/processing/error/done` sont bien regroupés et exploitables.
