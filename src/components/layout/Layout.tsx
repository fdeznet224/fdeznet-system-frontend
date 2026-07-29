import {
    useState,
    useEffect,
    useRef,
    type ComponentType,
} from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import client from '@/api/axios';
import {
    HomeIcon, UsersIcon, SignalIcon, ArrowLeftOnRectangleIcon,
    Bars3Icon, XMarkIcon, ServerStackIcon, GlobeAltIcon,
    Cog6ToothIcon, CurrencyDollarIcon, DocumentTextIcon,
    BanknotesIcon, ChartBarIcon, ChevronDownIcon,
    ChevronRightIcon, ComputerDesktopIcon, CubeIcon,
    CpuChipIcon, ClipboardDocumentListIcon, MapIcon,
    ShieldCheckIcon, MagnifyingGlassIcon, ArchiveBoxIcon, BriefcaseIcon,
    SunIcon, MoonIcon // 👈 NUEVOS ICONOS IMPORTADOS PARA EL TEMA
} from '@heroicons/react/24/outline';

import ChatModal from '@/components/chat/ChatModal';
import ClientDetailModal from '@/pages/clientes/components/ClientDetailModal';
import { useWhatsApp } from '@/context/whatsapp/context';
import { notifySessionChanged } from '@/offline/db';
import type { AppRole } from '@/utils/roles';

interface ClienteBusquedaApi {
    id: number;
    nombre: string;
    telefono?: string | null;
    estado: string;
    total_deuda: number;
}

interface ClienteGlobal extends Omit<ClienteBusquedaApi, 'telefono'> {
    telefono: string;
}

interface SessionUser {
    usuario: string;
    rol: AppRole;
}

function normalizeCliente(cliente: ClienteBusquedaApi): ClienteGlobal {
    return { ...cliente, telefono: cliente.telefono || '' };
}

function getSessionUser(raw: string | null): SessionUser {
    if (!raw) return { usuario: 'Invitado', rol: 'cajero' };
    try {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            const record = parsed as Record<string, unknown>;
            const role = typeof record.rol === 'string'
                ? record.rol.trim().toLowerCase()
                : '';
            if (
                role === 'admin'
                || role === 'supervisor'
                || role === 'cajero'
                || role === 'tecnico'
            ) {
                return {
                    usuario: typeof record.usuario === 'string' ? record.usuario : 'Invitado',
                    rol: role,
                };
            }
        }
    } catch {
        console.error('No fue posible leer la sesión guardada');
    }
    return { usuario: 'Invitado', rol: 'cajero' };
}

export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

    // --- 🔥 NUEVO MOTOR DE MODO CLARO / OSCURO 🔥 ---
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark' || document.documentElement.classList.contains('dark');
    });

    // 2. Función súper limpia que se ejecuta al presionar tu botón de Sol/Luna
    const handleToggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);

        // ¡LA MAGIA! Le enviamos la señal a App.tsx para que actualice TODO (Tailwind + Material UI) al instante
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: newMode ? 'dark' : 'light' }));
    };

    // --- ESTADOS PARA EL BUSCADOR GLOBAL ---
    const [busquedaGlobal, setBusquedaGlobal] = useState('');
    const [resultadosBusqueda, setResultadosBusqueda] = useState<ClienteGlobal[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // --- ESTADOS PARA EL MODAL DE DETALLE DE CLIENTE ---
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<ClienteGlobal | null>(null);

    // --- ESTADOS PARA EL CHAT GLOBAL ---
    const [showChatModal, setShowChatModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState<ClienteGlobal | null>(null);

    const { wsEvent, unreadCounts, fetchUnread } = useWhatsApp();
    const unreadTotal = Object.values(unreadCounts).reduce((acc, item) => acc + (item.count || 0), 0);
    const user = getSessionUser(localStorage.getItem('user'));

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
    }, [navigate]);

    // LÓGICA DEL BUSCADOR GLOBAL
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (busquedaGlobal.trim().length > 2) {
                setIsSearching(true);
                try {
                    const res = await client.get<ClienteBusquedaApi[]>('/clientes/buscar', {
                        params: { query: busquedaGlobal }
                    });
                    setResultadosBusqueda(res.data.map(normalizeCliente));
                    setShowDropdown(true);
                } catch {
                    console.error("Error en búsqueda global");
                } finally {
                    setIsSearching(false);
                }
            } else {
                setResultadosBusqueda([]);
                setShowDropdown(false);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [busquedaGlobal]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelectCliente = (cliente: ClienteGlobal) => {
        setBusquedaGlobal('');
        setShowDropdown(false);
        setSelectedCliente(cliente);
        setIsDetailModalOpen(true);
    };

    // NOTIFICACIONES TOAST 
    useEffect(() => {
        if (user.rol !== 'admin' || !wsEvent) return;

        if (wsEvent.type === 'NEW_MESSAGE' && wsEvent.data.direccion === 'entrada') {
            const nuevoMensaje = wsEvent.data;

            // 1. Creamos una función reutilizable para lanzar el Toast
            const lanzarNotificacion = (nombreMostrar: string, dataCliente: ClienteGlobal | null) => {
                const audio = new Audio('/notification.mp3');
                audio.play().catch(() => { });

                toast.custom((t) => (
                    <div
                        onClick={() => {
                            toast.dismiss(t.id);
                            // Solo intentamos abrir el modal si tenemos los datos del cliente
                            if (dataCliente) {
                                setTargetCliente(dataCliente);
                                setShowChatModal(true);
                            } else {
                                console.log("Mensaje de número desconocido. Ve a la bandeja general.");
                                // Aquí podrías opcionalmente redirigir a una bandeja general de prospectos si la tienes
                            }
                        }}
                        className={`${t.visible ? 'animate-in fade-in' : 'animate-out fade-out'} max-w-md w-full bg-[#1a1f2e] border border-emerald-500/30 shadow-2xl rounded-2xl pointer-events-auto flex cursor-pointer hover:bg-[#242b3d] transition-all z-[9999]`}
                    >
                        <div className="flex-1 p-4 flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shrink-0">
                                {nombreMostrar.charAt(0).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">WhatsApp - Nuevo Mensaje</p>
                                <p className="text-sm font-bold text-white truncate">{nombreMostrar}</p>
                                <p className="text-xs text-slate-400 truncate mt-1">{nuevoMensaje.mensaje}</p>
                            </div>
                        </div>
                    </div>
                ), { position: 'top-right', id: `msg-${nuevoMensaje.id}`, duration: 5000 });
            };

            // 2. 🔥 LA VALIDACIÓN CRÍTICA 🔥
            if (nuevoMensaje.cliente_id) {
                // Sí es un cliente registrado: Hacemos la petición a FastAPI
                client.get<ClienteBusquedaApi>(`/clientes/${nuevoMensaje.cliente_id}`)
                    .then(resC => {
                        const nombreCliente = resC.data.nombre || "Cliente";
                        lanzarNotificacion(nombreCliente, normalizeCliente(resC.data));
                    })
                    .catch(err => {
                        console.error("Error al buscar el nombre del cliente:", err);
                        lanzarNotificacion("Cliente", null);
                    });
            } else {
                // Es un prospecto o número desconocido: NO hacemos petición a FastAPI
                // Usamos el teléfono que viene en wsEvent si existe, si no, "Desconocido"
                const nombreProspecto = typeof nuevoMensaje.telefono === 'string'
                    ? nuevoMensaje.telefono
                    : "Nuevo Contacto";
                lanzarNotificacion(nombreProspecto, null);
            }
        }
    }, [wsEvent, user.rol]);

    const handleLogout = () => { localStorage.clear(); notifySessionChanged(); navigate('/'); };
    const toggleSubMenu = (name: string) => setOpenSubMenu(openSubMenu === name ? null : name);

    const menus = allMenus
        .filter(item => item.roles.includes(user.rol))
        .map(item => ({
            ...item,
            submenu: item.submenu?.filter(
                sub => !sub.roles || sub.roles.includes(user.rol),
            ),
        }))
        .filter(item => !item.submenu || item.submenu.length > 0);

    return (
        /* ✅ ADAPTADO: Las clases cambian dinámicamente con dark:bg-slate-950 bg-slate-50 text-slate-900 dark:text-slate-100 */
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors duration-300">
            {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}></div>}

            {/* SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 flex flex-col`}>
                <div className="h-20 flex items-center justify-center border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50">
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20"><SignalIcon className="h-5 w-5 text-white" /></div>
                        <h1 className="text-2xl font-black tracking-wider text-slate-900 dark:text-white">FDEZ<span className="text-blue-500">NET</span></h1>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {menus.map((item) => {
                        if (item.submenu) {
                            const isOpen = openSubMenu === item.name;
                            const isParentActive = item.submenu.some(sub => location.pathname.startsWith(sub.path));
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button onClick={() => toggleSubMenu(item.name)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isParentActive || isOpen ? 'bg-slate-200/60 dark:bg-slate-800/50 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/30 hover:text-slate-900 dark:hover:text-white'}`}>
                                        <div className="flex items-center">
                                            <item.icon className={`w-6 h-6 mr-3 ${isParentActive ? 'text-blue-500' : 'text-slate-400 dark:text-slate-500'}`} />
                                            <span className="font-bold text-sm">{item.name}</span>
                                        </div>
                                        {isOpen ? <ChevronDownIcon className="w-4 h-4 text-slate-500" /> : <ChevronRightIcon className="w-4 h-4 text-slate-400" />}
                                    </button>
                                    {isOpen && (
                                        <div className="pl-4 space-y-1 bg-slate-50 dark:bg-slate-900/30 rounded-b-xl py-2 border-l-2 border-slate-300 dark:border-slate-700 ml-4">
                                            {item.submenu.map((sub) => (
                                                <Link key={sub.name} to={sub.path} onClick={() => setSidebarOpen(false)} className={`flex items-center px-4 py-2 rounded-lg transition-colors text-xs font-bold ${location.pathname === sub.path ? 'text-blue-600 bg-blue-500/10' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                                                    <sub.icon className={`w-4 h-4 mr-3 ${location.pathname === sub.path ? 'text-blue-500' : 'opacity-70'}`} />
                                                    {sub.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        const itemPath = item.path ?? '/';
                        const isActive = location.pathname.startsWith(itemPath);
                        return (
                            <Link key={item.name} to={itemPath} onClick={() => setSidebarOpen(false)} className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
                                <item.icon className={`w-6 h-6 mr-3 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'}`} />
                                <span className="font-bold text-sm">{item.name}</span>
                                {item.hasBadge && unreadTotal > 0 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-md">{unreadTotal}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                    <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-rose-600 dark:text-red-400 hover:bg-rose-500/10 rounded-xl transition duration-200 font-bold">
                        <ArrowLeftOnRectangleIcon className="w-6 h-6 mr-3" />
                        <span className="font-bold">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-20 bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 sticky top-0 z-50 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden">
                            {sidebarOpen ? <XMarkIcon className="w-8 h-8" /> : <Bars3Icon className="w-8 h-8" />}
                        </button>
                        {/* ✅ LIMPIO: Título puro sin cortes de línea toscos */}
                        <h2 className="text-base md:text-xl font-black text-slate-900 dark:text-white hidden lg:block tracking-tight uppercase"><span className="text-blue-500 font-black"></span></h2>
                    </div>

                    {/* BUSCADOR GLOBAL */}
                    <div className="flex-1 max-w-md mx-4 sm:mx-8 relative" ref={searchRef}>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className={`w-4 h-4 transition-colors ${isSearching ? 'text-blue-500 animate-pulse' : 'text-slate-400 dark:text-slate-500'}`} />
                            </div>
                            <input
                                type="text"
                                className="block w-full bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 text-xs sm:text-sm rounded-xl py-2.5 pl-9 pr-4 focus:ring-2 focus:ring-blue-500/30 outline-none transition-all placeholder:text-slate-400"
                                placeholder="Buscar cliente por nombre..."
                                value={busquedaGlobal}
                                onChange={(e) => setBusquedaGlobal(e.target.value)}
                                onFocus={() => busquedaGlobal.length > 2 && setShowDropdown(true)}
                            />
                        </div>

                        {/* Dropdown de resultados */}
                        {showDropdown && (
                            <div className="absolute mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-[60] animate-in fade-in duration-200">
                                {resultadosBusqueda.length > 0 ? (
                                    <div className="py-2">
                                        <p className="px-4 py-1 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Resultados</p>
                                        {resultadosBusqueda.map((c) => (
                                            <div
                                                key={c.id}
                                                onClick={() => handleSelectCliente(c)}
                                                className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center justify-between group transition-colors border-b border-slate-100 dark:border-slate-700/50 last:border-0"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center font-black text-xs uppercase border border-blue-500/20">
                                                        {c.nombre.charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-500 transition-colors">{c.nombre}</p>
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono tracking-tighter">{c.telefono}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${c.estado === 'activo' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'}`}>
                                                        {c.estado}
                                                    </span>
                                                    {c.total_deuda > 0 && <span className="text-[10px] text-rose-500 dark:text-rose-400 font-bold">Deuda: ${c.total_deuda}</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">No hay coincidencias</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CONTENEDOR DERECHO: INTERRUPTOR DE TEMA (SOL / LUNA) + USUARIO */}
                    <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">

                        {/* 🔥 INTERRUPTOR PREMIUM MODO CLARO / OSCURO 🔥 */}
                        <button
                            onClick={handleToggleTheme} // 👈 AQUÍ ESTÁ EL CAMBIO
                            className="p-2.5 rounded-xl border bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-90"
                            title={darkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                        >
                            {darkMode ? (
                                <SunIcon className="w-4 h-4 text-amber-400 animate-fadeIn" />
                            ) : (
                                <MoonIcon className="w-4 h-4 text-indigo-500 animate-fadeIn" />
                            )}
                        </button>

                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{user.usuario}</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ring-inset uppercase mt-0.5 ${user.rol === 'admin' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20'}`}>{user.rol}</span>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black shadow-md border dark:border-slate-800 capitalize select-none shrink-0">{(user.usuario || '?').charAt(0)}</div>
                    </div>
                </header>

                {/* AREA DE RENDERIZADO PRINCIPAL */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-8 relative custom-scrollbar transition-colors duration-300">
                    {/* El reflejo de luz de fondo adaptado para no encandilar en claro */}
                    <div className="absolute top-0 left-0 w-full h-96 bg-blue-500/[0.01] dark:bg-blue-600/5 rounded-full blur-3xl pointer-events-none transform -translate-y-1/2 -translate-x-1/2"></div>
                    <div className="relative z-10 pb-20">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* MODALES GLOBALES */}
            {selectedCliente && (
                <ClientDetailModal
                    isOpen={isDetailModalOpen}
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedCliente(null);
                    }}
                    cliente={selectedCliente}
                />
            )}

            <ChatModal
                isOpen={showChatModal}
                onClose={() => { setShowChatModal(false); fetchUnread(); }}
                cliente={targetCliente}
                onMessagesRead={fetchUnread}
            />
        </div>
    );
}

interface SubMenuItem {
    name: string;
    path: string;
    icon: ComponentType<{ className?: string }>;
    roles?: AppRole[];
}

interface MenuItem {
    name: string;
    path?: string;
    icon: ComponentType<{ className?: string }>;
    roles: AppRole[];
    hasBadge?: boolean;
    submenu?: SubMenuItem[];
}

const allMenus: MenuItem[] = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: HomeIcon, roles: ['admin'] },
    { name: 'Terminal de Cobro', path: '/admin/cobranza', icon: ComputerDesktopIcon, roles: ['admin', 'supervisor', 'cajero'] },
    { name: 'Clientes', path: '/admin/clientes', icon: UsersIcon, roles: ['admin', 'supervisor'], hasBadge: true },
    {
        name: 'Operaciones', icon: BriefcaseIcon, roles: ['admin', 'supervisor'],
        submenu: [
            { name: 'Órdenes / Instalaciones', path: '/admin/ordenes', icon: ClipboardDocumentListIcon, roles: ['admin', 'supervisor'] },
            { name: 'Bajas / Recuperación', path: '/admin/bajas', icon: ArchiveBoxIcon, roles: ['admin', 'supervisor'] },
            { name: 'Inventario / Bodega', path: '/admin/inventario', icon: ArchiveBoxIcon, roles: ['admin'] },
        ]
    },
    {
        name: 'Finanzas', icon: CurrencyDollarIcon, roles: ['admin'],
        submenu: [
            { name: 'Facturas', path: '/admin/facturas', icon: DocumentTextIcon },
            { name: 'Cortes de Cobranza', path: '/admin/transacciones', icon: BanknotesIcon },
            { name: 'Estadísticas', path: '/admin/estadisticas', icon: ChartBarIcon },
        ]
    },
    {
        name: 'Infraestructura', icon: CpuChipIcon, roles: ['admin'],
        submenu: [
            { name: 'Mapa de Red', path: '/admin/mapa', icon: MapIcon },
            { name: 'Nodos / Routers', path: '/admin/routers', icon: ServerStackIcon },
            { name: 'Cajas NAP (Fibra)', path: '/admin/naps', icon: CubeIcon },
            { name: 'Radar OLT', path: '/admin/radar', icon: SignalIcon },
            { name: 'Redes IP (Pools)', path: '/admin/redes', icon: GlobeAltIcon },
            { name: 'Planes de Internet', path: '/admin/planes', icon: SignalIcon },
        ]
    },
    {
        name: 'Configuración', icon: Cog6ToothIcon, roles: ['admin'],
        submenu: [
            { name: 'General', path: '/admin/configuracion', icon: ComputerDesktopIcon },
            { name: 'Zonas y Áreas', path: '/admin/configuracion/zonas', icon: GlobeAltIcon },
            { name: 'Usuarios Sistema', path: '/admin/configuracion/usuarios', icon: UsersIcon },
            { name: 'Plantillas Mensajes', path: '/admin/configuracion/mensajes', icon: DocumentTextIcon },
            { name: 'Conexión WhatsApp', path: '/admin/configuracion/whatsapp-qr', icon: SignalIcon },
            { name: 'Plantillas Fact.', path: '/admin/configuracion/plantillas-facturacion', icon: BanknotesIcon },
            { name: 'Perfiles PPPoE', path: '/admin/configuracion/pppoe', icon: ServerStackIcon },
            { name: 'Logs Sistema/Cron', path: '/admin/configuracion/cron', icon: ClipboardDocumentListIcon },
            { name: 'Sistema y Respaldo', path: '/admin/configuracion/sistema', icon: Cog6ToothIcon },
            { name: 'Importar Datos', path: '/admin/configuracion/importar', icon: ArrowLeftOnRectangleIcon },
            { name: 'Túneles VPN', path: '/admin/configuracion/vpn', icon: ShieldCheckIcon },
        ]
    },
];
