/** Índice navegable del módulo de configuración. */
import { useNavigate } from 'react-router-dom';
import { 
    MapPinIcon, ChatBubbleLeftRightIcon, ArrowUpTrayIcon, 
    UsersIcon, AdjustmentsHorizontalIcon, KeyIcon, 
    DocumentTextIcon, Cog6ToothIcon, QrCodeIcon,
    CommandLineIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function Configuracion() {
    const navigate = useNavigate();

    const herramientas = [
        {
            titulo: "Conexión WhatsApp",
            descripcion: "Escanear QR, ver estado y configurar velocidad de envío.",
            icon: QrCodeIcon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            path: "/admin/configuracion/whatsapp-qr"
        },
        {
            titulo: "Panel de Control & Cortes",
            descripcion: "Configura la automatización de cortes, horarios y notificaciones.",
            icon: Cog6ToothIcon,
            color: "text-indigo-600 dark:text-white", 
            bg: "bg-indigo-500/10 dark:bg-indigo-600/20", 
            path: "/admin/configuracion/sistema"
        },
        {
            titulo: "Túneles VPN",
            descripcion: "Administra túneles WireGuard para nodos remotos FdezNet.",
            icon: ShieldCheckIcon,
            color: "text-emerald-500 dark:text-emerald-400",
            bg: "bg-emerald-500/10",
            path: "/admin/configuracion/vpn"
        },
        {
            titulo: "Plantillas de Facturación",
            descripcion: "Define fechas de corte, límites de pago y reglas de suspensión.",
            icon: DocumentTextIcon,
            color: "text-pink-500",
            bg: "bg-pink-500/10",
            path: "/admin/configuracion/plantillas-facturacion"
        },
        {
            titulo: "Plantillas de Mensajes",
            descripcion: "Edita los mensajes de WhatsApp/SMS para avisos de pago.",
            icon: ChatBubbleLeftRightIcon,
            color: "text-teal-500",
            bg: "bg-teal-500/10",
            path: "/admin/configuracion/mensajes"
        },
        {
            titulo: "Gestión de Zonas",
            descripcion: "Configura las zonas geográficas y sectores de cobertura.",
            icon: MapPinIcon,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            path: "/admin/configuracion/zonas"
        },
        {
            titulo: "Usuarios del Sistema",
            descripcion: "Administra los permisos de empleados y técnicos.",
            icon: UsersIcon,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            path: "/admin/configuracion/usuarios"
        },
        {
            titulo: "Parámetros PPPoE",
            descripcion: "Configura la contraseña default y prefijos.",
            icon: KeyIcon,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            path: "/admin/configuracion/pppoe"
        },
        {
            titulo: "Importar Clientes",
            descripcion: "Carga masiva de clientes mediante Excel/CSV.",
            icon: ArrowUpTrayIcon,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            path: "/admin/configuracion/importar"
        },
        {
            titulo: "Terminal de Logs",
            descripcion: "Visor de eventos del sistema, errores y auditoría de cronjobs.",
            icon: CommandLineIcon, 
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            path: "/admin/configuracion/cron"
        }
    ];

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-700 dark:text-slate-200 pb-12">
            
            {/* =========================================================
                HEADER MINIMALISTA DE CONFIGURACIÓN
               ========================================================= */}
            <div className="px-1 md:px-0 flex-none">
                {/* ✅ LIMPIO: Texto puro sin íconos fijos */}
                <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                    Configuración General
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-0.5 hidden sm:block">
                    Administra las conexiones, automatizaciones y herramientas del sistema.
                </p>
            </div>
            
            <div className="border-t border-slate-200 dark:border-slate-800/80 my-1 flex-none"></div>

            {/* =========================================================
                GRID DE TARJETAS MODULARES ADAPTATIVAS
               ========================================================= */}
            <div className="flex-1 flex flex-col gap-4">
                <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1 md:px-0 flex-none">
                    <AdjustmentsHorizontalIcon className="w-4 h-4" />
                    Herramientas Administrativas
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {herramientas.map((item, index) => {
                        const isPanelCortes = item.titulo === "Panel de Control & Cortes";
                        return (
                            <button
                                key={index}
                                onClick={() => navigate(item.path)}
                                className={`group relative p-5 rounded-2xl border transition-all duration-300 text-left flex flex-col h-full active:scale-95 cursor-pointer
                                ${isPanelCortes 
                                    ? 'bg-white dark:bg-slate-800 border-indigo-500/40 dark:border-indigo-500/50 hover:border-indigo-500 shadow-md dark:shadow-indigo-500/5 ring-1 ring-indigo-500/10' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-blue-500/40 dark:hover:border-blue-500/50 shadow-sm dark:shadow-xl hover:shadow-md'}`}
                            >
                                {/* Contenedor del Icono */}
                                <div className={`w-11 h-11 ${item.bg} rounded-xl flex items-center justify-center mb-3.5 group-hover:scale-105 transition-transform duration-200 shrink-0`}>
                                    <item.icon className={`w-5 h-5 ${item.color}`} />
                                </div>
                                
                                {/* Título Dinámico */}
                                <h3 className={`text-base font-black transition-colors ${
                                    isPanelCortes 
                                        ? 'text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300' 
                                        : 'text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                                    {item.titulo}
                                </h3>
                                
                                {/* Descripción Dinámica */}
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-normal flex-1">
                                    {item.descripcion}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

        </div>
    );
}
