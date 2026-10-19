import type { ComponentType } from 'react';
import {
    ArchiveBoxIcon, BanknotesIcon, ChartBarIcon, ChatBubbleLeftRightIcon,
    ClipboardDocumentListIcon, Cog6ToothIcon, ComputerDesktopIcon, CubeIcon,
    DocumentTextIcon, GlobeAltIcon, HomeIcon, MapIcon, ServerStackIcon,
    ShieldCheckIcon, SignalIcon, SparklesIcon, UsersIcon, ArrowDownTrayIcon,
    QrCodeIcon, BoltIcon, CircleStackIcon, CommandLineIcon, WifiIcon,
} from '@heroicons/react/24/outline';

import type { AppRole } from '@/utils/roles';

type Icono = ComponentType<{ className?: string }>;

export interface ItemNav {
    nombre: string;
    ruta: string;
    icono: Icono;
    roles: AppRole[];
    /** Nombre corto para la barra de abajo del celular. */
    corto?: string;
    /** Roles que lo tienen en la barra de abajo del celular (máximo 4 por rol). */
    barra?: AppRole[];
    /** Otras palabras con las que se encuentra en el buscador. */
    palabras?: string;
}

export interface GrupoNav {
    nombre: string;
    icono: Icono;
    items: ItemNav[];
}

export const GRUPO_PRINCIPAL = 'Principal';
const ADMIN: AppRole[] = ['admin'];
const AMBOS: AppRole[] = ['admin', 'supervisor'];

/** El primer grupo no lleva título: es lo de todos los días. */
export const GRUPOS: GrupoNav[] = [
    {
        nombre: GRUPO_PRINCIPAL,
        icono: HomeIcon,
        items: [
            { nombre: 'Inicio', ruta: '/admin/dashboard', icono: HomeIcon, roles: ADMIN, barra: ADMIN, palabras: 'dashboard panel resumen' },
            { nombre: 'Clientes', ruta: '/admin/clientes', icono: UsersIcon, roles: AMBOS, barra: AMBOS, palabras: 'abonados contratos' },
        ],
    },
    {
        nombre: 'Operaciones',
        icono: ClipboardDocumentListIcon,
        items: [
            { nombre: 'Órdenes / Instalaciones', corto: 'Órdenes', ruta: '/admin/ordenes', icono: ClipboardDocumentListIcon, roles: AMBOS, barra: AMBOS, palabras: 'reparaciones fallas tecnicos agenda' },
            { nombre: 'Bandeja WhatsApp', corto: 'WhatsApp', ruta: '/admin/whatsapp/salidas', icono: ChatBubbleLeftRightIcon, roles: AMBOS, barra: ['supervisor'], palabras: 'mensajes chat comprobantes' },
            { nombre: 'Inventario / Bodega', corto: 'Bodega', ruta: '/admin/inventario', icono: ArchiveBoxIcon, roles: AMBOS, barra: ['supervisor'], palabras: 'onu equipos retiros bajas material' },
        ],
    },
    {
        nombre: 'Infraestructura',
        icono: SignalIcon,
        items: [
            { nombre: 'Radar OLT', corto: 'Radar', ruta: '/admin/radar', icono: SignalIcon, roles: ADMIN, barra: ADMIN, palabras: 'onu vsol señal potencia pon' },
            { nombre: 'Mapa de Red', ruta: '/admin/mapa', icono: MapIcon, roles: ADMIN, palabras: 'ubicaciones' },
            { nombre: 'Cajas NAP (Fibra)', ruta: '/admin/naps', icono: CubeIcon, roles: ADMIN, palabras: 'nap mangas puertos kml' },
            { nombre: 'Nodos / Routers', ruta: '/admin/routers', icono: ServerStackIcon, roles: ADMIN, palabras: 'mikrotik' },
            { nombre: 'Redes IP (Pools)', ruta: '/admin/redes', icono: GlobeAltIcon, roles: ADMIN, palabras: 'ipam direcciones' },
            { nombre: 'Planes de Internet', ruta: '/admin/planes', icono: WifiIcon, roles: ADMIN, palabras: 'velocidad precios' },
        ],
    },
    {
        nombre: 'Finanzas',
        icono: BanknotesIcon,
        items: [
            { nombre: 'Facturas', ruta: '/admin/facturas', icono: DocumentTextIcon, roles: ADMIN, palabras: 'recibos adeudos' },
            { nombre: 'Cortes de Cobranza', ruta: '/admin/transacciones', icono: BanknotesIcon, roles: ADMIN, palabras: 'pagos transacciones caja' },
            { nombre: 'Estadísticas', ruta: '/admin/estadisticas', icono: ChartBarIcon, roles: ADMIN, palabras: 'ingresos graficas' },
        ],
    },
    {
        nombre: 'Configuración',
        icono: Cog6ToothIcon,
        items: [
            { nombre: 'General', ruta: '/admin/configuracion', icono: Cog6ToothIcon, roles: ADMIN, palabras: 'configuracion empresa acceso onu' },
            { nombre: 'Zonas y Áreas', ruta: '/admin/configuracion/zonas', icono: GlobeAltIcon, roles: ADMIN, palabras: 'dia de pago' },
            { nombre: 'Usuarios Sistema', ruta: '/admin/configuracion/usuarios', icono: UsersIcon, roles: ADMIN, palabras: 'tecnicos cobradores contraseñas' },
            { nombre: 'Plantillas Mensajes', ruta: '/admin/configuracion/mensajes', icono: DocumentTextIcon, roles: ADMIN, palabras: 'avisos whatsapp' },
            { nombre: 'Bot de WhatsApp', ruta: '/admin/configuracion/bot-whatsapp', icono: SparklesIcon, roles: ADMIN, palabras: 'agente ia inteligencia' },
            { nombre: 'Conexión WhatsApp', ruta: '/admin/configuracion/whatsapp-qr', icono: QrCodeIcon, roles: ADMIN, palabras: 'qr vincular' },
            { nombre: 'Plantillas Fact.', ruta: '/admin/configuracion/plantillas-facturacion', icono: BanknotesIcon, roles: ADMIN, palabras: 'facturacion ciclo corte' },
            { nombre: 'Perfiles PPPoE', ruta: '/admin/configuracion/pppoe', icono: BoltIcon, roles: ADMIN, palabras: 'pppoe dhcp' },
            { nombre: 'Logs Sistema/Cron', ruta: '/admin/configuracion/cron', icono: CommandLineIcon, roles: ADMIN, palabras: 'bitacora errores tareas' },
            { nombre: 'Sistema y Respaldo', ruta: '/admin/configuracion/sistema', icono: ComputerDesktopIcon, roles: ADMIN, palabras: 'version actualizar backup' },
            { nombre: 'Almacenamiento', ruta: '/admin/configuracion/almacenamiento', icono: CircleStackIcon, roles: ADMIN, palabras: 'disco archivos' },
            { nombre: 'Importar Datos', ruta: '/admin/configuracion/importar', icono: ArrowDownTrayIcon, roles: ADMIN, palabras: 'excel csv' },
            { nombre: 'Túneles VPN', ruta: '/admin/configuracion/vpn', icono: ShieldCheckIcon, roles: ADMIN, palabras: 'wireguard' },
        ],
    },
];

export function gruposDelRol(rol: AppRole): GrupoNav[] {
    return GRUPOS
        .map((grupo) => ({ ...grupo, items: grupo.items.filter((item) => item.roles.includes(rol)) }))
        .filter((grupo) => grupo.items.length > 0);
}

export function itemsDelRol(rol: AppRole): ItemNav[] {
    return gruposDelRol(rol).flatMap((grupo) => grupo.items);
}

/** Lo que va en la barra de abajo del celular; el resto queda en "Más". */
export function barraDelRol(rol: AppRole): ItemNav[] {
    return itemsDelRol(rol).filter((item) => item.barra?.includes(rol)).slice(0, 4);
}

/** La sección de la ruta actual (la más específica que coincida). */
export function itemDeRuta(ruta: string): ItemNav | undefined {
    return GRUPOS.flatMap((grupo) => grupo.items)
        .filter((item) => ruta === item.ruta || ruta.startsWith(`${item.ruta}/`))
        .sort((a, b) => b.ruta.length - a.ruta.length)[0];
}

export function grupoDeRuta(ruta: string): GrupoNav | undefined {
    const item = itemDeRuta(ruta);
    return item ? GRUPOS.find((grupo) => grupo.items.includes(item)) : undefined;
}

export function sinAcentos(texto: string): string {
    return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
