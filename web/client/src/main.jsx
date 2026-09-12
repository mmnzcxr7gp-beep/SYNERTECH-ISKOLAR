import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Initialize Sentry asynchronously after initial mount to keep the critical rendering path fast
if (typeof window !== 'undefined') {
  const initSentry = () => {
    import('@sentry/react').then((Sentry) => {
      try {
        Sentry.init({
          dsn: 'https://47721864195147819142858605891395@o4500000000000000.ingest.sentry.io/4500000000000000',
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration(),
          ],
          tracesSampleRate: 1.0,
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
        })
      } catch (e) {
        console.warn('⚠️ Sentry frontend init notice:', e)
      }
    }).catch(() => {})
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(initSentry, { timeout: 2500 })
  } else {
    setTimeout(initSentry, 1200)
  }
}
