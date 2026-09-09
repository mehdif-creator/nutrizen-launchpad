# Correction des outils sur l’application native

## Ajustement demandé du scanner (API 3.1.2)

- [ ] Vérifier les options exactes de la version installée et la prise en charge EAN/UPC.
- [ ] Ajuster exclusivement le flux natif, sans modifier Open Food Facts, crédits, sauvegarde, Web ou authentification.
- [ ] Vérifier l’isolation native/Web, l’annulation et les permissions avec des tests ciblés.

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