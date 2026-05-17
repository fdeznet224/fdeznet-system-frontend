import { useState, useEffect, useMemo } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import { 
    MagnifyingGlassIcon, PlusIcon, WrenchScrewdriverIcon, ArrowPathIcon
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
    // 🔥 NUEVO ESTADO PARA MENSAJES NO LEÍDOS
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

            // Fetch Estado Online
            try {
                const resOnline = await client.get('/dashboard/status-tabla-clientes');
                if (Array.isArray(resOnline.data.detalle_clientes)) {
                    const mapaEstados = new Map<string, OnlineStatus>();
                    resOnline.data.detalle_clientes.forEach((item: any) => {
                        mapaEstados.set(item.ip, { color: item.color, diag: item.diagnostico_sistema, online: item.estado_tecnico === 'ONLINE' });
                    });
                    setOnlineStatus(mapaEstados);
                }
            } catch (err) { console.warn("Dashboard online no disponible"); }

            // 🔥 Fetch Mensajes No Leídos
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
        const intervalData = setInterval(fetchData, 60000); // Polling relajado cada 60s
        return () => clearInterval(intervalData); 
    }, []);

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
            if (filtroEstado === 'online') return onlineStatus.get(c.servicio.ip_asignada)?.online === true;
            
            return true;
        });
    }, [clientes, busqueda, filtroRouter, filtroEstado, onlineStatus]);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 font-sans">
            
            {/* Header y Filtros */}
            <div className="flex-none space-y-4">
                <div className="flex justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Gestión de Clientes</h2>
                        <p className="text-slate-400 text-xs md:text-sm">Directorio unificado de servicios y finanzas</p>
                    </div>
                    <button onClick={() => setIsCreateOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center shadow-lg transition active:scale-95 font-bold text-sm md:text-base">
                        <PlusIcon className="w-5 h-5 md:mr-2" /> <span className="hidden md:inline">Nuevo Cliente</span>
                    </button>
                </div>

                <div className="flex flex-col xl:flex-row gap-4 bg-slate-800 p-3 md:p-4 rounded-2xl border border-slate-700 shadow-lg">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                        <input 
                            type="text" placeholder="Buscar cliente..."
                            className="w-full bg-slate-900 text-slate-200 pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:border-blue-500 outline-none text-sm"
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} 
                        />
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
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
            </div>

            {/* ZONA DE DATOS */}
            <div className="flex-1 bg-slate-800 md:bg-slate-800/50 rounded-2xl md:border border-slate-700/50 shadow-xl overflow-hidden flex flex-col">
                {loading ? <div className="flex justify-center items-center h-full"><ArrowPathIcon className="w-10 h-10 animate-spin text-blue-500" /></div> : (
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        
                        {/* VISTA ESCRITORIO */}
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
                            <tbody className="divide-y divide-slate-700">
                                {clientesFiltrados.map((c) => {
                                    const statusData = onlineStatus.get(c.servicio.ip_asignada);
                                    const unreadCount = noLeidos[c.id]?.count || 0; // 🔥 Checamos si tiene mensajes
                                    return (
                                        <tr key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className="hover:bg-slate-700/40 transition group cursor-pointer bg-slate-800">
                                            <td className="px-6 py-4 text-center font-mono text-slate-500 text-xs">#{c.id}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${statusData?.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                                    <div>
                                                        <div className="font-bold text-white text-sm">{c.nombre}</div>
                                                        <div className="text-slate-500 text-xs truncate max-w-[200px]">{c.direccion || 'Sin dirección'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-blue-400 font-bold">{c.servicio.plan_nombre}</div>
                                                <div className="text-slate-500 text-[10px] font-mono">{c.servicio.ip_asignada}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${c.servicio.estado_servicio === 'activo' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-rose-400 border-rose-500/20 bg-rose-500/5'}`}>
                                                    {c.servicio.estado_servicio}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className={`text-sm font-bold ${c.finanzas.total_deuda > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {c.finanzas.total_deuda > 0 ? `$${c.finanzas.total_deuda}` : 'Al día'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center relative">
                                                    <button onClick={(e) => { e.stopPropagation(); setToolModal({ show: true, cliente: c }); }} className="p-2 rounded-xl transition text-slate-400 hover:text-white hover:bg-slate-700 relative">
                                                        <WrenchScrewdriverIcon className="w-5 h-5" />
                                                        {/* 🔥 BURBUJA ROJA ESCRITORIO 🔥 */}
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

                        {/* VISTA MÓVIL */}
                        <div className="md:hidden flex flex-col gap-3 p-2 pb-20">
                            {clientesFiltrados.map((c) => {
                                const statusData = onlineStatus.get(c.servicio.ip_asignada);
                                const unreadCount = noLeidos[c.id]?.count || 0; // 🔥 Checamos si tiene mensajes
                                return (
                                    <div key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className="bg-slate-900 rounded-2xl p-4 border border-slate-700/50 flex flex-col gap-3 shadow-lg active:scale-[0.98] transition-transform">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex items-start gap-3 overflow-hidden">
                                                <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${statusData?.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                                <div className="overflow-hidden">
                                                    <h3 className="font-bold text-white text-base leading-tight truncate">{c.nombre}</h3>
                                                    <p className="text-slate-500 text-[11px] font-mono mt-0.5">#{c.id} • {c.cedula || 'S/N'}</p>
                                                </div>
                                            </div>
                                            <span className={`shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold uppercase border ${c.servicio.estado_servicio === 'activo' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-rose-400 border-rose-500/20 bg-rose-500/10'}`}>
                                                {c.servicio.estado_servicio}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 mt-1">
                                            <div className="overflow-hidden">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Servicio</p>
                                                <p className="text-[11px] text-blue-400 font-bold truncate">{c.servicio.plan_nombre}</p>
                                                <p className="text-[10px] text-slate-400 font-mono">{c.servicio.ip_asignada}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold">Finanzas</p>
                                                <p className={`text-sm font-bold mt-0.5 ${c.finanzas.total_deuda > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                    {c.finanzas.total_deuda > 0 ? `$${c.finanzas.total_deuda}` : 'Al día'}
                                                </p>
                                            </div>
                                        </div>

                                        <button onClick={(e) => { e.stopPropagation(); setToolModal({ show: true, cliente: c }); }} className="relative mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all border bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700">
                                            <WrenchScrewdriverIcon className="w-4 h-4" /> Herramientas y Acciones
                                            {/* 🔥 BURBUJA ROJA MÓVIL 🔥 */}
                                            {unreadCount > 0 && (
                                                <span className="absolute right-4 flex h-5 px-1.5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-lg animate-pulse">
                                                    {unreadCount} Nuevos
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

            {/* MODALES */}
            {/* 🔥 Pasamos los noLeidos al modal para que también los muestre adentro 🔥 */}
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