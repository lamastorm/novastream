import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { adBlocker } from './services/adBlocker'

// Démarrage du bouclier anti-pub et anti-popups pour mobiles et consoles
adBlocker.init()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
