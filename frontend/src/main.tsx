import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import { AppErrorBoundary } from './components/ui/AppErrorBoundary'
import { ApiActivityIndicator } from './components/ui/ApiActivityIndicator'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppErrorBoundary><ApiActivityIndicator /><AuthProvider>
        <App />
      </AuthProvider></AppErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
