// Supabase client. Session storage is platform-aware:
//  - Web:            window.localStorage (unchanged)
//  - Capacitor iOS/Android: @capacitor/preferences (survives app kill / reboot)
import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from '@/lib/platform';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fail-fast: ensure required env vars are present
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env file. ' +
      'See .env.example for reference.'
  );
}

const native = isNativePlatform();

/** Async storage adapter backed by Capacitor Preferences (SharedPreferences / UserDefaults). */
const capacitorStorage: SupportedStorage = {
  getItem: async (key) => (await Preferences.get({ key })).value,
  setItem: async (key, value) => {
    await Preferences.set({ key, value });
  },
  removeItem: async (key) => {
    await Preferences.remove({ key });
  },
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    // On native the OAuth callback arrives through a deep link (appUrlOpen),
    // not through the WebView URL, so URL detection is only useful on the web.
    detectSessionInUrl: !native,
    flowType: 'pkce',
    storage: native ? capacitorStorage : window.localStorage,
  },
});
