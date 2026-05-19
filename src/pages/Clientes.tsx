import { useState, useEffect, useMemo } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import {
    MagnifyingGlassIcon, PlusIcon, WrenchScrewdriverIcon, ArrowPathIcon, FunnelIcon
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
    // --- ESTADOS ---
    const [clientes, setClientes] = useState<ClienteUnificado[]>([]);
    const [onlineStatus, setOnlineStatus] = useState<Map<string, OnlineStatus>>(new Map());
    const [routers, setRouters] = useState<any[]>([]);
    const [noLeidos, setNoLeidos] = useState<Record<string, { count: number }>>({});
    const [loading, setLoading] = useState(true);

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

            // ✅ CORRECCIÓN CLAVE: Mapear el Objeto/Diccionario indexado por ID que manda FastAPI
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

    // ✅ CORRECCIÓN CLAVE: Buscar en el mapa usando c.id.toString() en vez de la IP
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
                HEADER PRINCIPAL
               ========================================================= */}
            <div className="flex-none flex justify-between items-center px-2 md:px-0">
                <div>
                    <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">Gestión de Clientes</h2>
                    <p className="text-slate-400 text-xs md:text-sm hidden sm:block">Directorio unificado de servicios y finanzas</p>
                </div>
                <button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center shadow-lg transition active:scale-95 font-bold text-xs md:text-base">
                    <PlusIcon className="w-4 h-4 md:w-5 md:h-5 md:mr-2" /> <span>Nuevo Cliente</span>
                </button>
            </div>

            {/* =========================================================
                ZONA DE FILTROS (REDISENADA PARA RESPONDER EN MOVIL)
               ========================================================= */}
            <div className="flex-none space-y-3">
                {/* Escritorio: Caja de filtros unificada estándar */}
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

                {/* Movil y Tablet: Interfaz ultra-compacta y despejada */}
                <div className="xl:hidden flex flex-col gap-2.5 bg-slate-800 p-3 rounded-2xl border border-slate-700/70 shadow-md">
                    {/* Buscador estilizado */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            type="text" placeholder="Buscar por nombre, IP o ID..."
                            className="w-full bg-slate-900 text-slate-200 pl-9 pr-4 py-2 rounded-xl border border-slate-700/80 focus:border-blue-500 outline-none text-xs"
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>

                    {/* Botones Tipo Píldora (Scroll Horizontal para Filtros Rápidos) */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 custom-scrollbar scrollbar-none">
                        <button
                            onClick={() => setFiltroEstado('todos')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${filtroEstado === 'todos' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                        >
                            Todos ({clientes.length})
                        </button>
                        <button
                            onClick={() => setFiltroEstado('online')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filtroEstado === 'online' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                        >
                            <span>🟢</span> Online
                        </button>
                        <button
                            onClick={() => setFiltroEstado('suspendidos')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filtroEstado === 'suspendidos' ? 'bg-orange-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                        >
                            <span>⛔</span> Suspendidos
                        </button>
                        <button
                            onClick={() => setFiltroEstado('morosos')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${filtroEstado === 'morosos' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-700'}`}
                        >
                            <span>💰</span> Con Deuda
                        </button>
                    </div>

                    {/* Filtro secundario de router micro-compacto */}
                    <div className="flex items-center gap-2 border-t border-slate-700/50 pt-2 mt-0.5">
                        <FunnelIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <select
                            value={filtroRouter}
                            onChange={(e) => setFiltroRouter(e.target.value)}
                            className="w-full bg-transparent text-slate-300 font-semibold outline-none text-xs cursor-pointer"
                        >
                            <option value="" className="bg-slate-900 text-slate-300">Filtrar por Nodo / Router (Todos)</option>
                            {routers.map(r => <option key={r.id} value={r.id} className="bg-slate-900 text-slate-300">{r.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* =========================================================
                ZONA DE RENDIMIENTO Y LISTADO DE CLIENTES
               ========================================================= */}
            <div className="flex-1 bg-slate-800 md:bg-slate-800/40 rounded-2xl md:border border-slate-700/50 shadow-xl overflow-hidden flex flex-col">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1 custom-scrollbar">

                        {/* 🖥️ COMPONENTE: TABLA PARA VISTA ESCRITORIO */}
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
                                    // ✅ CORRECCIÓN CLAVE: Buscar por ID como string
                                    const statusData = onlineStatus.get(c.id.toString());
                                    const unreadCount = noLeidos[c.id]?.count || 0;
                                    return (
                                        <tr key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className="hover:bg-slate-700/30 transition group cursor-pointer bg-transparent">
                                            <td className="px-6 py-4 text-center font-mono text-slate-500 text-xs">#{c.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {/* Punto de estado interactivo */}
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
                                                    <button onClick={(e) => { e.stopPropagation(); setToolModal({ show: true, cliente: c }); }} className="p-1.8 rounded-xl transition text-slate-400 hover:text-white hover:bg-slate-700 relative">
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

                        {/* 📱 COMPONENTE: LISTA OPTIMIZADA PARA VISTA MOVIL */}
                        <div className="md:hidden flex flex-col gap-2.5 p-2 pb-24">
                            {clientesFiltrados.map((c) => {
                                // ✅ CORRECCIÓN CLAVE: Buscar por ID como string en móvil
                                const statusData = onlineStatus.get(c.id.toString());
                                const unreadCount = noLeidos[c.id]?.count || 0;
                                return (
                                    <div key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-700/60 flex flex-col gap-2.5 shadow-md active:scale-[0.99] transition-transform">

                                        {/* Fila Alta: Nombre, ID y Estado Administrativo */}
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-start gap-2.5 overflow-hidden">
                                                {/* Foco de estado online real */}
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

                                        {/* Fila Media: Plan Técnico vs Estado Financiero */}
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

                                        {/* Botón de Acciones Rápido */}
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
                MODALES MODULARES DEL SISTEMA
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