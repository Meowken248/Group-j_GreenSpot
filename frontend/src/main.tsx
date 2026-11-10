import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './features/settings/GlobalTheme.scss'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerOfflineServiceWorker } from './features/offline/services/serviceWorkerRegistration'
import { LanguageProvider } from './i18n'

registerOfflineServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
)
