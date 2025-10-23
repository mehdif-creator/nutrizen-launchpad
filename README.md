# NutriZen

Application de planification de repas personnalisée générant des menus hebdomadaires basés sur vos préférences alimentaires, restrictions diététiques et équipements disponibles.

## 🚀 Démarrage Rapide

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Éditer .env avec vos clés Supabase

# Développement
npm run dev
```

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Vue d'ensemble technique
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) - Standards et conventions
- [TESTS.md](./TESTS.md) - Guide de tests
- [README_INTEGRATION.md](./README_INTEGRATION.md) - Intégration backend-frontend

## 🛠️ Stack

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Edge Functions + Realtime)
- TanStack Query v5

## 📁 Structure

```
src/
├── actions/       # Server actions
├── components/    # React components
├── hooks/         # Custom hooks
├── lib/           # Utilities
└── pages/         # Routes
```

## 🧪 Commandes

```bash
npm run dev      # Développement
npm run build    # Production
npm run lint     # Linter
```

## 🔒 Sécurité

- RLS activé sur toutes les tables
- Clé service role jamais exposée
- Validation Zod sur Edge Functions

Voir [.env.example](./.env.example) pour configuration.
