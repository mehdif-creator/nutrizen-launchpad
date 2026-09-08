import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a4e7364c6c944f2385c6e6adea1804c7',
  appName: 'nutrizen-launchpad',
  webDir: 'dist',
  server: {
    url: 'https://a4e7364c-6c94-4f23-85c6-e6adea1804c7.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
