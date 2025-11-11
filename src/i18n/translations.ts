/**
 * Translations for NutriZen
 * DEFAULT LOCALE: fr-FR
 * 
 * IMPORTANT: Refer to fr-glossary.ts for domain-specific terms
 * to avoid homonym errors (e.g., "four" = oven, not "quatre" = 4)
 */

export type TranslationKey = string;

export const translations = {
  fr: {
    // Appareils de cuisine (voir glossaire pour éviter "four" → "quatre")
    'appliance.oven': 'Four',
    'appliance.microwave': 'Micro-ondes', 
    'appliance.blender': 'Mixeur',
    'appliance.stove': 'Cuisinière',
    'appliance.airFryer': 'Friteuse à air',
    'appliance.slowCooker': 'Mijoteuse',
    'appliance.pressureCooker': 'Autocuiseur',
    
    // Profile page
    'profile.title': 'Tes préférences',
    'profile.subtitle': 'Aide-nous à personnaliser tes recommandations au maximum',
    'profile.save': 'Enregistrer mes préférences',
    'profile.saving': 'Enregistrement en cours...',
    'profile.saved': '✅ Tes préférences ont bien été enregistrées !',
    'profile.savingMenuRegen': 'Ton menu se régénère avec tes nouvelles préférences...',
    'profile.menuUpdated': '🎉 Menu mis à jour !',
    'profile.menuUpdatedDesc': 'Ton menu hebdomadaire a été régénéré.',
    'profile.errorSaving': 'Impossible de sauvegarder tes préférences. Réessaye plus tard.',
    'profile.tooFast': 'Trop rapide',
    'profile.waitMinutes': 'Tu peux modifier tes préférences dans {minutes} minute(s).',
    
    // Profile sections
    'profile.section.personal': 'Ton profil',
    'profile.section.goals': 'Tes objectifs',
    'profile.section.habits': 'Habitudes alimentaires',
    'profile.section.allergies': 'Allergies & restrictions',
    'profile.section.diet': 'Régime & préférences',
    'profile.section.nutrition': 'Objectifs nutritionnels',
    'profile.section.family': 'Contexte familial',
    'profile.section.lifestyle': 'Style de vie',
    
    // Profile fields
    'profile.gender': 'Sexe',
    'profile.gender.male': 'Homme',
    'profile.gender.female': 'Femme',
    'profile.gender.other': 'Autre',
    'profile.age': 'Âge',
    'profile.height': 'Taille (cm)',
    'profile.currentWeight': 'Poids actuel (kg)',
    'profile.targetWeight': 'Poids souhaité (kg)',
    'profile.activityLevel': 'Niveau d\'activité',
    'profile.activityLevel.sedentary': 'Sédentaire',
    'profile.activityLevel.light': 'Léger',
    'profile.activityLevel.moderate': 'Modéré',
    'profile.activityLevel.active': 'Actif',
    'profile.activityLevel.athlete': 'Sportif',
    'profile.job': 'Métier',
    'profile.job.sitting': 'Assis',
    'profile.job.standing': 'Debout',
    'profile.job.physical': 'Physique',
    'profile.job.other': 'Autre',
    'profile.select': 'Sélectionne...',
    
    // Menu generation
    'menu.generating': 'Génération de ton menu...',
    'menu.generatingDesc': 'Nous créons ton plan hebdomadaire personnalisé.',
    'menu.generated': 'Menu généré avec succès !',
    'menu.generatedDesc': 'Ton menu de la semaine est prêt.',
    'menu.error': 'Erreur lors de la génération',
    'menu.errorDesc': 'Impossible de générer ton menu. Réessaye dans quelques instants.',
    'menu.retry': 'Réessayer',
    'menu.viewMenu': 'Voir mon menu',
    
    // Post-checkout
    'postCheckout.title': '🎉 Paiement confirmé !',
    'postCheckout.welcome': 'Bienvenue dans la famille NutriZen',
    'postCheckout.completeProfile': 'Complète ton profil',
    'postCheckout.completeProfileDesc': 'Pour générer ton premier menu personnalisé, nous avons besoin de quelques informations.',
    'postCheckout.generatingMenu': 'Génération de ton menu en cours...',
    'postCheckout.menuReady': 'Ton menu hebdomadaire est prêt !',
    
    // Common UI
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.close': 'Fermer',
    'common.retry': 'Réessayer',
    'common.continue': 'Continuer',
    'common.back': 'Retour',
    
    // Errors
    'error.generic': 'Une erreur est survenue',
    'error.network': 'Erreur de connexion',
    'error.auth': 'Erreur d\'authentification',
    'error.notFound': 'Non trouvé',
  },
} as const;

export type Locale = keyof typeof translations;
export const DEFAULT_LOCALE: Locale = 'fr';

/**
 * Get translated text for a key
 * Falls back to the key itself if translation is missing
 */
export function t(key: TranslationKey, locale: Locale = DEFAULT_LOCALE): string {
  return translations[locale]?.[key as keyof typeof translations['fr']] || key;
}
