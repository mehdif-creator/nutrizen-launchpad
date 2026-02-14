export type Platform = 'Pinterest' | 'Instagram' | 'TikTok';
export const PLATFORMS: Platform[] = ['Pinterest', 'Instagram', 'TikTok'];

export function isValidPlatform(p: string): p is Platform {
  return PLATFORMS.includes(p as Platform);
}

export type QueueStatus = 'pending' | 'rendered' | 'processing' | 'posted' | 'failed' | 'scheduled' | 'error';

export interface AutomationRecipe {
  id: string;
  title: string;
  cuisine_type: string;
  badges: string[];
  image_url: string;
  ingredients_count: number;
  created_at: string;
}

export interface SocialQueueItem {
  id: string;
  recipe_id: string;
  recipe_title: string;
  image_path: string;
  platform: Platform;
  status: QueueStatus;
  pin_title: string;
  pin_description: string;
  board_slug: string;
  destination_url: string;
  asset_9x16_path?: string;
  asset_4x5_path?: string;
  external_post_id?: string;
  external_post_url?: string;
  publish_error?: string;
  attempts: number;
  locked_at?: string;
  utm_stats: {
    clicks: number;
    impressions: number;
    saves: number;
  };
  scheduled_at?: string;
  published_at?: string;
  error_message?: string;
}

export interface PinterestBoardMap {
  id: string;
  cuisine_key: string;
  board_slug: string;
  board_name: string;
  pinterest_board_id: string;
  is_active: boolean;
}

export interface DashboardStats {
  totalPins: number;
  published: number;
  scheduled: number;
  errors: number;
  totalClicks: number;
  totalImpressions: number;
}

export interface AutomationSettings {
  timezone: string;
  language: string;
  supabaseUrl: string;
  supabaseKey: string;
  pinterestAppId: string;
  pinterestAppSecret: string;
  pinterestToken: string;
  cloudinaryName: string;
  cloudinaryKey: string;
  cloudinarySecret: string;
  googleAnalyticsId: string;
  defaultUtmSource: string;
  pinterestConnected?: boolean;
  pinterestTokenExpiresAt?: string;
}
