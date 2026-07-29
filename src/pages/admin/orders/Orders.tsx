import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { 
    UserPlusIcon, MagnifyingGlassIcon, TrashIcon, 
    MapPinIcon, ChatBubbleLeftRightIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

import CreateOrdenModal from './components/CreateOrdenModal';
import ChatModal from '@/components/chat/ChatModal'; 

interface ServiceOrder {
    id: number;
    nombre: string;
    telefono: string;
    estado: string;
    direccion?: string | null;
    user_pppoe?: string | null;
    zona?: { nombre?: string | null } | null;
    tecnico?: { nombre_completo?: string | null; usuario: string } | null;
    version?: number;
}

interface UnreadSummary {
    count: number;
    antiguedad?: string | null;
}

export default function Orders() {
    const [ordenes, setOrdenes] = useState<ServiceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [mostrarBusquedaMovil, setMostrarBusquedaMovil] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();
    const sugerencia = {
        caja_nap_id: Number(searchParams.get('caja_nap_id')) || undefined,
        puerto_nap: Number(searchParams.get('puerto_nap')) || undefined,
    };

    useEffect(() => {
        if (searchParams.get('caja_nap_id')) setIsCreateModalOpen(true);
    }, [searchParams]);

    const [showChatModal, setShowChatModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState<ServiceOrder | null>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, UnreadSummary>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resOrdenes, resUnread] = await Promise.all([
                client.get<Array<{ id: number; version: number; estado: string; cliente?: { nombre?: string; telefono?: string; direccion?: string }; prospecto_nombre?: string; prospecto_telefono?: string; prospecto_direccion?: string; tecnico?: { nombre?: string; usuario: string } }>>('/ordenes/?tipo=instalacion'),
                client.get<Record<string, UnreadSummary>>('/whatsapp/no-leidos')
            ]);
            
            const pendientes = resOrdenes.data
                .filter((orden) => !['terminada', 'cancelada'].includes(orden.estado))
                .map((orden) => ({
                    id: orden.id,
                    nombre: orden.cliente?.nombre || orden.prospecto_nombre || 'Prospecto',
                    telefono: orden.cliente?.telefono || orden.prospecto_telefono || '',
                    direccion: orden.cliente?.direccion || orden.prospecto_direccion || '',
                    estado: orden.estado,
                    user_pppoe: null,
                    tecnico: orden.tecnico ? { nombre_completo: orden.tecnico.nombre, usuario: orden.tecnico.usuario } : null,
                    version: orden.version,
                }));
            setOrdenes(pendientes);
            setUnreadCounts(resUnread.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => void fetchData(), 0);
        const interval = window.setInterval(async () => {
            try {
                const res = await client.get<Record<string, UnreadSummary>>('/whatsapp/no-leidos');
                setUnreadCounts(res.data);
            } catch (error) {
                console.warn('No fue posible actualizar los mensajes no leídos', error);
            }
        }, 10000);
        return () => {
            window.clearTimeout(initialLoad);
            window.clearInterval(interval);
        };
    }, [fetchData]);

    const handleDelete = async (id: number) => {
        if (!confirm("¿Cancelar esta orden de instalación?")) return;
        const load = toast.loading("Cancelando orden...");
        try {
            const orden = ordenes.find((item) => item.id === id);
            await client.post(`/ordenes/${id}/estado`, {
                estado: 'cancelada',
                version: orden?.version || 1,
                comentario: 'Cancelada por administración',
            });
            toast.success("Orden cancelada", { id: load });
            void fetchData();
        } catch {
            toast.error("Error al eliminar", { id: load });
        }
    };

    const filteredOrders = useMemo(() => {
        return ordenes.filter(o => 
            o.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.direccion?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [ordenes, searchTerm]);

    return (
        /* ✅ ADAPTADO: Fondo base dinámico */
        <div className="p-4 md:p-6 text-slate-800 dark:text-white font-sans min-h-full flex flex-col gap-4 bg-slate-50 dark:bg-[#0f1219] transition-colors duration-300">
            
            {/* HEADER */}
            <div className="flex-none flex justify-between items-center px-1 md:px-0">
                <div>
                    <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 transition-colors">
                        Ordenes de Servicio
                        <span className="text-xs bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-black transition-colors">
                            {filteredOrders.length}
                        </span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-0.5 hidden sm:block">Instalaciones pendientes por activar en campo.</p>
                </div>
                
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={() => setMostrarBusquedaMovil(!mostrarBusquedaMovil)}
                        className={`md:hidden p-2.5 rounded-xl border transition-all ${mostrarBusquedaMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-500'}`}
                    >
                        <MagnifyingGlassIcon className="w-4 h-4" />
                    </button>

                    <button onClick={fetchData} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition active:scale-95">
                        <ArrowPathIcon className={`w-4 h-4 md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`}/>
                    </button>

                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        aria-label="Nueva Orden"
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2.5 md:px-4 md:py-2.5 rounded-xl flex items-center shadow-md transition active:scale-95 font-black text-xs md:text-base ml-1"
                    >
                        <UserPlusIcon className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
                        <span className="hidden sm:inline">Nueva Orden</span>
                    </button>
                </div>
            </div>

            {/* BUSCADOR */}
            <div className="hidden md:block relative flex-none">
                <input 
                    type="text" 
                    placeholder="Buscar por prospecto, zona o dirección..." 
                    className="w-full bg-white dark:bg-[#1a1b23] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white pl-12 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 transition shadow-sm dark:shadow-none text-sm placeholder-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-3.5"/>
            </div>

            {/* BUSCADOR MÓVIL */}
            {mostrarBusquedaMovil && (
                <div className="md:hidden relative bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner flex-none animate-fadeIn transition-colors">
                    <MagnifyingGlassIcon className="absolute left-5 top-4 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar prospecto..."
                        autoFocus
                        className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 pl-10 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-800 focus:border-blue-500 outline-none text-xs"
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
            )}

            {/* LISTADO DE ORDENES */}
            <div className="flex-1 bg-white dark:bg-[#1a1b23] md:border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl flex flex-col transition-colors">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 hidden md:table">
                        <thead className="bg-slate-100 dark:bg-[#111] text-slate-600 dark:text-slate-400 uppercase text-[10px] font-black tracking-widest sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
                            <tr>
                                <th className="px-6 py-4">Prospecto / Cliente</th>
                                <th className="px-6 py-4">Ubicación</th>
                                <th className="px-6 py-4">Técnico Asignado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                            {loading && ordenes.length === 0 ? (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-500 animate-pulse">Cargando...</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-500">No hay instalaciones.</td></tr>
                            ) : (
                                filteredOrders.map((orden) => {
                                    const hasUnread = (unreadCounts[String(orden.id)]?.count ?? 0) > 0;
                                    return (
                                        <tr key={orden.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-black text-slate-900 dark:text-white text-base transition-colors">{orden.nombre}</div>
                                                <div className="text-blue-600 dark:text-blue-400 text-xs mt-1 font-mono">{orden.user_pppoe || 'Sin usuario'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-black text-[10px] uppercase mb-1">
                                                    <MapPinIcon className="w-3.5 h-3.5"/>
                                                    {orden.zona?.nombre || 'Zona no especificada'}
                                                </div>
                                                <div className="text-slate-600 dark:text-slate-400 text-xs truncate max-w-[250px]">{orden.direccion}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {orden.tecnico ? (
                                                    <span className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-black">
                                                        {orden.tecnico.nombre_completo || orden.tecnico.usuario}
                                                    </span>
                                                ) : (
                                                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-200 dark:border-slate-700">SIN ASIGNAR</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setTargetCliente(orden); setShowChatModal(true); }} className={`p-2 rounded-lg transition ${hasUnread ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-500'}`}>
                                                        <ChatBubbleLeftRightIcon className="w-5 h-5"/>
                                                    </button>
                                                    <button onClick={() => handleDelete(orden.id)} className="p-2 text-slate-400 hover:text-red-500 transition"><TrashIcon className="w-5 h-5"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* MOBILE CARDS */}
                    <div className="md:hidden flex flex-col gap-3 p-2 pb-24">
                        {filteredOrders.map((orden) => (
                            <div key={orden.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-black text-slate-900 dark:text-white text-sm">{orden.nombre}</h3>
                                    {orden.tecnico && <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">{orden.tecnico.usuario.toUpperCase()}</span>}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mb-3 truncate">{orden.direccion}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => { setTargetCliente(orden); setShowChatModal(true); }} className="flex-1 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">Chat</button>
                                    <button onClick={() => handleDelete(orden.id)} className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-100 dark:border-rose-500/20 text-[10px] font-black uppercase">Cancelar</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <CreateOrdenModal
                isOpen={isCreateModalOpen}
                sugerencia={sugerencia}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => { fetchData(); setIsCreateModalOpen(false); setSearchParams({}); }}
            />
            <ChatModal isOpen={showChatModal} onClose={() => { setShowChatModal(false); fetchData(); }} cliente={targetCliente} onMessagesRead={fetchData} />
        </div>
    );
}
