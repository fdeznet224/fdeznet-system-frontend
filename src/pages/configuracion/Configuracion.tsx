/** Índice navegable del módulo de configuración. */
import { useNavigate } from 'react-router-dom';
import { 
    MapPinIcon, ChatBubbleLeftRightIcon, ArrowUpTrayIcon, 
    UsersIcon, KeyIcon, 
    DocumentTextIcon, Cog6ToothIcon, QrCodeIcon,
    CommandLineIcon, ShieldCheckIcon, PaintBrushIcon, CircleStackIcon,
    PuzzlePieceIcon
} from '@heroicons/react/24/outline';
import { TARJETA } from '@/components/ui/estilo';
import { EncabezadoPagina } from '@/components/ui/Pagina';

export default function Configuracion() {
    const navigate = useNavigate();

    const herramientas = [
        {
            titulo: "Marca blanca",
            descripcion: "Configura nombre, logotipo, colores y datos comerciales.",
            icon: PaintBrushIcon,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            path: "/admin/configuracion/marca"
        },
        {
            titulo: "Integraciones y claves",
            descripcion: "Pagos por captura, inteligencia artificial, teléfonos de alerta y estado de las conexiones.",
            icon: PuzzlePieceIcon,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10",
            path: "/admin/configuracion/integraciones"
        },
        {
            titulo: "Conexión WhatsApp",
            descripcion: "Escanear QR, ver estado y configurar velocidad de envío.",
            icon: QrCodeIcon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            path: "/admin/configuracion/whatsapp-qr"
        },
        {
            titulo: "Bot de WhatsApp",
            descripcion: "Elige si contesta el agente de IA o el bot de flujo, y configura su conocimiento y sus menús.",
            icon: ChatBubbleLeftRightIcon,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
            path: "/admin/configuracion/bot-whatsapp"
        },
        {
            titulo: "Almacenamiento y cierres",
            descripcion: "Consulta el uso de disco, archiva meses y configura la limpieza segura.",
            icon: CircleStackIcon,
            color: "text-cyan-500",
            bg: "bg-cyan-500/10",
            path: "/admin/configuracion/almacenamiento"
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
            descripcion: "Administra túneles WireGuard para nodos remotos del ISP.",
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
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <EncabezadoPagina titulo="Configuración General" descripcion="Administra las conexiones, automatizaciones y herramientas del sistema." />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {herramientas.map((item) => (
                    <button
                        key={item.path}
                        type="button"
                        onClick={() => navigate(item.path)}
                        className={`${TARJETA} group flex h-full flex-col p-4 text-left transition hover:border-slate-300 active:scale-[0.98] dark:hover:border-slate-700`}
                    >
                        <span className={`mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
                            <item.icon className={`h-5 w-5 ${item.color}`} />
                        </span>
                        <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{item.titulo}</span>
                        <span className="mt-1 flex-1 text-xs leading-normal text-slate-500 dark:text-slate-400">{item.descripcion}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
