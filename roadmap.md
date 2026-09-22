# Mise en avant de l’offre de rentrée et des recettes

- [x] Mettre en avant RENTREE50 sur l’accueil, Fit et Mum, à saisir au paiement et valable jusqu’au 30 septembre 2026 inclus.
- [x] Afficher « Près de 4 000 recettes disponibles » et « Des centaines de nouvelles recettes ajoutées régulièrement », sans montant de remise non confirmé.
- [x] Vérifier les trois pages, la copie du code et le masquage automatique après expiration ; conserver l’essai gratuit et les paiements existants.
- Validation : 8 tests ciblés réussis ; copie réelle du code, lien vers les tarifs et affichage vérifiés sur les trois pages à 1280 px et 390 px, sans erreur navigateur en français.
- Expiration de l’affichage au 1er octobre 2026 à minuit, heure de Paris ; configuration et éligibilité Stripe inchangées.

# Aperçu social de l’accueil

- [x] Créer une image Open Graph 1200 × 630 avec la vraie interface hebdomadaire NutriZen.
- [x] Remplacer uniquement les métadonnées sociales et la description de l’accueil, dans le HTML initial et après chargement.
- [x] Vérifier le pré-rendu, l’unicité des balises, l’accès public à l’image et le typage ; validation automatique du projet passée.

# Correction des outils sur l’application native

## Ajustement demandé du scanner (API 3.1.2)

- [x] Vérifier les exports, types et sources installés de la version 3.1.2 : `hint` unique, `ALL` couvre EAN-13/EAN-8/UPC-A/UPC-E sans priorité configurable.
- [x] Sélectionner ML Kit sur Android, caméra arrière ; conserver le branchement natif déjà présent et le scanner Web inchangé.
- [x] Vérifier l’isolation native/Web, l’annulation et les permissions : 11 tests ciblés réussis avec les véritables enums du plugin.
- Open Food Facts, crédits, sauvegarde, UI, authentification, Preferences et deep links non modifiés.

## Correctifs précédents et validation externe

- [x] Corriger le CORS des analyses Scan Repas et Inspi Frigo ; fonctions redéployées et origines natives vérifiées.
- [x] Brancher le scanner natif ; conserver le scanner Web avec démarrage après montage de la vidéo.
- [x] Ajouter les tests et les consignes de permissions Android/iOS dans `docs/MOBILE_APP.md`.
- [x] Vérifier les prérequêtes CORS et le refus HTTP 401 des analyses sans authentification.
- [ ] Appliquer les permissions et SDK dans le clone mobile, compiler, réinstaller et valider sur téléphone.

## Vérifications

- 29 tests ciblés réussis : CORS, plugin natif, annulation, refus de permission, double clic, démontage et scanner Web.
- Suite complète : 78 réussites, 5 échecs hors du périmètre, 8 tests à implémenter.
  Les échecs concernent les attentes obsolètes des coûts de crédits (2 tests) et
  les mocks/comportements de `ProtectedRoute` (3 tests) ; ces fichiers ne sont pas modifiés.
- Les origines Android/iOS sont reflétées par les fonctions déployées ; une origine inconnue ne l’est pas.
- Pas de test authentifié de bout en bout ni de validation caméra physique possible dans cet environnement.
- Une publication Web seule ne suffit pas pour installer le nouveau plugin caméra : nouvelle compilation native nécessaire.