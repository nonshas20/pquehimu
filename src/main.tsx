import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

// Catch Vite dynamic chunk loading failures (e.g. after production deployments)
// and automatically reload to fetch the latest application chunks.
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite dynamic chunk preload error detected. Auto-refreshing page for new deployment...', event);
  const lastReload = sessionStorage.getItem('himu_last_preload_reload');
  const now = Date.now();
  // Prevent infinite reload loops if network is offline; allow reload once every 10 seconds
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('himu_last_preload_reload', now.toString());
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
