import {
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, createTheme } from '@mui/material/styles'; // 👈 INYECTORES DE MATERIAL UI
import 'leaflet/dist/leaflet.css';

// Configuración de tokens del theme para Material UI
import { getDesignTokens } from '@/theme';

// IMPORTAMOS EL CONTEXTO GLOBAL DE WHATSAPP
import { WhatsAppProvider } from '@/context/whatsapp/WhatsAppProvider';
import { SyncProvider } from '@/context/sync/SyncProvider';
import ConnectivityBanner from '@/components/app/ConnectivityBanner';
import AppErrorBoundary from '@/components/app/AppErrorBoundary';
import RoleGuard from '@/components/app/RoleGuard';
import type { AppRole } from '@/utils/roles';

const Login = lazy(() => import('@/pages/auth/Login'));
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const Layout = lazy(() => import('@/components/layout/Layout'));
const Clientes = lazy(() => import('@/pages/clientes/Clientes'));
const Planes = lazy(() => import('@/pages/infraestructura/planes/Planes'));
const Routers = lazy(() => import('@/pages/infraestructura/routers/Routers'));
const Redes = lazy(() => import('@/pages/infraestructura/redes/Redes'));
const Configuracion = lazy(() => import('@/pages/configuracion/Configuracion'));
const Orders = lazy(() => import('@/pages/admin/orders/Orders'));
const ServiceTerminations = lazy(
  () => import('@/pages/admin/bajas/ServiceTerminations'),
);
const MapaClientes = lazy(() => import('@/pages/monitoreo/MapaClientes'));
const MensajesCRM = lazy(() => import('@/pages/admin/mensajes/MensajesCRM'));
const WhatsAppOutbox = lazy(() => import('@/pages/admin/mensajes/WhatsAppOutbox'));
const InventarioPanel = lazy(() => import('@/pages/infraestructura/inventario/InventarioPanel'));
const CajasNap = lazy(() => import('@/pages/infraestructura/naps/CajasNap'));
const Facturas = lazy(() => import('@/pages/finanzas/Facturas'));
const Transacciones = lazy(() => import('@/pages/finanzas/Transacciones'));
const Estadisticas = lazy(() => import('@/pages/finanzas/Estadisticas'));
const Zonas = lazy(() => import('@/pages/configuracion/Zonas'));
const Usuarios = lazy(() => import('@/pages/configuracion/Usuarios'));
const Pppoe = lazy(() => import('@/pages/configuracion/Pppoe'));
const PlantillasMensajes = lazy(() => import('@/pages/configuracion/Plantillas'));
const BillingTemplates = lazy(
  () => import('@/pages/configuracion/BillingTemplates'),
);
const Importar = lazy(() => import('@/pages/configuracion/Importar'));
const Sistema = lazy(() => import('@/pages/configuracion/Sistema'));
const WhatsappPage = lazy(() => import('@/pages/configuracion/WhatsappPage'));
const CronjobLogs = lazy(() => import('@/pages/configuracion/CronjobLogs'));
const TunnelsVPN = lazy(() => import('@/pages/configuracion/TunnelsVPN'));
const PanelCobrador = lazy(() => import('@/pages/cobranza/PanelCobrador'));
const PortalCliente = lazy(() => import('@/pages/portal/PortalCliente'));
const TechDashboard = lazy(() => import('@/pages/technician/TechDashboard'));
const ClientTechView = lazy(() => import('@/pages/technician/ClientTechView'));
const TechSearch = lazy(() => import('@/pages/technician/TechSearch'));
const TechInstallForm = lazy(() => import('@/pages/technician/TechInstallForm'));
const QrScanner = lazy(() => import('@/pages/tools/QrScanner'));
const OltRadarVsolPage = lazy(() => import('@/pages/infraestructura/olts/OltRadarVsolPage'));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
      <div className="flex items-center gap-3" role="status" aria-live="polite">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
        <span>Cargando módulo…</span>
      </div>
    </div>
  );
}

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
  const protectedPage = (
    page: ReactNode,
    allowedRoles: AppRole[],
  ) => (
    <RoleGuard allowedRoles={allowedRoles}>
      {page}
    </RoleGuard>
  );

  return (
    <WhatsAppProvider>
      <ThemeProvider theme={muiTheme}>
        <SyncProvider>
          <BrowserRouter>
          <ConnectivityBanner />
          <Toaster 
            position="top-center" 
            toastOptions={{ 
              style: currentMode === 'dark' 
                ? { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' }
                : { background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' },
              duration: 4000 
            }} 
          />
          
          <AppErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* 🔥 RUTA RAÍZ - Ahora muestra la Landing Page 🔥 */}
            {/*<Route path="/" element={<LandingPage />} />
            <Route path="/docs" element={<DocsPage />} /> */}
            <Route path="/" element={<Login />} /> 
            <Route path="/login" element={<Login />} />
            <Route
              path="/portal/cliente/:cedula"
              element={protectedPage(
                <PortalCliente />,
                ['admin', 'supervisor', 'tecnico'],
              )}
            />

            {/* ZONA TÉCNICO */}
            <Route path="/scanner" element={protectedPage(<QrScanner />, ['tecnico'])} />
            <Route path="/tech/dashboard" element={protectedPage(<TechDashboard />, ['tecnico'])} />
            <Route path="/tech/buscar" element={protectedPage(<TechSearch />, ['tecnico'])} />
            <Route path="/tech/cliente/:cedula" element={protectedPage(<ClientTechView />, ['tecnico'])} />
            <Route path="/tech/instalar/:cedula" element={protectedPage(<TechInstallForm />, ['tecnico'])} />

            {/* COBRANZA (MOVIL) */}
            <Route
              path="/admin/cobranza"
              element={protectedPage(
                <PanelCobrador />,
                ['admin', 'supervisor', 'cajero'],
              )}
            />

            {/* ZONA ADMINISTRATIVA PRINCIPAL */}
            <Route
              element={protectedPage(
                <Layout />,
                ['admin', 'supervisor'],
              )}
            >
                <Route path="/admin/dashboard" element={protectedPage(<Dashboard />, ['admin'])} />
                <Route path="/admin/ordenes" element={protectedPage(<Orders />, ['admin', 'supervisor'])} />
                <Route path="/admin/bajas" element={protectedPage(<ServiceTerminations />, ['admin', 'supervisor'])} />
                <Route path="/admin/mapa" element={protectedPage(<MapaClientes />, ['admin'])} />
                
                {/* Gestión Comercial */}
                <Route path="/admin/clientes" element={protectedPage(<Clientes />, ['admin', 'supervisor'])} />
                <Route path="/admin/planes" element={protectedPage(<Planes />, ['admin'])} />
                
                {/* Infraestructura */}
                <Route path="/admin/routers" element={protectedPage(<Routers />, ['admin'])} />
                <Route path="/admin/naps" element={protectedPage(<CajasNap />, ['admin'])} />
                <Route path="/admin/redes" element={protectedPage(<Redes />, ['admin'])} />
                <Route path="/admin/radar" element={protectedPage(<OltRadarVsolPage />, ['admin'])} />
                <Route path="/admin/radar-vsol" element={protectedPage(<OltRadarVsolPage />, ['admin'])} />
                <Route path="/admin/inventario" element={protectedPage(<InventarioPanel />, ['admin'])} />
                
                {/* Finanzas */}
                <Route path="/admin/facturas" element={protectedPage(<Facturas />, ['admin'])} />
                <Route path="/admin/transacciones" element={protectedPage(<Transacciones />, ['admin'])} />
                <Route path="/admin/estadisticas" element={protectedPage(<Estadisticas />, ['admin'])} />

                {/* Configuración Principal */}
                <Route path="/admin/configuracion" element={protectedPage(<Configuracion />, ['admin'])} />
                <Route path="/admin/mensajes" element={protectedPage(<MensajesCRM />, ['admin'])} />
                <Route path="/admin/whatsapp/salidas" element={protectedPage(<WhatsAppOutbox />, ['admin', 'supervisor'])} />
                
                {/* Sub-rutas de Configuración */}
                <Route path="/admin/configuracion/zonas" element={protectedPage(<Zonas />, ['admin'])} />
                <Route path="/admin/configuracion/mensajes" element={protectedPage(<PlantillasMensajes />, ['admin'])} />
                <Route path="/admin/configuracion/plantillas-facturacion" element={protectedPage(<BillingTemplates />, ['admin'])} />
                <Route path="/admin/configuracion/importar" element={protectedPage(<Importar />, ['admin'])} />
                <Route path="/admin/configuracion/usuarios" element={protectedPage(<Usuarios />, ['admin'])} />
                <Route path="/admin/configuracion/pppoe" element={protectedPage(<Pppoe />, ['admin'])} />
                <Route path="/admin/configuracion/whatsapp-qr" element={protectedPage(<WhatsappPage />, ['admin'])} />
                <Route path="/admin/configuracion/cron" element={protectedPage(<CronjobLogs />, ['admin'])} />
                <Route path="/admin/configuracion/sistema" element={protectedPage(<Sistema />, ['admin'])} />
                <Route path="/admin/configuracion/vpn" element={protectedPage(<TunnelsVPN />, ['admin'])} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
          </AppErrorBoundary>
          </BrowserRouter>
        </SyncProvider>
      </ThemeProvider>
    </WhatsAppProvider>
  );
}

export default App;
