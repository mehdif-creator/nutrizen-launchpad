import { createRoot } from 'react-dom/client';
import { AppProviders } from './providers/AppProviders';
import App from './App.tsx';
import { initGoogleAnalytics } from './lib/ga';
import './index.css';

initGoogleAnalytics();

createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>
);
