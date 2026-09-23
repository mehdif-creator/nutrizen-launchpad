# Compacter l’offre de rentrée sur mobile

## Modifications prévues

- Transformer uniquement sous 768 px la bannière haute en bloc compact : libellé et date serrés, coupon `RENTREE50` copiable en format réduit, puis lien « Voir les offres → ».
- Masquer sur mobile la phrase secondaire sur la saisie au paiement, tout en la conservant sur tablette et ordinateur ainsi que dans la zone tarifs.
- Masquer sur mobile la carte promotionnelle répétée dans les trois bandeaux principaux, sans retirer la carte « Près de 5 000 recettes disponibles ».
- Réduire la hauteur, l’interligne et les espacements de la barre de réassurance sur mobile, sans changer son texte ni son bouton de fermeture.
- Préserver à partir de 768 px la présentation actuelle, les conditions, l’expiration, la copie du code et tous les liens/actions.

## Validation

- Vérifier visuellement les trois accueils à 320, 360, 390, 412 et 430 px, puis contrôler une vue tablette et une vue ordinateur.
- Confirmer une seule promotion visible sur mobile, une hauteur de bannière inférieure à 140 px, aucun débordement horizontal, la copie du code et le lien vers les offres.
- Vérifier les erreurs navigateur, les tests ciblés, le typage et la compilation automatique du projet.

## Détails techniques

- Ajustements ciblés dans `RentreePromotion`, `HeroTopOffer` et `AnnouncementBar`, avec classes responsives existantes.
- Aucun changement de prix, d’offre, de navigation, de paiement, de contenu principal ou de logique métier.
