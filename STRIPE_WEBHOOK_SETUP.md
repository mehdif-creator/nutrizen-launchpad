# 🔧 Configuration du Webhook Stripe - Instructions Complètes

## ⚠️ PROBLÈME ACTUEL

Le paiement Stripe fonctionne mais l'utilisateur n'est pas créé dans Supabase car :
1. **Le webhook Stripe n'envoie pas les événements** à Supabase
2. **Les inscriptions sont désactivées** dans Supabase Auth
3. **L'URL du webhook n'est pas configurée** dans Stripe

## ✅ SOLUTION - ÉTAPES À SUIVRE

### ÉTAPE 1 : Activer les inscriptions dans Supabase

1. Aller sur : https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/auth/providers
2. Dans **Email Provider** :
   - ✅ Activer "Enable Email Confirmations" SI vous voulez envoyer un email de confirmation
   - ✅ OU désactiver "Enable Email Confirmations" pour une connexion immédiate
3. Dans **Authentication** > **Settings** > **Auth Providers** :
   - ✅ **IMPORTANT** : S'assurer que "Enable email signup" est **ACTIVÉ**
   - ⚠️ Si désactivé, les utilisateurs ne peuvent pas s'inscrire !

### ÉTAPE 2 : Configurer le Webhook dans Stripe

#### A. Trouver l'URL du Webhook Supabase

L'URL de votre webhook est :
```
https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/stripe-webhook
```

#### B. Configurer le Webhook dans Stripe

1. Aller sur le dashboard Stripe : https://dashboard.stripe.com/test/webhooks
2. Cliquer sur **"Add endpoint"** ou **"Ajouter un point de terminaison"**
3. Renseigner :
   - **URL du point de terminaison** : `https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/stripe-webhook`
   - **Description** (optionnel) : "NutriZen Webhook"
4. Dans **"Événements à envoyer"**, sélectionner :
   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
5. Cliquer sur **"Ajouter le point de terminaison"**

#### C. Récupérer le Secret du Webhook

1. Après avoir créé le webhook, Stripe affiche le **Signing secret**
2. Il ressemble à : `whsec_xxxxxxxxxxxxxxxxxxxxx`
3. **IMPORTANT** : Copier ce secret !

#### D. Ajouter le Secret dans Supabase

1. Aller sur : https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/settings/functions
2. Dans la section **"Secrets"**, vérifier que `STRIPE_WEBHOOK_SECRET` existe
3. Si le secret existe déjà, le **REMPLACER** par le nouveau secret de Stripe
4. Sinon, l'ajouter avec :
   - Nom : `STRIPE_WEBHOOK_SECRET`
   - Valeur : `whsec_xxxxxxxxxxxxxxxxxxxxx` (le secret copié depuis Stripe)

### ÉTAPE 3 : Tester le Webhook

#### A. Depuis Stripe

1. Dans Stripe Webhooks, cliquer sur le webhook créé
2. Aller dans l'onglet **"Tester"** ou **"Send test webhook"**
3. Sélectionner `checkout.session.completed`
4. Cliquer sur **"Envoyer l'événement de test"**

#### B. Vérifier les Logs

1. **Logs du Webhook Stripe** : https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/functions/stripe-webhook/logs
2. **Logs d'authentification** : https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/auth/users
3. **Table subscriptions** : https://supabase.com/dashboard/project/pghdaozgxkbtsxwydemd/editor/312847?schema=public

Vous devriez voir :
- ✅ Logs du webhook avec `[STRIPE-WEBHOOK] Webhook received`
- ✅ Un nouvel utilisateur dans la table Auth
- ✅ Un enregistrement dans la table `subscriptions`
- ✅ Un enregistrement dans la table `stripe_events`

### ÉTAPE 4 : Effectuer un Vrai Test de Paiement

1. Utiliser une carte de test Stripe : **4242 4242 4242 4242**
2. Date d'expiration : n'importe quelle date future (ex: 12/34)
3. CVC : n'importe quel 3 chiffres (ex: 123)
4. Compléter le paiement
5. Vérifier que :
   - ✅ L'utilisateur reçoit un email avec le magic link
   - ✅ L'utilisateur peut se connecter
   - ✅ L'utilisateur a accès au dashboard

## 🔍 DEBUGGING

### Si le webhook ne fonctionne toujours pas :

#### 1. Vérifier que Stripe envoie bien les événements

Dans Stripe > Webhooks > Votre webhook > Onglet "Tentatives d'envoi" :
- Vous devez voir les événements envoyés
- Le statut doit être **200 OK**
- Si erreur 401/403 : problème de secret webhook
- Si erreur 500 : voir les logs Supabase

#### 2. Vérifier les logs Supabase en détail

```bash
# Dans Supabase Dashboard > Functions > stripe-webhook > Logs
# Chercher ces messages :
- "[STRIPE-WEBHOOK] Webhook received"
- "[STRIPE-WEBHOOK] Event type: checkout.session.completed"
- "[STRIPE-WEBHOOK] Creating user account"
- "[STRIPE-WEBHOOK] User created successfully"
```

#### 3. Tester manuellement le webhook

Vous pouvez tester avec curl :

```bash
# Remplacer YOUR_WEBHOOK_SECRET par votre secret Stripe
curl -X POST https://pghdaozgxkbtsxwydemd.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{}'
```

Cela devrait retourner une erreur (normal sans signature valide) mais confirme que l'endpoint répond.

## 📧 Configuration de l'Email (Optionnel mais Recommandé)

Pour que les utilisateurs reçoivent l'email de bienvenue avec le magic link :

1. Vérifier que `N8N_WEBHOOK_BASE` est configuré dans les secrets Supabase
2. Le webhook n8n doit avoir un endpoint `/welcome-email` qui accepte :
   ```json
   {
     "email": "user@example.com",
     "magicLink": "https://...",
     "name": "User Name"
   }
   ```

## ✅ CHECKLIST FINALE

Avant de tester, vérifier que :

- [ ] Les inscriptions sont activées dans Supabase Auth
- [ ] Le webhook est créé dans Stripe avec la bonne URL
- [ ] Le secret `STRIPE_WEBHOOK_SECRET` est configuré dans Supabase
- [ ] Les événements `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` sont sélectionnés
- [ ] La table `stripe_events` existe dans Supabase (migration effectuée)
- [ ] Les politiques RLS permettent l'insertion dans les tables stats
- [ ] Le trigger `init_user_stats` est actif

## 🎯 FLUX COMPLET

Voici ce qui devrait se passer après un paiement :

1. **Utilisateur paie sur Stripe**
2. **Stripe envoie** `checkout.session.completed` au webhook
3. **Webhook reçoit** l'événement et vérifie la signature
4. **Webhook enregistre** l'événement dans `stripe_events` (idempotence)
5. **Webhook vérifie** si l'utilisateur existe déjà
6. **Si nouveau** :
   - Crée l'utilisateur dans Supabase Auth
   - Le trigger `init_user_stats` crée les entrées dans les tables stats
   - Crée l'enregistrement subscription
7. **Si existant** :
   - Met à jour l'enregistrement subscription
8. **Génère un magic link** pour connexion automatique
9. **Envoie un email** avec le magic link (via n8n)
10. **Utilisateur clique** sur le lien et est connecté automatiquement

## 🆘 SUPPORT

Si après toutes ces étapes le problème persiste, vérifier dans cet ordre :

1. Logs Stripe Webhook (dans Stripe Dashboard)
2. Logs Edge Function `stripe-webhook` (dans Supabase Dashboard)
3. Logs Auth (dans Supabase Dashboard)
4. Table `stripe_events` (doit contenir les événements reçus)
5. Table `profiles` (doit contenir le nouvel utilisateur)
6. Table `subscriptions` (doit contenir la subscription)
