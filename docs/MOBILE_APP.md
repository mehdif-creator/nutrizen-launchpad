# NutriZen — App native iOS / Android (Capacitor)

## Une seule fois, sur votre ordinateur

1. Exporter le projet vers GitHub (bouton "Export to Github"), puis `git pull`.
2. `npm install`
3. `npx cap add ios` et/ou `npx cap add android`
4. `npx cap update ios` / `npx cap update android`
5. `npm run build`
6. `npx cap sync`
7. `npx cap run ios` (Mac + Xcode) ou `npx cap run android` (Android Studio)

## À chaque mise à jour du site

```bash
git pull
npm install
npm run build
npx cap sync
```

## Avant publication sur les stores

Dans `capacitor.config.ts`, supprimer le bloc `server` (il sert uniquement au
rechargement à chaud depuis le sandbox Lovable). L'app embarquera alors le
contenu de `dist`.

Comptes nécessaires : Apple Developer (99 $/an), Google Play (25 $ une fois).

Guide complet : https://lovable.dev/blogs/TODO
