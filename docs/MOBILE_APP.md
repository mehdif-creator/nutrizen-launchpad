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

## Authentification Google native (deep link `nutrizen://auth/callback`)

Sur Capacitor, le bouton Google ouvre le navigateur système (`@capacitor/browser`) et
Supabase redirige vers `nutrizen://auth/callback`. L'app réceptionne l'URL via
`App.addListener('appUrlOpen')` (`src/hooks/useNativeAuthDeepLink.ts`), échange le code
PKCE (`exchangeCodeForSession`) puis navigue vers `/app/dashboard`. Le Web est inchangé.

### Supabase → Authentication → URL Configuration → Redirect URLs
Ajouter exactement :

```
nutrizen://auth/callback
```

### Android — `android/app/src/main/AndroidManifest.xml`
Dans la `<activity android:name=".MainActivity" ...>` existante, ajouter :

```xml
<intent-filter android:autoVerify="false">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="nutrizen" android:host="auth" android:pathPrefix="/callback" />
</intent-filter>
```

Vérifier aussi que l'activité a `android:launchMode="singleTask"` (valeur par défaut Capacitor)
pour que le retour OAuth réutilise l'instance en cours au lieu d'en ouvrir une nouvelle.

### iOS — `ios/App/App/Info.plist`

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>fr.mynutrizen.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>nutrizen</string>
    </array>
  </dict>
</array>
```

### Session persistante
- Web : `localStorage` (inchangé).
- Android/iOS : `@capacitor/preferences` (SharedPreferences / UserDefaults), survit à la
  fermeture, au retrait des apps récentes et au redémarrage ; effacée à la déconnexion,
  à l'effacement des données ou à la désinstallation.
- Au lancement natif, `NativeAuthGate` affiche uniquement le splash tant que la session
  n'est pas lue, puis envoie un utilisateur connecté de `/` vers `/app` (onboarding et
  redirection admin gérés par `ProtectedRoute` comme avant).

Après `git pull` : `npm install` puis `npx cap sync`.

## Scanner code-barres et analyses photo — mise à jour native obligatoire

Le scanner utilise désormais `@capacitor/barcode-scanner` dans l’app Android/iOS,
et conserve ZXing dans le navigateur. Le plugin ouvre une caméra native et demande
l’autorisation système ; une annulation ne lance pas de recherche produit.

Les dossiers `android/` et `ios/` ne sont pas présents dans ce dépôt : appliquer
les réglages suivants dans le clone qui contient vos projets natifs, avant compilation.

### Android

1. Dans `android/variables.gradle`, définir `minSdkVersion = 26` au minimum
   (ne pas abaisser une valeur déjà supérieure).
2. Dans `android/app/src/main/AndroidManifest.xml`, vérifier la présence de ces
   éléments directement sous `<manifest>`, en dehors de `<application>` :

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

Conserver les paramètres SDK et Java exigés par Capacitor 8 (SDK 36, Java 21).
Ne pas ajouter de contournement HTTP ou désactiver la sécurité réseau.

### iOS

Ajouter dans le dictionnaire principal de `ios/App/App/Info.plist` :

```xml
<key>NSCameraUsageDescription</key>
<string>NutriZen utilise la caméra pour scanner vos produits et photographier vos repas ou votre frigo.</string>
```

### Installer la mise à jour

Après récupération du code et configuration ci-dessus :

```bash
npm install
npm run build
npx cap sync
npx cap open android
# ou, sur Mac : npx cap open ios
```

Compiler puis réinstaller l’application sur le téléphone ; pour les stores,
incrémenter le numéro de version et distribuer un nouvel AAB/build iOS.
Publier uniquement le site ne met pas à jour le plugin dans une app déjà installée.

### Scan Repas et Inspi Frigo

Le CORS partagé autorise précisément les origines WebView `https://localhost`,
`http://localhost` et `capacitor://localhost`, en plus des origines web existantes.
Les fonctions `analyse-repas`, `analyze-fridge-photo` et `check-subscription` ont été
redéployées. L’authentification et les règles de crédits restent inchangées.

### Validation sur téléphone

- Autoriser la caméra, scanner un code EAN réel, vérifier le produit puis relancer un scan.
- Annuler le scanner : retour normal, sans message d’erreur ni recherche produit.
- Refuser la permission puis l’autoriser dans les réglages : vérifier que le scan redémarre.
- Fermer/réouvrir l’app et vérifier que la caméra peut être réutilisée.
- Avec un compte connecté et des crédits, analyser une photo de repas puis de frigo,
  depuis l’appareil photo et la galerie ; vérifier les résultats et le solde.
- Vérifier aussi ces trois fonctionnalités sur le site Web.

Les tests automatisés et les prérequêtes CORS ne remplacent pas cette validation
physique : aucun téléphone Android/iPhone n’est accessible depuis cet environnement.
