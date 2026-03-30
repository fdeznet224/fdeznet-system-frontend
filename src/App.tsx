import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

// Páginas Principales (Admin)
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

import PanelCobrador from './pages/cobranza/PanelCobrador';

// 👇 VISTA PÚBLICA DEL CLIENTE (Solo QR)
import PortalCliente from './pages/portal/PortalCliente'; 

// =========================================
// 👇 ROL TÉCNICO (Mobile First)
// =========================================
import TechDashboard from './pages/technician/TechDashboard';
import ClientTechView from './pages/technician/ClientTechView';
import TechSearch from './pages/technician/TechSearch';
import TechRegister from './pages/technician/TechRegister'; 
import TechInstallForm from './pages/technician/TechInstallForm';
import QrScanner from './pages/tools/QrScanner';

function App() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          duration: 4000 
        }} 
      />
      
      <Routes>
        {/* REDIRECCIÓN: Si entran a la raíz, mandar al login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        <Route path="/login" element={<Login />} /> 
        <Route path="/portal/cliente/:cedula" element={<PortalCliente />} />

        {/* ZONA TÉCNICO */}
        <Route path="/scanner" element={<QrScanner />} />
        <Route path="/tech/dashboard" element={<TechDashboard />} />
        <Route path="/tech/buscar" element={<TechSearch />} />
        <Route path="/tech/cliente/:cedula" element={<ClientTechView />} />
        <Route path="/tech/nuevo" element={<TechRegister />} />
        <Route path="/tech/instalar/:cedula" element={<TechInstallForm />} />

        {/* 👇 COBRANZA (MOVIL) - FUERA DEL LAYOUT PARA PANTALLA COMPLETA */}
        <Route path="/admin/cobranza" element={<PanelCobrador />} />

        {/* =========================================
            👇 ZONA ADMINISTRATIVA (CON SIDEBAR)
           ========================================= */}
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
            
            {/* Finanzas */}
            <Route path="/admin/facturas" element={<Facturas />} />
            <Route path="/admin/transacciones" element={<Transacciones />} />
            <Route path="/admin/estadisticas" element={<Estadisticas />} />

            {/* Configuración Principal (Menú de Tarjetas) */}
            <Route path="/admin/configuracion" element={<Configuracion />} />
            
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
            
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App;