import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    PlusIcon, MagnifyingGlassIcon, TrashIcon, 
    MapPinIcon, ChatBubbleLeftRightIcon, ClipboardDocumentListIcon,
    UserCircleIcon, ArrowPathIcon
} from '@heroicons/react/24/outline';

// Importamos los componentes necesarios
import CreateClientModal from '../../components/modals/CreateClientModal';
import ChatModal from '../../components/ChatModal'; // ✅ Nuevo import

export default function Orders() {
    const [ordenes, setOrdenes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [routers, setRouters] = useState<any[]>([]);

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
                client.get('/whatsapp/no-leidos') // ✅ Cargar notificaciones
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
        // Polling para nuevos mensajes cada 10 segundos en esta vista
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

    const filteredOrders = ordenes.filter(o => 
        o.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.direccion?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 text-white font-sans min-h-full">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <ClipboardDocumentListIcon className="w-8 h-8 text-blue-500"/>
                        Órdenes de Servicio
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">Instalaciones pendientes por activar en campo.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchData} className="p-2.5 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition">
                        <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`}/>
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition active:scale-95"
                    >
                        <PlusIcon className="w-5 h-5"/>
                        Nueva Orden
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="mb-6 relative">
                <input 
                    type="text" 
                    placeholder="Buscar por prospecto o dirección..." 
                    className="w-full bg-[#1a1b23] border border-slate-700 text-white pl-12 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 transition shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-500 absolute left-4 top-3.5"/>
            </div>

            {/* TABLA */}
            <div className="bg-[#1a1b23] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#111] text-slate-400 uppercase text-[10px] font-bold tracking-wider">
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
                                        <tr key={orden.id} className="hover:bg-slate-800/50 transition">
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
                                                    {/* 👇 BOTÓN DE CHAT CON NOTIFICACIÓN 👇 */}
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

            {/* 👇 MODAL DE CHAT REUTILIZABLE 👇 */}
            <ChatModal 
                isOpen={showChatModal} 
                onClose={() => {
                    setShowChatModal(false);
                    fetchData(); // Refrescar para limpiar conteos
                }} 
                cliente={targetCliente} 
                onMessagesRead={fetchData}
            />
        </div>
    );
}