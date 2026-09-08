import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.mynutrizen.app',
  appName: 'NutriZen',
  webDir: 'dist',
  // Local dev with live reload from the Lovable sandbox (optional):
  // server: { url: 'https://a4e7364c-6c94-4f23-85c6-e6adea1804c7.lovableproject.com?forceHideBadge=true', cleartext: true },
  ios: {
    contentInset: 'always',
  },
};

export default config;
