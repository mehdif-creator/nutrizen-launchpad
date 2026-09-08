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
