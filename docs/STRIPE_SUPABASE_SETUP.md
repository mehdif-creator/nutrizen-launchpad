# 🔐 Configuration Stripe + Supabase - NutriZen

## ✅ Implémentation terminée

Le flux complet d'inscription via Stripe avec création automatique de compte et envoi de magic link est maintenant opérationnel.

---

## 📋 Configuration Supabase requise

### 1. **Auth Settings (CRITIQUE)**

Aller dans **Supabase Dashboard → Authentication → URL Configuration**

#### Site URL
```
https://mynutrizen.fr
```

#### Redirect URLs (ajouter ces 4 URLs)
```
https://mynutrizen.fr/**
https://mynutrizen.fr/auth/verify
https://mynutrizen.fr/app
http://localhost:3000/** (pour le développement)
```

### 2. **Email Templates**

Aller dans **Supabase Dashboard → Authentication → Email Templates**

#### Magic Link Template
Vérifier que le template "Magic Link" contient bien :
```
redirectTo: {{ .RedirectTo }}
```

### 3. **Auth Providers**

#### Désactiver le signup public (OPTIONNEL)
Si vous voulez que SEULS les utilisateurs ayant payé puissent se connecter :
- Aller dans **Supabase Dashboard → Authentication → Providers → Email**
- Désactiver "Enable email signups"

⚠️ **Note** : Avec le flux actuel, les utilisateurs sont créés via l'Edge Function (service_role), donc ils peuvent toujours s'inscrire via Stripe même avec signup désactivé.

#### Activer Google Sign-In
- Aller dans **Supabase Dashboard → Authentication → Providers → Google**
- Activer et configurer avec Client ID / Client Secret
- Callback URL : `https://mynutrizen.fr/auth/v1/callback`

### 4. **OTP Expiration**

Aller dans **Supabase Dashboard → Authentication → Auth Settings**
- **OTP Expiry** : `600` secondes (10 minutes)

---

## 🔑 Variables d'environnement Supabase

Ajouter ces variables dans **Supabase Edge Functions secrets** :

### Variables existantes (à vérifier)
```bash
STRIPE_SECRET_KEY=sk_test_xxx...
STRIPE_WEBHOOK_SECRET=whsec_xxx...
SUPABASE_URL=https://pghdaozgxkbtsxwydemd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
N8N_WEBHOOK_BASE=https://your-n8n.app/webhook
```

### Nouvelle variable CRITIQUE
```bash
APP_BASE_URL=https://mynutrizen.fr
```

Cette variable est utilisée pour générer le `redirectTo` du magic link.

#### Comment ajouter APP_BASE_URL
1. Aller sur Supabase Dashboard
2. **Settings → Edge Functions**
3. Ajouter le secret `APP_BASE_URL` avec la valeur `https://mynutrizen.fr`

---

## 🎯 Flux utilisateur (nouveau)

### 1. **L'utilisateur visite la landing**
- Voit les 3 plans sur `/#pricing`
- Clique sur "Commencer" → `/auth/signup` → redirigé vers `/#pricing`

### 2. **Choix du plan et paiement**
- Clique sur un bouton de pricing
- Appelle l'Edge Function `create-checkout`
- Redirigé vers Stripe Checkout (7 jours d'essai gratuit)

### 3. **Après paiement réussi**
- Redirigé vers `/post-checkout?session_id=xxx`
- Voit un message "🎉 Paiement confirmé - Vérification en cours..."
- Instructions pour vérifier ses emails

### 4. **Webhook Stripe → Création compte**
- Stripe envoie `checkout.session.completed` webhook
- Edge Function `stripe-webhook` :
  - ✅ Crée le user dans Supabase Auth (`email_confirm: true`)
  - ✅ Crée le profil dans `profiles`
  - ✅ Crée l'abonnement dans `subscriptions`
  - ✅ Génère un **magic link** via `admin.generateLink()`
  - ✅ Envoie l'email via n8n webhook avec le magic link

### 5. **L'utilisateur clique le magic link**
- Lien format : `https://mynutrizen.fr/auth/v1/verify?token=xxx&type=magiclink&redirect_to=https://mynutrizen.fr/app`
- Session créée automatiquement
- Redirigé vers `/app` (dashboard)

### 6. **Connexions futures**
- Page `/auth/login` :
  - ✅ Lien magique (nouvel envoi OTP)
  - ✅ Google Sign-In
  - ❌ PLUS de lien "Créer un compte" visible (redirige vers `/#pricing`)

---

## 🧪 Checklist de test

### Test en mode développement (localhost)

1. **Ajouter localhost aux Redirect URLs** (Supabase)
   ```
   http://localhost:3000/**
   ```

2. **Modifier APP_BASE_URL** temporairement
   ```bash
   APP_BASE_URL=http://localhost:3000
   ```

3. **Tester le flux complet** :
   - [ ] Clic sur pricing → Stripe Checkout
   - [ ] Paiement test (carte `4242 4242 4242 4242`)
   - [ ] Redirection vers `/post-checkout`
   - [ ] Réception email avec magic link
   - [ ] Clic sur le magic link
   - [ ] Session créée → redirection `/app`
   - [ ] Vérifier les données dans Supabase :
     - `auth.users` : user créé avec `email_confirmed_at` rempli
     - `profiles` : profil créé
     - `subscriptions` : status `trialing`, plan correct

### Test en production

1. **Remettre APP_BASE_URL en prod**
   ```bash
   APP_BASE_URL=https://mynutrizen.fr
   ```

2. **Configurer le webhook Stripe** :
   - URL : `https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/stripe-webhook`
   - Événements à écouter :
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

3. **Tester avec un vrai paiement**

---

## 🐛 Résolution "Lien invalide ou expiré"

Si vous voyez encore cette erreur, vérifiez :

### 1. **APP_BASE_URL est bien défini**
```bash
# Dans Supabase Edge Functions secrets
APP_BASE_URL=https://mynutrizen.fr
```

### 2. **Redirect URLs contient le domaine**
```
https://mynutrizen.fr/**
```

### 3. **Site URL est correct**
```
https://mynutrizen.fr
```

### 4. **OTP expiration est suffisante**
```
600 secondes (10 minutes)
```

### 5. **Le magic link utilise le bon domaine**
Vérifier dans les logs de l'Edge Function `stripe-webhook` :
```
[STRIPE-WEBHOOK] Generating magic link - {"email":"xxx","redirectTo":"https://mynutrizen.fr/app"}
```

### 6. **L'email est bien envoyé**
Si n8n webhook ne fonctionne pas, le magic link ne sera pas envoyé. Options :
- Vérifier que `N8N_WEBHOOK_BASE` est défini
- Vérifier que le webhook n8n `/welcome-email` fonctionne
- Alternative : utiliser Supabase email natif (modifier `email_confirm: false`)

---

## 📊 Mapping des plans Stripe

Les Price IDs sont mappés dans `stripe-webhook/index.ts` :

```typescript
if (priceId === 'price_1SIWDPEl2hJeGlFp14plp0D5') plan = 'essentiel';
else if (priceId === 'price_1SIWFyEl2hJeGlFp8pQyEMQC') plan = 'equilibre';
else if (priceId === 'price_1SIWGdEl2hJeGlFp1e1pekfL') plan = 'premium';
```

Et aussi dans `create-checkout/index.ts` pour les métadonnées.

---

## 🔐 Sécurité

### RLS (Row Level Security)

Les tables `profiles` et `subscriptions` ont déjà les bonnes policies :
- Les utilisateurs peuvent seulement voir leurs propres données
- Les insertions sont gérées par `handle_new_user` trigger OU par l'Edge Function (service_role)

### Signup public désactivé (optionnel)

Si vous désactivez le signup public :
- ✅ Les utilisateurs ne peuvent PAS s'inscrire via `/auth/signup` classique
- ✅ Les utilisateurs PEUVENT toujours être créés via webhook Stripe (service_role)
- ✅ Les utilisateurs existants peuvent se connecter (magic link, Google)

---

## 📞 Support

Si problème persistant :
1. Vérifier les logs Edge Functions : Supabase Dashboard → Edge Functions → Logs
2. Vérifier les logs Stripe : Stripe Dashboard → Developers → Webhooks → Logs
3. Vérifier les tables Supabase : `auth.users`, `profiles`, `subscriptions`

---

## 🎉 Résultat attendu

### Avant (PROBLÈME)
- User paie via Stripe
- Reçoit email de confirmation Supabase
- Clique le lien → ❌ "Lien invalide ou expiré"

### Après (SOLUTION)
- User paie via Stripe
- Redirigé vers `/post-checkout`
- Webhook crée le compte + génère magic link
- Reçoit email avec magic link valide
- Clique le lien → ✅ Session créée → Dashboard

---

**Questions ?** Contactez le support ou consultez :
- [Documentation Supabase Auth](https://supabase.com/docs/guides/auth)
- [Documentation Stripe Webhooks](https://stripe.com/docs/webhooks)
