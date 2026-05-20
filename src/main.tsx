import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register' // 👈 Importante
import './index.css'
import App from './App.tsx'

// 1. Registro del Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nueva versión disponible. ¿Recargar para actualizar?')) {
      window.location.reload();
    }
  },
  onOfflineReady() {
    console.log('FdezNet listo para trabajar offline');
  },
})

// 2. Renderizado de la App
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)