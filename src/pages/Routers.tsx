import { useState, useEffect } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import {
    PlusIcon,
    ServerStackIcon,
    ArrowPathIcon,
    CpuChipIcon,
    TrashIcon,
    PencilSquareIcon,
    ShieldCheckIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

import CreateRouterModal from '../components/modals/CreateRouterModal';
import RouterPingButton from '../components/ui/RouterPingButton';

interface Router {
    id: number;
    nombre: string;
    ip_vpn: string;
    user_api: string;
    port_api: number;
    tipo_control: string;
    tipo_seguridad: string;
    version_os: string;
}

export default function Routers() {
    const [routers, setRouters] = useState<Router[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [syncingId, setSyncingId] = useState<number | null>(null);
    const [selectedRouter, setSelectedRouter] = useState<Router | null>(null);

    const fetchRouters = async () => {
        try {
            const res = await client.get('/network/routers/');
            setRouters(res.data);
            setLoading(false);
        } catch (error) {
            toast.error("Error al cargar la lista de routers");
            setLoading(false);
        }
    };

    const handleEdit = (router: Router) => {
        setSelectedRouter(router);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedRouter(null);
        setIsModalOpen(false);
    };

    const handleSync = async (routerId: number) => {
        if (syncingId) return;
        try {
            setSyncingId(routerId);
            const loadingToast = toast.loading("Sincronizando...");
            const res = await client.post(`/network/routers/${routerId}/sync`);
            toast.dismiss(loadingToast);
            toast.success(res.data.message || "Sincronizado");
            fetchRouters();
        } catch (error: any) {
            toast.dismiss();
            toast.error(error.response?.data?.detail || "Error al sincronizar");
        } finally {
            setSyncingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("⚠️ ¿Estás seguro de desvincular este nodo?")) return;
        try {
            await client.delete(`/network/routers/${id}`);
            toast.success("Nodo eliminado");
            fetchRouters();
        } catch (error) {
            toast.error("No se pudo eliminar");
        }
    };

    useEffect(() => {
        fetchRouters();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-sans">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 pb-2">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                        <ServerStackIcon className="w-8 h-8 text-blue-500" />
                        Nodos MikroTik
                    </h2>
                    <div className="flex items-center gap-3 mt-2 bg-slate-800/80 w-fit px-3 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-md">
                        <span className="text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-400" /> Exclusivo PPPoE & Colas Simples
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-blue-500/40 transition-all active:scale-95 border border-blue-400/30 flex items-center justify-center gap-2 font-bold text-sm"
                >
                    <PlusIcon className="w-5 h-5" /> Vincular Nodo
                </button>
            </div>

            {/* GRID */}
            {loading ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700/30 backdrop-blur-sm">
                    <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-sm text-blue-400">Escaneando red FdezNet...</span>
                </div>
            ) : routers.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700/30 border-dashed">
                    <ServerStackIcon className="w-16 h-16 text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-1">No hay nodos vinculados</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {routers.map((router) => (
                        <div 
                            key={router.id} 
                            className="relative z-10 bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 p-1 transition-all duration-300 shadow-xl group flex flex-col overflow-hidden hover:border-blue-500/50"
                        >
                            
                            {/* Ping & OS Bar */}
                            <div className="bg-slate-900/40 p-4 rounded-t-2xl border-b border-slate-700/50 flex justify-between items-center h-14 relative z-10">
                                <RouterPingButton routerId={router.id} />
                                <span className="text-[9px] text-slate-400 font-black tracking-widest bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800 uppercase">
                                    v{router.version_os} REST
                                </span>
                            </div>

                            <div className="p-5 flex-1 relative z-10 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="overflow-hidden">
                                        <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors truncate tracking-tight">
                                            {router.nombre}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 text-slate-300">
                                            <span className="bg-slate-950/50 px-2 py-0.5 rounded text-xs font-mono border border-slate-700/50 uppercase tracking-tighter">
                                                {router.ip_vpn || 'SIN IP VPN'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                        <CpuChipIcon className="w-6 h-6 text-blue-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6 mt-auto">
                                    <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50 text-center shadow-inner">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-1">Protocolo</p>
                                        <div className="flex items-center justify-center gap-1">
                                            <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
                                            <span className="text-emerald-400 font-black text-sm tracking-widest uppercase">PPPoE</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50 text-center shadow-inner">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mb-1">Control QoS</p>
                                        <div className="flex items-center justify-center gap-1 text-blue-400">
                                            <BoltIcon className="w-4 h-4" />
                                            <span className="font-black text-[11px] tracking-widest uppercase">QUEUES</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleSync(router.id)}
                                    disabled={syncingId === router.id}
                                    className={`w-full py-3.5 px-3 rounded-2xl text-xs font-black tracking-widest transition-all flex items-center justify-center gap-2 border uppercase
                                        ${syncingId === router.id
                                            ? 'bg-blue-900/20 text-blue-400 border-blue-500/30'
                                            : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-700 hover:text-white hover:border-slate-500'}`}
                                >
                                    <ArrowPathIcon className={`w-4 h-4 ${syncingId === router.id ? 'animate-spin' : ''}`} />
                                    <span>{syncingId === router.id ? 'SINCRONIZANDO...' : 'AUTO-SYNC & REPARAR'}</span>
                                </button>
                            </div>

                            {/* ACCIONES */}
                            <div className="flex gap-2 p-2 pt-0 relative z-10">
                                <button
                                    onClick={() => handleEdit(router)}
                                    className="flex-1 bg-slate-800/80 hover:bg-blue-600 text-slate-300 hover:text-white py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-[10px] font-black border border-slate-700 shadow-sm uppercase tracking-wider"
                                >
                                    <PencilSquareIcon className="w-4 h-4" /> EDITAR
                                </button>

                                <button
                                    onClick={() => handleDelete(router.id)}
                                    className="p-3 bg-slate-800/80 hover:bg-rose-600 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-700 group/trash flex items-center justify-center"
                                >
                                    <TrashIcon className="w-5 h-5 group-hover/trash:animate-bounce" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CreateRouterModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={fetchRouters}
                routerToEdit={selectedRouter}
            />
        </div>
    );
}