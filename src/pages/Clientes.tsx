import { useState, useEffect, useMemo } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import {
    MagnifyingGlassIcon, WrenchScrewdriverIcon, ArrowPathIcon, FunnelIcon,UserPlusIcon
} from '@heroicons/react/24/outline';

import ClientToolsModal from '../components/modals/ClientToolsModal';
import CreateClientModal from '../components/modals/CreateClientModal';
import ClientDetailModal from '../components/modals/ClientDetailModal';

interface OnlineStatus { color: string; diag: string; online: boolean; }

interface ClienteUnificado {
    id: number;
    nombre: string;
    cedula: string;
    telefono: string;
    direccion: string;
    servicio: {
        plan_nombre: string;
        precio_plan: number;
        ip_asignada: string;
        router_nombre: string;
        estado_servicio: string;
    };
    finanzas: {
        facturas_pendientes_cant: number;
        total_deuda: number;
        saldo_a_favor: number;
        estado_financiero: 'al_dia' | 'moroso';
    };
}

export default function Clientes() {
    // --- ESTADOS DE CONTROL DE DATOS ---
    const [clientes, setClientes] = useState<ClienteUnificado[]>([]);
    const [onlineStatus, setOnlineStatus] = useState<Map<string, OnlineStatus>>(new Map());
    const [routers, setRouters] = useState<any[]>([]);
    const [noLeidos, setNoLeidos] = useState<Record<string, { count: number }>>({});
    const [loading, setLoading] = useState(true);

    // --- ESTADOS PARA COLAPSAR FILTROS EN MÓVIL (UI/UX) ---
    const [mostrarBusquedaMovil, setMostrarBusquedaMovil] = useState(false);
    const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false);

    // --- FILTROS ---
    const [busqueda, setBusqueda] = useState('');
    const [filtroRouter, setFiltroRouter] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | 'online' | 'suspendidos' | 'activos' | 'morosos'>('todos');

    // --- MODALES ---
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [toolModal, setToolModal] = useState<{ show: boolean, cliente: any }>({ show: false, cliente: null });
    const [detailModal, setDetailModal] = useState<{ show: boolean, cliente: any }>({ show: false, cliente: null });

    // --- CARGA DE DATOS INICIAL ---
    const fetchData = async () => {
        try {
            const [resClientes, resRouters] = await Promise.all([
                client.get('/clientes/listado-completo-unificado'),
                client.get('/network/routers/')
            ]);
            setClientes(resClientes.data);
            setRouters(resRouters.data);

            // ✅ CORRECCIÓN: Mapear el Diccionario indexado por ID que manda FastAPI
            try {
                const resOnline = await client.get('/dashboard/status-tabla-clientes');
                const detalleClientes = resOnline.data.detalle_clientes;

                if (detalleClientes && typeof detalleClientes === 'object') {
                    const mapaEstados = new Map<string, OnlineStatus>();
                    Object.entries(detalleClientes).forEach(([clienteId, item]) => {
                        const data = item as any; // Si necesitas forzar el tipo any adentro
                        mapaEstados.set(clienteId, {
                            color: data.color,
                            diag: data.diagnostico_sistema,
                            online: data.estado_tecnico === 'ONLINE'
                        });
                    });
                    setOnlineStatus(mapaEstados);
                }
            } catch (err) { console.warn("Dashboard online no disponible", err); }

            // Fetch Mensajes No Leídos
            try {
                const resMsg = await client.get('/whatsapp/no-leidos');
                setNoLeidos(resMsg.data);
            } catch (err) { console.warn("Chat no disponible"); }

            setLoading(false);
        } catch (error) {
            toast.error("Error al cargar datos");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const intervalData = setInterval(fetchData, 60000); // Polling cada 60s
        return () => clearInterval(intervalData);
    }, []);

    // ✅ CORRECCIÓN: Buscar en el mapa usando c.id.toString() de forma estricta
    const clientesFiltrados = useMemo(() => {
        return clientes.filter(c => {
            const term = busqueda.toLowerCase();
            const matchTexto =
                c.nombre.toLowerCase().includes(term) ||
                c.servicio.ip_asignada.includes(term) ||
                c.id.toString().includes(term) ||
                (c.cedula && c.cedula.toLowerCase().includes(term));

            if (!matchTexto) return false;

            if (filtroRouter) {
                const rSelect = routers.find(r => r.id.toString() === filtroRouter);
                if (rSelect && c.servicio.router_nombre !== rSelect.nombre) return false;
            }

            if (filtroEstado === 'activos') return c.servicio.estado_servicio === 'activo';
            if (filtroEstado === 'suspendidos') return c.servicio.estado_servicio !== 'activo';
            if (filtroEstado === 'morosos') return c.finanzas.estado_financiero === 'moroso';
            if (filtroEstado === 'online') return onlineStatus.get(c.id.toString())?.online === true;

            return true;
        });
    }, [clientes, busqueda, filtroRouter, filtroEstado, onlineStatus]);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 md:gap-6 font-sans text-slate-200">

            {/* =========================================================
                HEADER Y ACCIONES DE FILTRADO COMPACTO (MÓVIL PRO)
               ========================================================= */}
            <div className="flex-none space-y-3 px-2 md:px-0">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                            Gestión de Clientes
                            <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full font-medium sm:inline hidden">
                                {clientesFiltrados.length}
                            </span>
                        </h2>
                        <p className="text-slate-400 text-xs md:text-sm hidden sm:block">Directorio unificado de servicios y finanzas</p>
                    </div>

                    {/* Botones de Control de Interfaz */}
                    <div className="flex items-center gap-1.5">
                        {/* Botón Buscar (Móvil) */}
                        <button
                            onClick={() => { setMostrarBusquedaMovil(!mostrarBusquedaMovil); setMostrarFiltrosMovil(false); }}
                            className={`xl:hidden p-2.5 rounded-xl border transition-all ${mostrarBusquedaMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700/80 text-slate-400'}`}
                        >
                            <MagnifyingGlassIcon className="w-4 h-4" />
                        </button>

                        {/* Botón Configurar Filtros (Móvil) */}
                        <button
                            onClick={() => { setMostrarFiltrosMovil(!mostrarFiltrosMovil); setMostrarBusquedaMovil(false); }}
                            className={`xl:hidden p-2.5 rounded-xl border transition-all flex items-center gap-1 ${mostrarFiltrosMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700/80 text-slate-400'}`}
                        >
                            <FunnelIcon className="w-4 h-4" />
                            {(filtroRouter || filtroEstado !== 'todos') && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            )}
                        </button>

                        {/* Botón Agregar Cliente */}
                        <button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2.5 md:px-4 md:py-2.5 rounded-xl flex items-center shadow-lg transition active:scale-95 font-bold text-xs md:text-base ml-1">
                            <UserPlusIcon className="w-4 h-4 md:w-5 md:h-5 md:mr-2" /> <span className="hidden sm:inline">Nuevo Cliente</span>
                        </button>
                    </div>
                </div>

                {/* 🖥️ FILTROS ESCRITORIO (FIJOS) */}
                <div className="hidden xl:flex gap-4 bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-lg">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                        <input
                            type="text" placeholder="Buscar por nombre, IP, ID, cédula..."
                            className="w-full bg-slate-900 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:border-blue-500 outline-none text-sm"
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <select value={filtroRouter} onChange={(e) => setFiltroRouter(e.target.value)} className="bg-slate-900 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-700 outline-none text-sm">
                            <option value="">Todos los Routers</option>
                            {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as any)} className="bg-slate-900 text-slate-200 px-3 py-2.5 rounded-xl border border-slate-700 outline-none font-bold text-sm">
                            <option value="todos">Todos los Estados</option>
                            <option value="online">🟢 Online</option>
                            <option value="suspendidos">⛔ Suspendidos</option>
                            <option value="morosos">💰 Con Deuda</option>
                        </select>
                    </div>
                </div>

                {/* 📱 DESPLEGABLE MÓVIL A: Buscador flotante */}
                {mostrarBusquedaMovil && (
                    <div className="xl:hidden relative bg-slate-900 p-2 rounded-xl border border-slate-700/60 shadow-inner">
                        <MagnifyingGlassIcon className="absolute left-5 top-4 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Escribe nombre, IP o ID para filtrar..."
                            autoFocus
                            className="w-full bg-slate-950 text-slate-200 pl-10 pr-10 py-2 rounded-lg border border-slate-800 focus:border-blue-500 outline-none text-xs"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {busqueda && (
                            <button onClick={() => setBusqueda('')} className="absolute right-5 top-3.5 text-xs text-slate-500 hover:text-white font-bold">
                                Limpiar
                            </button>
                        )}
                    </div>
                )}

                {/* 📱 DESPLEGABLE MÓVIL B: Caja Avanzada de Filtros */}
                {mostrarFiltrosMovil && (
                    <div className="xl:hidden bg-slate-900 p-3 rounded-xl border border-slate-700/60 shadow-lg space-y-3">
                        <div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1.5">Filtrar por Estado</span>
                            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                                {['todos', 'online', 'suspendidos', 'morosos'].map((est) => (
                                    <button
                                        key={est}
                                        onClick={() => setFiltroEstado(est as any)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${filtroEstado === est ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                                    >
                                        {est === 'todos' && `Todos (${clientes.length})`}
                                        {est === 'online' && '🟢 Online'}
                                        {est === 'suspendidos' && '⛔ Suspendidos'}
                                        {est === 'morosos' && '💰 Con Deuda'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-slate-800/80 pt-2.5">
                            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block mb-1">Filtrar por Nodo / Router</span>
                            <div className="relative bg-slate-950 rounded-lg border border-slate-800 px-2.5 py-1.5">
                                <select
                                    value={filtroRouter}
                                    onChange={(e) => setFiltroRouter(e.target.value)}
                                    className="w-full bg-transparent text-slate-300 font-bold outline-none text-xs cursor-pointer appearance-none"
                                >
                                    <option value="" className="bg-slate-950">Todos los Routers / Mikrotiks</option>
                                    {routers.map(r => <option key={r.id} value={r.id} className="bg-slate-950">{r.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================================
                ZONA DE DATOS PRINCIPALES
               ========================================================= */}
            <div className="flex-1 bg-slate-800 md:bg-slate-800/40 rounded-2xl md:border border-slate-700/50 shadow-xl overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1 custom-scrollbar">

                        {/* 🖥️ VISTA ESCRITORIO */}
                        <table className="w-full text-left border-collapse hidden md:table">
                            <thead className="bg-slate-900 text-slate-400 text-xs uppercase font-bold sticky top-0 z-10 shadow-md">
                                <tr>
                                    <th className="px-6 py-4 text-center w-20">ID</th>
                                    <th className="px-6 py-4">Cliente / Dirección</th>
                                    <th className="px-6 py-4">Servicio</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4 text-right">Finanzas</th>
                                    <th className="px-6 py-4 text-center w-28">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/60">
                                {clientesFiltrados.map((c) => {
                                    const statusData = onlineStatus.get(c.id.toString());
                                    const unreadCount = noLeidos[c.id]?.count || 0;
                                    return (
                                        <tr key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className="hover:bg-slate-700/30 transition group cursor-pointer bg-transparent">
                                            <td className="px-6 py-4 text-center font-mono text-slate-500 text-xs">#{c.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusData?.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} title={statusData?.diag || 'Actualizando...'}></div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{c.nombre}</div>
                                                        <div className="text-slate-500 text-xs truncate max-w-[240px]">{c.direccion || 'Sin dirección'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-blue-400 font-bold">{c.servicio.plan_nombre}</div>
                                                <div className="text-slate-500 text-[10px] font-mono">{c.servicio.ip_asignada}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border ${c.servicio.estado_servicio === 'activo' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-rose-400 border-rose-500/20 bg-rose-500/5'}`}>
                                                    {c.servicio.estado_servicio}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-sm font-bold ${c.finanzas.total_deuda > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {c.finanzas.total_deuda > 0 ? `$${c.finanzas.total_deuda}` : 'Al día'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <button onClick={(e) => { e.stopPropagation(); setToolModal({ show: true, cliente: c }); }} className="p-1.5 rounded-xl transition text-slate-400 hover:text-white hover:bg-slate-700 relative">
                                                        <WrenchScrewdriverIcon className="w-4 h-4" />
                                                        {unreadCount > 0 && (
                                                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-slate-800 animate-pulse">
                                                                {unreadCount}
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* 📱 VISTA MÓVIL OPTIMIZADA */}
                        <div className="md:hidden flex flex-col gap-2.5 p-2 pb-24">
                            {clientesFiltrados.map((c) => {
                                const statusData = onlineStatus.get(c.id.toString());
                                const unreadCount = noLeidos[c.id]?.count || 0;
                                return (
                                    <div key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-700/60 flex flex-col gap-2.5 shadow-md active:scale-[0.99] transition-transform">

                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-start gap-2.5 overflow-hidden">
                                                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${statusData?.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                                <div className="overflow-hidden">
                                                    <h3 className="font-bold text-white text-sm leading-tight truncate">{c.nombre}</h3>
                                                    <p className="text-slate-500 text-[10px] font-mono mt-0.5">#{c.id} • {c.servicio.ip_asignada}</p>
                                                </div>
                                            </div>
                                            <span className={`shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-extrabold uppercase border ${c.servicio.estado_servicio === 'activo' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-rose-400 border-rose-500/20 bg-rose-500/10'}`}>
                                                {c.servicio.estado_servicio}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/40 text-[11px]">
                                            <div className="overflow-hidden">
                                                <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Plan Contratado</span>
                                                <p className="text-blue-400 font-bold truncate mt-0.5">{c.servicio.plan_nombre}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[9px] text-slate-500 uppercase font-black block tracking-wider">Deuda Pendiente</span>
                                                <p className={`font-black mt-0.5 ${c.finanzas.total_deuda > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {c.finanzas.total_deuda > 0 ? `$${c.finanzas.total_deuda}` : 'Al día'}
                                                </p>
                                            </div>
                                        </div>

                                        <button onClick={(e) => { e.stopPropagation(); setToolModal({ show: true, cliente: c }); }} className="relative mt-0.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700">
                                            <WrenchScrewdriverIcon className="w-3.5 h-3.5" /> Herramientas de Fibra y Red
                                            {unreadCount > 0 && (
                                                <span className="absolute right-3 flex h-4 px-1.5 min-w-[16px] items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white shadow-lg animate-pulse">
                                                    {unreadCount} WhatsApp
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================================
                MODALES MODULARES
               ========================================================= */}
            <ClientToolsModal
                isOpen={toolModal.show}
                onClose={() => setToolModal({ show: false, cliente: null })}
                cliente={toolModal.cliente}
                unreadCount={toolModal.cliente ? noLeidos[toolModal.cliente.id]?.count : 0}
                onActionSuccess={fetchData}
            />
            <ClientDetailModal isOpen={detailModal.show} onClose={() => setDetailModal({ show: false, cliente: null })} cliente={detailModal.cliente} onEditSuccess={fetchData} />
            <CreateClientModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={fetchData} routers={routers} />
        </div>
    );
}