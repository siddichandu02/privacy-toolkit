import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './components/ui';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

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
