import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyTheme } from './utils/themeUtils'

// Apply default theme immediately before React renders to prevent flash
applyTheme({
  primaryColor: '#A8518A',
  secondaryColor: '#1d4ed8',
  accentColor: '#facc15',
  backgroundColor: '#ffffff',
  textColor: '#0f172a',
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

