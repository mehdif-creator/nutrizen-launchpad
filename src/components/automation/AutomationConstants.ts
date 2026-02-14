import { AutomationRecipe, SocialQueueItem, PinterestBoardMap } from './AutomationTypes';

const getRelativeDate = (daysOffset: number, hours: number = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
};

export const MOCK_RECIPES: AutomationRecipe[] = [
  { id: 'r-1', title: 'Poulet Basilic Thaï Épicé', cuisine_type: 'Thaï', badges: ['Protéiné', 'Épicé'], image_url: 'https://picsum.photos/400/600?random=1', ingredients_count: 8, created_at: '2023-10-01T10:00:00Z' },
  { id: 'r-2', title: 'Salade de Quinoa Méditerranéenne', cuisine_type: 'Méditerranéen', badges: ['Végan', 'Sans Gluten'], image_url: 'https://picsum.photos/400/600?random=2', ingredients_count: 12, created_at: '2023-10-02T11:30:00Z' },
  { id: 'r-3', title: 'Risotto aux Champignons Crémeux', cuisine_type: 'Italien', badges: ['Végétarien', 'Réconfortant'], image_url: 'https://picsum.photos/400/600?random=3', ingredients_count: 9, created_at: '2023-10-05T09:15:00Z' },
  { id: 'r-4', title: 'Toasts Avocat et Œuf Poché', cuisine_type: 'Petit-déjeuner', badges: ['Rapide', 'Bonnes Graisses'], image_url: 'https://picsum.photos/400/600?random=4', ingredients_count: 5, created_at: '2023-10-06T08:00:00Z' },
  { id: 'r-5', title: 'Tacos au Bœuf et Citron Vert', cuisine_type: 'Mexicain', badges: ['Familial'], image_url: 'https://picsum.photos/400/600?random=5', ingredients_count: 10, created_at: '2023-10-07T18:00:00Z' },
];

export const MOCK_QUEUE: SocialQueueItem[] = [
  { id: 'q-1', recipe_id: 'r-1', recipe_title: 'Poulet Basilic Thaï Épicé', image_path: 'https://picsum.photos/400/600?random=1', platform: 'Pinterest', status: 'posted', pin_title: 'Recette Facile de Poulet Thaï', pin_description: 'Un dîner prêt en 20 minutes qui a du punch ! #CuisineThai #Poulet', board_slug: 'recettes-thai', destination_url: 'https://nutrizen.app/recipe/thai-basil-chicken?utm_source=pinterest', utm_stats: { clicks: 124, impressions: 4500, saves: 32 }, published_at: getRelativeDate(-1, 14), attempts: 1 },
  { id: 'q-2', recipe_id: 'r-2', recipe_title: 'Salade de Quinoa Méditerranéenne', image_path: 'https://picsum.photos/400/600?random=2', platform: 'Pinterest', status: 'scheduled', pin_title: 'Bol Santé Quinoa Méditerranéen', pin_description: 'Parfait pour le meal prep. Végan et sans gluten.', board_slug: 'salades-sante', destination_url: 'https://nutrizen.app/recipe/med-quinoa?utm_source=pinterest', utm_stats: { clicks: 0, impressions: 0, saves: 0 }, scheduled_at: getRelativeDate(2, 9), attempts: 0 },
  { id: 'q-3', recipe_id: 'r-3', recipe_title: 'Risotto aux Champignons Crémeux', image_path: 'https://picsum.photos/400/600?random=3', platform: 'Pinterest', status: 'pending', pin_title: 'Le Meilleur Risotto Champignons', pin_description: 'Crémeux, onctueux et étonnamment facile à faire.', board_slug: 'diner-italien', destination_url: 'https://nutrizen.app/recipe/mushroom-risotto?utm_source=pinterest', utm_stats: { clicks: 0, impressions: 0, saves: 0 }, attempts: 0 },
  { id: 'q-5', recipe_id: 'r-1', recipe_title: 'Poulet Basilic Thaï Épicé (Republish)', image_path: 'https://picsum.photos/400/600?random=1', platform: 'Pinterest', status: 'posted', pin_title: 'Diner Rapide: Poulet Thaï', pin_description: 'Recette express.', board_slug: 'recettes-rapides', destination_url: 'https://nutrizen.app/recipe/thai-basil-chicken?utm_source=pinterest', utm_stats: { clicks: 54, impressions: 2100, saves: 10 }, published_at: getRelativeDate(-3, 11), attempts: 1 },
  { id: 'q-4', recipe_id: 'r-4', recipe_title: 'Toasts Avocat et Œuf Poché', image_path: 'https://picsum.photos/400/600?random=4', platform: 'Pinterest', status: 'error', pin_title: "L'Ultime Avocado Toast", pin_description: 'Commencez la journée du bon pied.', board_slug: 'idees-dej', destination_url: 'https://nutrizen.app/recipe/avo-toast?utm_source=pinterest', utm_stats: { clicks: 0, impressions: 0, saves: 0 }, error_message: 'Limite API Dépassée', attempts: 3 },
];

export const MOCK_BOARDS: PinterestBoardMap[] = [
  { id: 'b-1', cuisine_key: 'Thaï', board_slug: 'recettes-thai', board_name: 'Recettes Thaï Authentiques', pinterest_board_id: '12345', is_active: true },
  { id: 'b-2', cuisine_key: 'Méditerranéen', board_slug: 'salades-sante', board_name: 'Salades & Bols Santé', pinterest_board_id: '67890', is_active: true },
  { id: 'b-3', cuisine_key: 'Italien', board_slug: 'diner-italien', board_name: 'Idées Dîner Italien', pinterest_board_id: '11223', is_active: true },
  { id: 'b-4', cuisine_key: 'Mexicain', board_slug: 'fiesta-mexicaine', board_name: 'Fiesta Mexicaine', pinterest_board_id: '44556', is_active: true },
  { id: 'b-5', cuisine_key: 'Petit-déjeuner', board_slug: 'idees-dej', board_name: 'Petits-déjeuners Sains', pinterest_board_id: '77889', is_active: false },
];
