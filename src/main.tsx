import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register' // 👈 Importante
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import './index.css'
import App from './App.tsx'
import { escucharInstalacion } from './pages/portal/cliente/instalacion'

// 1. Registro del Service Worker
const updateServiceWorker = registerSW({
  onNeedRefresh() {
    if (confirm('Nueva versión disponible. ¿Recargar para actualizar?')) {
      void updateServiceWorker(true);
    }
  },
  onOfflineReady() {
    console.log('FdezNet listo para trabajar offline');
  },
})

// El aviso de "Instalar app" del portal llega una sola vez y puede ser antes de abrirlo.
escucharInstalacion()

// 2. Renderizado de la App
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
