import { useState, useEffect, useRef } from 'react'; // ✅ useRef agregado
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast'; // ✅ Importar toast
import client from '../api/axios'; // ✅ Importar cliente axios
import {
    HomeIcon, UsersIcon, SignalIcon, ArrowLeftOnRectangleIcon,
    Bars3Icon, XMarkIcon, ServerStackIcon, GlobeAltIcon,
    Cog6ToothIcon, CurrencyDollarIcon, DocumentTextIcon,
    BanknotesIcon, ChartBarIcon, ChevronDownIcon,
    ChevronRightIcon, ComputerDesktopIcon, CubeIcon,
    CpuChipIcon, ClipboardDocumentListIcon,
    ChatBubbleLeftRightIcon,MapIcon // ✅ Agregar icono
} from '@heroicons/react/24/outline';

// 👇 IMPORTAR EL CHAT MODAL (Ajusta la ruta según tu proyecto)
import ChatModal from '../components/ChatModal';


export default function Layout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

    // --- ESTADOS DE NOTIFICACIÓN GLOBAL ---
    const [unreadTotal, setUnreadTotal] = useState(0);
    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
    const prevCounts = useRef<Record<number, number>>({});

    // --- ESTADOS PARA EL CHAT GLOBAL ---
    const [showChatModal, setShowChatModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState<any>(null);

    // --- LECTURA DE USUARIO ---
    const userJson = localStorage.getItem('user');
    let user = { usuario: 'Invitado', rol: 'cajero' };
    try { if (userJson) user = JSON.parse(userJson); } catch (e) { console.error(e); }

    // --- SEGURIDAD ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
    }, [navigate]);

    // 👇 LÓGICA DE NOTIFICACIONES GLOBALES 👇
    const checkGlobalMessages = async () => {
        try {
            const res = await client.get('/whatsapp/no-leidos');
            const newCounts = res.data; // Estructura: { "57": { "count": 1, "antiguedad": "..." } }

            // 1. Sumar totales para el Sidebar
            const total = Object.values(newCounts).reduce((acc: number, item: any) => acc + (item.count || 0), 0);
            setUnreadTotal(total);
            setUnreadCounts(newCounts);

            // 2. Comparar mensajes nuevos
            for (const clienteId in newCounts) {
                // clienteId aquí es un string, lo cual evita el error de "index expression"
                const actual = newCounts[clienteId].count || 0;

                // Accedemos a la referencia usando la misma llave string
                const anterior = prevCounts.current[clienteId]?.count || 0;

                if (actual > anterior) {
                    const idNum = parseInt(clienteId);

                    // Disparamos la notificación
                    client.get(`/clientes/${idNum}`).then(resC => {
                        const nombreCliente = resC.data.nombre || "Cliente Nuevo";

                        const audio = new Audio('/notification.mp3');
                        audio.play().catch(() => { });

                        toast.custom((t) => (
                            <div
                                onClick={() => {
                                    toast.dismiss(t.id);
                                    setTargetCliente(resC.data);
                                    setShowChatModal(true);
                                }}
                                className={`${t.visible ? 'animate-in fade-in' : 'animate-out fade-out'} max-w-md w-full bg-[#1a1f2e] border border-blue-500/30 shadow-2xl rounded-2xl pointer-events-auto flex cursor-pointer hover:bg-[#242b3d] transition-all z-[9999]`}
                            >
                                <div className="flex-1 p-4 flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white shrink-0">
                                        {nombreCliente.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">WhatsApp</p>
                                        <p className="text-sm font-bold text-white truncate">{nombreCliente}</p>
                                    </div>
                                </div>
                            </div>
                        ), { position: 'top-right', id: `msg-${clienteId}` });
                    });
                }
            }

            // Guardamos el estado para la siguiente comparación
            prevCounts.current = newCounts;

        } catch (error) {
            console.error("Error en el polling global:", error);
        }
    };

    useEffect(() => {
        if (user.rol === 'admin') {
            checkGlobalMessages();
            const interval = setInterval(checkGlobalMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [user.rol]);

    // --- AUTO-APERTURA DE MENÚS (Tu lógica original) ---
    useEffect(() => {
        const path = location.pathname;
        if (path.startsWith('/admin/facturas') || path.startsWith('/admin/transacciones') || path.startsWith('/admin/estadisticas')) setOpenSubMenu('Finanzas');
        else if (path.startsWith('/admin/routers') || path.startsWith('/admin/redes') || path.startsWith('/admin/naps')) setOpenSubMenu('Infraestructura');
        else if (path.startsWith('/admin/configuracion')) setOpenSubMenu('Configuración');
        else setOpenSubMenu(null);
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const toggleSubMenu = (name: string) => setOpenSubMenu(openSubMenu === name ? null : name);

    const allMenus = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: HomeIcon, roles: ['admin'] },
        { name: 'Órdenes / Instalaciones', path: '/admin/ordenes', icon: ClipboardDocumentListIcon, roles: ['admin', 'tecnico'] },
        { name: 'Terminal de Cobro', path: '/admin/cobranza', icon: ComputerDesktopIcon, roles: ['cajero'] },
        { name: 'Clientes', path: '/admin/clientes', icon: UsersIcon, roles: ['admin', 'tecnico'], hasBadge: true }, // ✅ Marcar para poner globito
        { name: 'Mapa de Red', path: '/admin/mapa', icon: MapIcon, roles: ['admin'] },
        { name: 'Planes de Internet', path: '/admin/planes', icon: SignalIcon, roles: ['admin'] },
        {
            name: 'Finanzas', icon: CurrencyDollarIcon, roles: ['admin'],
            submenu: [
                { name: 'Facturas', path: '/admin/facturas', icon: DocumentTextIcon },
                { name: 'Caja y Reportes', path: '/admin/transacciones', icon: BanknotesIcon },
                { name: 'Estadísticas', path: '/admin/estadisticas', icon: ChartBarIcon },
            ]
        },
        {
            name: 'Infraestructura', icon: CpuChipIcon, roles: ['admin'],
            submenu: [
                { name: 'Nodos / Routers', path: '/admin/routers', icon: ServerStackIcon },
                { name: 'Cajas NAP (Fibra)', path: '/admin/naps', icon: CubeIcon },
                { name: 'Redes IP (Pools)', path: '/admin/redes', icon: GlobeAltIcon },
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
            ]
        },
    ];

    const menus = allMenus.filter(item => item.roles.includes(user.rol));

    return (
        <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans">
            {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setSidebarOpen(false)}></div>}

            {/* SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-800 border-r border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 flex flex-col`}>
                <div className="h-20 flex items-center justify-center border-b border-slate-700 bg-slate-900/50">
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30"><SignalIcon className="h-5 w-5 text-white" /></div>
                        <h1 className="text-2xl font-bold tracking-wider text-white">FDEZ<span className="text-blue-500">NET</span></h1>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    {menus.map((item) => {
                        if (item.submenu) {
                            const isOpen = openSubMenu === item.name;
                            const isParentActive = item.submenu.some(sub => location.pathname.startsWith(sub.path));
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button onClick={() => toggleSubMenu(item.name)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${isParentActive || isOpen ? 'bg-slate-700/50 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'}`}>
                                        <div className="flex items-center">
                                            <item.icon className={`w-6 h-6 mr-3 ${isParentActive ? 'text-blue-400' : 'text-slate-500'}`} />
                                            <span className="font-medium text-sm">{item.name}</span>
                                        </div>
                                        {isOpen ? <ChevronDownIcon className="w-4 h-4 text-slate-400" /> : <ChevronRightIcon className="w-4 h-4 text-slate-500" />}
                                    </button>
                                    {isOpen && (
                                        <div className="pl-4 space-y-1 bg-slate-900/30 rounded-b-xl py-2 border-l-2 border-slate-700 ml-4">
                                            {item.submenu.map((sub) => (
                                                <Link key={sub.name} to={sub.path} onClick={() => setSidebarOpen(false)} className={`flex items-center px-4 py-2 rounded-lg transition-colors text-xs font-medium ${location.pathname === sub.path ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>
                                                    <sub.icon className={`w-4 h-4 mr-3 ${location.pathname === sub.path ? 'text-blue-500' : 'opacity-70'}`} />
                                                    {sub.name}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        const isActive = location.pathname.startsWith(item.path);
                        return (
                            <Link key={item.name} to={item.path} onClick={() => setSidebarOpen(false)} className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}>
                                <item.icon className={`w-6 h-6 mr-3 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                                <span className="font-medium text-sm">{item.name}</span>

                                {/* 👇 GLOBITO EN EL SIDEBAR (PARA CLIENTES) 👇 */}
                                {item.hasBadge && unreadTotal > 0 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse shadow-lg">
                                        {unreadTotal}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-700 bg-slate-900/30">
                    <button onClick={handleLogout} className="flex items-center w-full px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl transition duration-200">
                        <ArrowLeftOnRectangleIcon className="w-6 h-6 mr-3" />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="h-20 bg-slate-900/80 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 sticky top-0 z-10">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 md:hidden focus:outline-none">
                        {sidebarOpen ? <XMarkIcon className="w-8 h-8" /> : <Bars3Icon className="w-8 h-8" />}
                    </button>
                    <h2 className="text-xl font-semibold text-slate-100 hidden sm:block italic tracking-tight">FDEZ SYSTEM</h2>

                    <div className="flex items-center space-x-4">
                        {/* BOTÓN DE CHAT RÁPIDO EN EL HEADER (OPCIONAL) */}
                        <div className="relative">
                            <ChatBubbleLeftRightIcon className="w-6 h-6 text-slate-400 cursor-pointer hover:text-blue-400 transition" onClick={() => navigate('/admin/clientes')} />
                            {unreadTotal > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 w-2.5 h-2.5 rounded-full border-2 border-slate-900"></span>}
                        </div>

                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-slate-200">{user.usuario}</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset uppercase ${user.rol === 'admin' ? 'bg-blue-400/10 text-blue-400 ring-blue-400/20' : 'bg-emerald-400/10 text-emerald-400 ring-emerald-400/20'}`}>{user.rol}</span>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-slate-800 cursor-pointer transition capitalize">{(user.usuario || '?').charAt(0)}</div>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900 p-4 md:p-8 relative custom-scrollbar">
                    <div className="absolute top-0 left-0 w-full h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none transform -translate-y-1/2 -translate-x-1/2"></div>
                    <div className="relative z-10 pb-20"><Outlet /></div>
                </main>
            </div>

            {/* 👇 CHAT MODAL GLOBAL (Encima de todo) 👇 */}
            <ChatModal
                isOpen={showChatModal}
                onClose={() => { setShowChatModal(false); checkGlobalMessages(); }}
                cliente={targetCliente}
                onMessagesRead={checkGlobalMessages}
            />
        </div>
    );
}