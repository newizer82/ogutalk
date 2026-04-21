import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AuthCallbackPage from './pages/AuthCallbackPage.jsx'

const isAuthCallback = window.location.pathname === '/auth/callback'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAuthCallback ? <AuthCallbackPage /> : <App />}
  </StrictMode>,
)
