import { useState, useEffect, useMemo } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    UserPlusIcon, MagnifyingGlassIcon, TrashIcon, 
    MapPinIcon, ChatBubbleLeftRightIcon,
    UserCircleIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';

// Importamos los componentes necesarios
import CreateClientModal from '../../components/modals/CreateClientModal';
import ChatModal from '../../components/ChatModal'; 

export default function Orders() {
    const [ordenes, setOrdenes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [routers, setRouters] = useState<any[]>([]);

    // --- ESTADOS PARA CONTROLAR LA CASILLA DE BÚSQUEDA EN MÓVIL ---
    const [mostrarBusquedaMovil, setMostrarBusquedaMovil] = useState(false);

    // --- ESTADOS PARA EL CHAT ---
    const [showChatModal, setShowChatModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState<any>(null);
    const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

    // Cargar órdenes, routers y notificaciones
    const fetchData = async () => {
        setLoading(true);
        try {
            const [resClientes, resRouters, resUnread] = await Promise.all([
                client.get('/clientes/'),
                client.get('/network/routers/'),
                client.get('/whatsapp/no-leidos')
            ]);
            
            const pendientes = resClientes.data.filter((c: any) => c.estado === 'pendiente_instalacion');
            setOrdenes(pendientes);
            setRouters(resRouters.data);
            setUnreadCounts(resUnread.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(async () => {
            try {
                const res = await client.get('/whatsapp/no-leidos');
                setUnreadCounts(res.data);
            } catch (e) {}
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("¿Cancelar esta orden de instalación?")) return;
        
        const load = toast.loading("Cancelando orden...");
        try {
            await client.delete(`/clientes/${id}`);
            toast.success("Orden cancelada", { id: load });
            fetchData();
        } catch (error) {
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
        <div className="p-4 md:p-6 text-white font-sans min-h-full flex flex-col gap-4">
            
            {/* =========================================================
                HEADER DINÁMICO (RESPONSIVO MÓVIL)
               ========================================================= */}
            <div className="flex-none flex justify-between items-center px-1 md:px-0">
                <div>
                    <h1 className="text-xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        Ordenes de Servicio
                        
                        <span className="text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full font-medium hidden sm:inline">
                            {filteredOrders.length}
                        </span>
                    </h1>
                    <p className="text-slate-400 text-xs md:text-sm mt-0.5 hidden sm:block">Instalaciones pendientes por activar en campo.</p>
                </div>
                
                {/* Panel de Botones Compacto */}
                <div className="flex items-center gap-1.5">
                    {/* Botón Lupa (Solo visible en móviles) */}
                    <button 
                        onClick={() => setMostrarBusquedaMovil(!mostrarBusquedaMovil)}
                        className={`md:hidden p-2.5 rounded-xl border transition-all ${mostrarBusquedaMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700/80 text-slate-400'}`}
                    >
                        <MagnifyingGlassIcon className="w-4 h-4" />
                    </button>

                    <button onClick={fetchData} className="p-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-slate-400 hover:text-white transition active:scale-95">
                        <ArrowPathIcon className={`w-4 h-4 md:w-5 md:h-5 ${loading ? 'animate-spin' : ''}`}/>
                    </button>

                    {/* ✅ MEJORA UI/UX: Icono cambiado a UserPlusIcon */}
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2.5 md:px-4 md:py-2.5 rounded-xl flex items-center shadow-lg transition active:scale-95 font-bold text-xs md:text-base ml-1"
                    >
                        <UserPlusIcon className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
                        <span className="hidden sm:inline">Nueva Orden</span>
                    </button>
                </div>
            </div>

            {/* =========================================================
                ZONA DE BÚSQUEDA (FIJA EN ESC-COLAPSABLE EN MÓVIL)
               ========================================================= */}
            {/* Buscador Escritorio */}
            <div className="hidden md:block relative flex-none">
                <input 
                    type="text" 
                    placeholder="Buscar por prospecto, zona o dirección..." 
                    className="w-full bg-[#1a1b23] border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 transition shadow-sm text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-500 absolute left-4 top-3.5"/>
            </div>

            {/* Buscador interactivo móvil */}
            {mostrarBusquedaMovil && (
                <div className="md:hidden relative bg-slate-900 p-2 rounded-xl border border-slate-700/60 shadow-inner flex-none animate-fadeIn">
                    <MagnifyingGlassIcon className="absolute left-5 top-4 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar prospecto o dirección..."
                        autoFocus
                        className="w-full bg-slate-950 text-slate-200 pl-10 pr-10 py-2 rounded-lg border border-slate-800 focus:border-blue-500 outline-none text-xs"
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-5 top-3.5 text-xs text-slate-500 hover:text-white font-bold">
                            Limpiar
                        </button>
                    )}
                </div>
            )}

            {/* =========================================================
                ZONA DE RENDIMIENTO (TABLA / TARJETAS SMART)
               ========================================================= */}
            <div className="flex-1 bg-[#1a1b23] md:border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* 🖥️ COMPONENTE: TABLA ESCRITORIO */}
                    <table className="w-full text-left text-sm hidden md:table">
                        <thead className="bg-[#111] text-slate-400 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="px-6 py-4">Prospecto / Cliente</th>
                                <th className="px-6 py-4">Ubicación</th>
                                <th className="px-6 py-4">Técnico Asignado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading && ordenes.length === 0 ? (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-500 animate-pulse">Cargando órdenes...</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan={4} className="p-10 text-center text-slate-500">No hay instalaciones pendientes.</td></tr>
                            ) : (
                                filteredOrders.map((orden) => {
                                    const hasUnread = unreadCounts[orden.id] > 0;
                                    return (
                                        <tr key={orden.id} className="hover:bg-slate-800/30 transition bg-transparent">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white text-base">{orden.nombre}</div>
                                                <div className="text-blue-400 text-xs mt-1 font-mono">{orden.user_pppoe || 'Sin usuario generado'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-orange-400 font-bold text-xs uppercase mb-1">
                                                    <MapPinIcon className="w-3.5 h-3.5"/>
                                                    {orden.zona?.nombre || 'Zona no especificada'}
                                                </div>
                                                <div className="text-slate-400 text-xs truncate max-w-[250px]" title={orden.direccion}>
                                                    {orden.direccion}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {orden.tecnico ? (
                                                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-fit">
                                                        <UserCircleIcon className="w-4 h-4 text-emerald-500"/>
                                                        <span className="text-emerald-400 font-bold text-xs">
                                                            {orden.tecnico.nombre_completo || orden.tecnico.usuario}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="bg-slate-800 text-slate-500 px-3 py-1.5 rounded-lg text-[10px] font-black border border-slate-700">
                                                        SIN ASIGNAR
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            setTargetCliente(orden);
                                                            setShowChatModal(true);
                                                        }} 
                                                        className={`p-2 rounded-lg transition relative ${hasUnread ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                                                        title="Chatear con cliente"
                                                    >
                                                        <ChatBubbleLeftRightIcon className="w-5 h-5"/>
                                                        {hasUnread && (
                                                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-[8px] items-center justify-center font-black text-white border border-slate-900">
                                                                    {unreadCounts[orden.id]}
                                                                </span>
                                                            </span>
                                                        )}
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(orden.id)} 
                                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" 
                                                        title="Cancelar Orden"
                                                    >
                                                        <TrashIcon className="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>

                    {/* 📱 COMPONENTE: MOBILE CARDS (NATIVO MÓVIL EXCELENTE) */}
                    <div className="md:hidden flex flex-col gap-3 p-2 pb-24">
                        {loading && ordenes.length === 0 ? (
                            <div className="p-10 text-center text-slate-500 animate-pulse text-xs">Cargando órdenes...</div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="p-10 text-center text-slate-500 text-xs">No hay instalaciones pendientes.</div>
                        ) : (
                            filteredOrders.map((orden) => {
                                const hasUnread = unreadCounts[orden.id] > 0;
                                return (
                                    <div key={orden.id} className="bg-slate-900/95 rounded-xl p-3.5 border border-slate-800 flex flex-col gap-3 shadow-md">
                                        
                                        {/* Cabecera Tarjeta: Nombre y Estado de asignación */}
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <h3 className="font-bold text-white text-sm leading-tight truncate max-w-[180px] sm:max-w-[240px]">{orden.nombre}</h3>
                                                <p className="text-blue-400 font-mono text-[10px] mt-0.5">{orden.user_pppoe || 'Sin usuario generado'}</p>
                                            </div>
                                            
                                            {/* Badge de Técnico Asignado */}
                                            {orden.tecnico ? (
                                                <span className="shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold border text-emerald-400 border-emerald-500/20 bg-emerald-500/10 flex items-center gap-1">
                                                    <UserCircleIcon className="w-3 h-3"/>
                                                    {orden.tecnico.usuario.toUpperCase()}
                                                </span>
                                            ) : (
                                                <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[8px] font-black border text-slate-500 border-slate-700 bg-slate-800">
                                                    SIN ASIGNAR
                                                </span>
                                            )}
                                        </div>

                                        {/* Cuerpo: Ubicación Física Estilizada */}
                                        <div className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                                            <div className="flex items-center gap-1 text-orange-400 font-bold text-[10px] uppercase tracking-wider">
                                                <MapPinIcon className="w-3.5 h-3.5"/>
                                                {orden.zona?.nombre || 'Zona no especificada'}
                                            </div>
                                            <p className="text-slate-400 leading-normal line-clamp-2" title={orden.direccion}>
                                                {orden.direccion || 'Sin dirección registrada'}
                                            </p>
                                        </div>

                                        {/* Barra de Herramientas Inferior de la Tarjeta */}
                                        <div className="flex items-center gap-2 border-t border-slate-800/70 pt-2 mt-0.5">
                                            {/* Acción A: Chat de WhatsApp con Notificaciones */}
                                            <button 
                                                onClick={() => {
                                                    setTargetCliente(orden);
                                                    setShowChatModal(true);
                                                }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border ${hasUnread ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                                            >
                                                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                                <span>{hasUnread ? `Chat (${unreadCounts[orden.id]} nuevos)` : 'Chatear WhatsApp'}</span>
                                            </button>

                                            {/* Acción B: Cancelar/Borrar Orden */}
                                            <button 
                                                onClick={() => handleDelete(orden.id)}
                                                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-red-400 active:scale-95 transition-all shrink-0"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>
            </div>

            {/* MODAL DE CREACIÓN */}
            <CreateClientModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                routers={routers}
                onSuccess={() => {
                    fetchData();
                    setIsCreateModalOpen(false);
                }}
            />

            {/* MODAL DE CHAT REUTILIZABLE */}
            <ChatModal 
                isOpen={showChatModal} 
                onClose={() => {
                    setShowChatModal(false);
                    fetchData();
                }} 
                cliente={targetCliente} 
                onMessagesRead={fetchData}
            />
        </div>
    );
}