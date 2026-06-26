import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, createTheme } from '@mui/material/styles'; // 👈 INYECTORES DE MATERIAL UI
import 'leaflet/dist/leaflet.css';

// Configuración de tokens del theme para Material UI
import { getDesignTokens } from './theme';

// Páginas Principales (Públicas y Admin)
{/*import LandingPage from './pages/LandingPage'; // 🔥 AQUÍ IMPORTAMOS LA LANDING PAGE
import DocsPage from './pages/DocsPage';*/}
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import Clientes from './pages/Clientes';
import Planes from './pages/Planes';
import Routers from './pages/Routers';
import Redes from './pages/Redes';
import Configuracion from './pages/Configuracion';
import Orders from './pages/admin/Orders'; 
import MapaClientes from './components/MapaClientes';
import MensajesCRM from './pages/admin/MensajesCRM';
import RadarOlt from './pages/monitoreo/RadarOlt';
import InventarioPanel from './pages/InventarioPanel';

// IMPORTAMOS EL CONTEXTO GLOBAL DE WHATSAPP
import { WhatsAppProvider } from './context/WhatsAppContext';

// --- INFRAESTRUCTURA FTTH ---
import CajasNap from './pages/infraestructura/CajasNap';

// --- FINANZAS ---
import Facturas from './pages/finanzas/Facturas';
import Transacciones from './pages/finanzas/Transacciones';
import Estadisticas from './pages/finanzas/Estadisticas';

// --- CONFIGURACIÓN ---
import Zonas from './pages/configuracion/Zonas';
import Usuarios from './pages/configuracion/Usuarios';
import Pppoe from './pages/configuracion/Pppoe';
import PlantillasMensajes from './pages/configuracion/Plantillas'; 
import BillingTemplates from './pages/configuracion/BillingTemplates';
import Importar from './pages/configuracion/Importar';
import Sistema from './pages/configuracion/Sistema';
import WhatsappPage from './pages/configuracion/WhatsappPage';
import CronjobLogs from './pages/configuracion/CronjobLogs';
import TunnelsVPN from './pages/configuracion/TunnelsVPN';

import PanelCobrador from './pages/cobranza/PanelCobrador';

// VISTA PÚBLICA DEL CLIENTE (Solo QR)
import PortalCliente from './pages/portal/PortalCliente'; 

// ROL TÉCNICO (Mobile First)
import TechDashboard from './pages/technician/TechDashboard';
import ClientTechView from './pages/technician/ClientTechView';
import TechSearch from './pages/technician/TechSearch';
import TechRegister from './pages/technician/TechRegister'; 
import TechInstallForm from './pages/technician/TechInstallForm';
import QrScanner from './pages/tools/QrScanner';

function App() {
  // --- 🔥 CONECTOR INTELIGENTE (LOCALSTORAGE + SISTEMA OPERATIVO) 🔥 ---
  const [currentMode, setCurrentMode] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'light' ? 'light' : 'dark';
    }
    // Si no hay tema guardado, detectamos el sistema del usuario (celular/PC)
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Efecto 1: Aplica la clase para Tailwind y guarda en LocalStorage automáticamente
  useEffect(() => {
    const root = window.document.documentElement; 

    if (currentMode === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark'; 
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
    localStorage.setItem('theme', currentMode);
  }, [currentMode]);

  // Efecto 2: Escuchadores de eventos optimizados (SIN setInterval)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        setCurrentMode(e.newValue === 'light' ? 'light' : 'dark');
      }
    };

    const handleCustomThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setCurrentMode(customEvent.detail);
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      setCurrentMode(e.matches ? 'dark' : 'light');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-changed', handleCustomThemeChange);
    mediaQuery.addEventListener('change', handleSystemChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-changed', handleCustomThemeChange);
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  const muiTheme = createTheme(getDesignTokens(currentMode));

  return (
    <WhatsAppProvider>
      <ThemeProvider theme={muiTheme}>
        <BrowserRouter>
          <Toaster 
            position="top-center" 
            toastOptions={{ 
              style: currentMode === 'dark' 
                ? { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }
                : { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' },
              duration: 4000 
            }} 
          />
          
          <Routes>
            {/* 🔥 RUTA RAÍZ - Ahora muestra la Landing Page 🔥 */}
            {/*<Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<DocsPage />} /> */}
            <Route path="/login" element={<Login />} /> 
            <Route path="/portal/cliente/:cedula" element={<PortalCliente />} />

            {/* ZONA TÉCNICO */}
            <Route path="/scanner" element={<QrScanner />} />
            <Route path="/tech/dashboard" element={<TechDashboard />} />
            <Route path="/tech/buscar" element={<TechSearch />} />
            <Route path="/tech/cliente/:cedula" element={<ClientTechView />} />
            <Route path="/tech/nuevo" element={<TechRegister />} />
            <Route path="/tech/instalar/:cedula" element={<TechInstallForm />} />

            {/* COBRANZA (MOVIL) */}
            <Route path="/admin/cobranza" element={<PanelCobrador />} />

            {/* ZONA ADMINISTRATIVA PRINCIPAL */}
            <Route element={<Layout />}>
                <Route path="/admin/dashboard" element={<Dashboard />} />
                <Route path="/admin/ordenes" element={<Orders />} />
                <Route path="/admin/mapa" element={<MapaClientes />} />
                
                {/* Gestión Comercial */}
                <Route path="/admin/clientes" element={<Clientes />} />
                <Route path="/admin/planes" element={<Planes />} />
                
                {/* Infraestructura */}
                <Route path="/admin/routers" element={<Routers />} />
                <Route path="/admin/naps" element={<CajasNap />} />
                <Route path="/admin/redes" element={<Redes />} />
                <Route path="/admin/radar" element={<RadarOlt />} />
                <Route path="/admin/inventario" element={<InventarioPanel />} />
                
                {/* Finanzas */}
                <Route path="/admin/facturas" element={<Facturas />} />
                <Route path="/admin/transacciones" element={<Transacciones />} />
                <Route path="/admin/estadisticas" element={<Estadisticas />} />

                {/* Configuración Principal */}
                <Route path="/admin/configuracion" element={<Configuracion />} />
                <Route path="/admin/mensajes" element={<MensajesCRM />} />
                
                {/* Sub-rutas de Configuración */}
                <Route path="/admin/configuracion/zonas" element={<Zonas />} />
                <Route path="/admin/configuracion/mensajes" element={<PlantillasMensajes />} /> 
                <Route path="/admin/configuracion/plantillas-facturacion" element={<BillingTemplates />} />
                <Route path="/admin/configuracion/importar" element={<Importar />} />
                <Route path="/admin/configuracion/usuarios" element={<Usuarios />} />
                <Route path="/admin/configuracion/pppoe" element={<Pppoe />} />
                <Route path="/admin/configuracion/whatsapp-qr" element={<WhatsappPage />} />
                <Route path="/admin/configuracion/cron" element={<CronjobLogs />} />
                <Route path="/admin/configuracion/sistema" element={<Sistema />} />
                <Route path="/admin/configuracion/vpn" element={<TunnelsVPN />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </WhatsAppProvider>
  );
}

export default App;