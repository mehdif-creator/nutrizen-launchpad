# Menus, profils et courses — correctif

## Comportement

La génération et les swaps partagent désormais les mêmes règles dans
`supabase/functions/_shared/menuPlanning.ts`. Le planificateur sélectionne des recettes
publiées du catalogue ; il n’appelle plus un modèle de langage pour composer la semaine.
Cette sélection ne consomme donc pas de crédits Lovable. Les Crédits Zen internes de
NutriZen restent facturés selon `feature_costs` (valeurs de secours : 6 / 11 pour une
semaine de 1 / 2 repas par jour, 1 pour un swap).

Une semaine contient exactement sept jours et les créneaux à domicile configurés,
avec sept ou quatorze recettes distinctes. Une insuffisance du catalogue ne provoque
ni semaine partielle, ni assouplissement des allergies, ni débit. Un swap modifie
exactement le repas demandé et revérifie le reste de la semaine.

| Critère | Application |
| --- | --- |
| Allergies individuelles, libres, historiques et familiales | Exclusion des ingrédients détectés + revue explicite obligatoire ; traces traitées séparément |
| Régime et aliments exclus | Filtres obligatoires ; halal/casher nécessitent une revue explicite |
| Conditions médicales et grossesse | Aucune recette admise sans revue couvrant la condition |
| Objectif, cible calorique, macros personnalisées, protéines/kg | Filtres obligatoires sur les données du catalogue et du profil |
| Temps, matériel, type de repas, épices, sucre, sel, laitages, fibres | Contraintes appliquées quand renseignées |
| Cuisines, ingrédients favoris, mode de cuisson, batch cooking | Classement des recettes déjà admissibles |
| Adultes, âges des enfants, membres présents, portions manuelles | Portions calculées par créneau ; décimales conservées |

Une cible calorique quotidienne explicite alloue **35 % par déjeuner ou dîner**, avec
**±20 %** de tolérance. Les proportions des macros personnalisées ont une tolérance
de **10 points** ; le minimum de protéines/kg utilise la même allocation de 35 %
et la tolérance de 20 %. Ce sont des paramètres de produit, pas une prescription
médicale. Le tableau de bord explique l’allocation calorique. Les autres repas et
collations ne sont pas couverts. Les coefficients enfants adaptent les quantités,
pas une prescription nutritionnelle pédiatrique.

Les contraintes sans données vérifiables ne sont pas inventées. Les préférences
biologiques, saisonnières ou le budget ne constituent pas des garanties de cette
version : le catalogue ne fournit pas de preuve de provenance, de saison ou de
prix d’achat permettant de les certifier. Le goût individuel ne peut pas être garanti.

## Cohérence et facturation

`commit_weekly_menu` enregistre le portefeuille, le menu, les lignes de repas,
les recettes quotidiennes et le reçu de demande dans une seule transaction.
Une erreur de stockage annule aussi le débit. Le verrou par utilisateur, la vérification
du menu précédent et le reçu unique empêchent les écrasements et les doubles débits.
Le navigateur conserve l’identifiant d’une demande non confirmée après une coupure
réseau ; une réponse perdue ne doit jamais être présentée comme une absence certaine
de débit.

La sauvegarde du profil bloque temporairement la génération jusqu’à la fin de toutes
ses sections. Une sauvegarde incomplète reste bloquante jusqu’à sa reprise réussie.
Modifier le profil, une recette utilisée ou son état de publication invalide les
menus concernés et leurs courses. Les anciennes semaines sont à régénérer.
Une sauvegarde de profil ne déclenche plus automatiquement une génération payante.

Les courses utilisent le facteur de portions enregistré pour chaque repas. Les
objets d’ingrédients conservent quantité/unité, les fractions et décimales sont
respectées et les fourchettes utilisent la borne haute pour les achats. Le sel non
quantifié reste « selon le goût ». L’affichage et les PDF ne convertissent plus des
pièces en poids supposés, ni du jus en un nombre supposé de fruits.

## Catalogue : condition préalable à la mise en service

Le catalogue observé le 3 octobre 2026 contient 7 768 recettes publiées. L’inspection
en lecture seule a révélé au moins une recette contenant de l’huile d’arachide avec
une liste d’allergènes qui ne mentionnait que les œufs. Une liste vide ou incomplète
ne prouve donc pas l’absence d’allergène. Aucun export massif, aucune correction de
recette et aucune certification automatique n’ont été effectués sur la production.

La migration ajoute `recipes.safety_review`, initialement NULL. Le format attendu est :

- `reviewed_by` : identité du responsable de la vérification ;
- `reviewed_at` : date de cette vérification ;
- `allergen_free` : catégories réellement vérifiées, dans le vocabulaire de `allergenKey` ;
- `trace_free` : catégories dont la gestion des traces a été vérifiée séparément ;
- `diets` : régimes explicitement vérifiés ;
- `medical_conditions` : conditions couvertes par une validation compétente.

**Ne pas remplir ces champs automatiquement à partir de mots-clés.** La vérification
doit porter sur la recette complète, les produits utilisés et leurs étiquetages ;
une recette générique ne garantit pas les traces des produits achetés ni les
conditions réelles de préparation. Une modification du contenu invalide la revue.

Avant activation pour les personnes allergiques ou ayant des besoins médicaux,
constituer un ensemble réellement vérifié suffisamment large pour leurs combinaisons
de critères. À défaut, la génération sera explicitement refusée sans débit.
Les profils vegan/halal/casher peuvent également manquer de recettes admissibles.
Les objectifs nutritionnels dépendent toujours de la justesse des données du catalogue.

## Vérification locale

```sh
npm ci
npm run test:menus
npx vite build
```

La suite ciblée couvre les profils représentatifs, les allergènes absents des
étiquettes, les exclusions, les objectifs et le matériel, les portions selon l’âge
et le groupe, les réponses incomplètes, les réessais, les swaps et les PDF.
Les tests PostgreSQL utilisent PGlite et exécutent la vraie migration ainsi que les
fonctions historiques de crédit et de lecture des quantités. Ils injectent notamment
une erreur après débit pour contrôler le rollback. Les tests des endpoints exécutent
les vrais modules avec des dépendances Supabase simulées ; ils ne constituent pas
un test de déploiement sur l’infrastructure Edge.

Résultats locaux : **102 tests ciblés réussis** (81 Vitest, 11 PostgreSQL,
10 endpoints), build Vite réussi, aucune erreur ESLint sur les fichiers frontend
modifiés. La suite générale donne 154 réussites, 5 échecs préexistants et 8 TODO.
Le contrôle TypeScript strict du planificateur réussit ; les trois erreurs de
typage global préexistantes ci-dessous restent présentes.

La suite générale comporte des échecs préexistants hors de ce périmètre
(`ProtectedRoute`, attentes obsolètes de crédits), et la vérification TypeScript de
l’application signale des erreurs préexistantes dans `AutomationApi` et
`useOnboardingGuard`. Le build Vite est vérifié séparément ; les scripts globaux
pré/post-build existants utilisent Bun. Le workflow `menu-regressions` est indépendant
du workflow général existant et ne désactive aucun contrôle.

## Déploiement coordonné à préparer en préproduction

1. Appliquer `20261002060229_menu_profile_consistency.sql` : elle convertit aussi
   `user_weekly_menu_items.target_servings` d’entier en numérique.
2. Déployer `generate-menu` et `use-swap` avec les deux nouveaux modules partagés.
3. Publier le frontend correspondant, puis tester génération, swap, modification du
   profil, courses et PDF avec des comptes de test et un portefeuille de test.
4. Valider la couverture des contraintes du catalogue avant activation en production.

Aucune migration, fonction Edge ou version frontend n’a été déployée sur la production
pendant ce correctif. Ne pas fusionner avant la revue du catalogue et la validation
coordonnée : un frontend publié sans la migration ne trouvera pas les nouvelles RPC.
En cas de retour arrière, conserver les reçus et l’historique des crédits ; ne pas
supprimer les transactions financières ni réactiver une génération qui ignore les allergies.
Les autres outils IA de recettes et les fonctions historiques non utilisées par ce
parcours doivent faire l’objet d’une vérification distincte avant réutilisation.
