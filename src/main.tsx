import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/ui';
import './index.css';
import { listenForInstall } from './offline/install';
import { startOffline } from './offline/offline';
import { migrateStorageKeys } from './lib/storageKeys';
import { prefetchTool, toolInHash } from './routes/toolLoaders';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

migrateStorageKeys();
listenForInstall();

// Opened straight on a tool? Start fetching its code now instead of after the
// first render, so the two happen side by side.
const firstTool = toolInHash(window.location.hash);
if (firstTool) prefetchTool(firstTool);
if (import.meta.env.PROD) {
  // Keep a copy of the app on this device once the page has loaded, so it works offline.
  window.addEventListener('load', () => void startOffline());
}

// Hash URLs (#/tools/merge) work on GitHub Pages without a 404 redirect trick.
createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </HashRouter>
  </StrictMode>,
);
