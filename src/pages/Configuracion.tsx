import { useNavigate } from 'react-router-dom';
import { 
    MapPinIcon, ChatBubbleLeftRightIcon, ArrowUpTrayIcon, 
    UsersIcon, AdjustmentsHorizontalIcon, KeyIcon, 
    DocumentTextIcon, Cog6ToothIcon, QrCodeIcon,
    CommandLineIcon 
} from '@heroicons/react/24/outline';

export default function Configuracion() {
    const navigate = useNavigate();

    const herramientas = [
        // 1. CONEXIÓN WHATSAPP
        {
            titulo: "Conexión WhatsApp",
            descripcion: "Escanear QR, ver estado y configurar velocidad de envío.",
            icon: QrCodeIcon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            path: "/admin/configuracion/whatsapp-qr" // ✅ CORREGIDO
        },
        // 2. PANEL DE CONTROL (CORTES)
        {
            titulo: "Panel de Control & Cortes",
            descripcion: "Configura la automatización de cortes, horarios y notificaciones.",
            icon: Cog6ToothIcon,
            color: "text-white", // Nota: Ajusté colores para que resalte
            bg: "bg-indigo-600/20 border-indigo-500/50", 
            path: "/admin/configuracion/sistema" // ✅ CORREGIDO
        },
        // 3. PLANTILLAS DE FACTURACIÓN
        {
            titulo: "Plantillas de Facturación",
            descripcion: "Define fechas de corte, límites de pago y reglas de suspensión.",
            icon: DocumentTextIcon,
            color: "text-pink-500",
            bg: "bg-pink-500/10",
            path: "/admin/configuracion/plantillas-facturacion" // ✅ CORREGIDO
        },
        // 4. PLANTILLAS DE MENSAJES
        {
            titulo: "Plantillas de Mensajes",
            descripcion: "Edita los mensajes de WhatsApp/SMS para avisos de pago.",
            icon: ChatBubbleLeftRightIcon,
            color: "text-teal-500",
            bg: "bg-teal-500/10",
            path: "/admin/configuracion/mensajes" // ✅ CORREGIDO
        },
        // 5. GESTIÓN DE ZONAS
        {
            titulo: "Gestión de Zonas",
            descripcion: "Configura las zonas geográficas y sectores de cobertura.",
            icon: MapPinIcon,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            path: "/admin/configuracion/zonas" // ✅ CORREGIDO
        },
        // 6. USUARIOS
        {
            titulo: "Usuarios del Sistema",
            descripcion: "Administra los permisos de empleados y técnicos.",
            icon: UsersIcon,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            path: "/admin/configuracion/usuarios" // ✅ CORREGIDO
        },
        // 7. PPPoE
        {
            titulo: "Parámetros PPPoE",
            descripcion: "Configura la contraseña default y prefijos.",
            icon: KeyIcon,
            color: "text-rose-500",
            bg: "bg-rose-500/10",
            path: "/admin/configuracion/pppoe" // ✅ CORREGIDO
        },
        // 8. IMPORTAR
        {
            titulo: "Importar Clientes",
            descripcion: "Carga masiva de clientes mediante Excel/CSV.",
            icon: ArrowUpTrayIcon,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            path: "/admin/configuracion/importar" // ✅ CORREGIDO
        },
        // 9. LOGS
        {
            titulo: "Terminal de Logs",
            descripcion: "Visor de eventos del sistema, errores y auditoría de cronjobs.",
            icon: CommandLineIcon, 
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            path: "/admin/configuracion/cron" // ✅ CORREGIDO
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            
            {/* Cabecera Principal */}
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Configuración General</h2>
                <p className="text-slate-400 mt-1">Administra las conexiones, automatizaciones y herramientas del sistema.</p>
            </div>
            
            <div className="border-t border-slate-800 my-6"></div>

            {/* GRID DE HERRAMIENTAS */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <AdjustmentsHorizontalIcon className="w-5 h-5 text-slate-500"/>
                    Herramientas Administrativas
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {herramientas.map((item, index) => (
                        <button
                            key={index}
                            onClick={() => navigate(item.path)}
                            className={`group relative p-6 rounded-2xl border transition-all duration-300 text-left hover:shadow-2xl flex flex-col h-full active:scale-95
                            ${item.titulo === "Panel de Control & Cortes" 
                                ? 'bg-slate-800 border-indigo-500/50 hover:border-indigo-400 ring-1 ring-indigo-500/20' 
                                : 'bg-slate-800 border-slate-700/50 hover:border-blue-500/50 hover:shadow-blue-500/10'}`}
                        >
                            <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                <item.icon className={`w-6 h-6 ${item.color}`} />
                            </div>
                            
                            <h3 className={`text-lg font-bold transition-colors ${item.titulo === "Panel de Control & Cortes" ? 'text-white group-hover:text-indigo-300' : 'text-white group-hover:text-blue-400'}`}>
                                {item.titulo}
                            </h3>
                            
                            <p className="text-sm text-slate-400 mt-2 flex-1">
                                {item.descripcion}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

        </div>
    );
}