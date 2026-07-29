import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import client from '@/api/axios';
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

import CreateRouterModal from './components/CreateRouterModal';
import RouterPingButton from './components/RouterPingButton';
import type { RouterActionResponse, RouterRecord } from './types';

const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || fallback;
    }

    return fallback;
};

export default function Routers() {
    const [routers, setRouters] = useState<RouterRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [syncingId, setSyncingId] = useState<number | null>(null);
    const [selectedRouter, setSelectedRouter] = useState<RouterRecord | null>(null);

    const fetchRouters = useCallback(async () => {
        try {
            const res = await client.get<RouterRecord[]>('/network/routers/');
            setRouters(res.data);
        } catch {
            toast.error("Error al cargar la lista de routers");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleEdit = (router: RouterRecord) => {
        setSelectedRouter(router);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedRouter(null);
        setIsModalOpen(false);
    };

    const handleSync = async (routerId: number) => {
        if (syncingId !== null) return;
        setSyncingId(routerId);
        const loadingToast = toast.loading("Sincronizando...");

        try {
            const res = await client.post<RouterActionResponse>(`/network/routers/${routerId}/sync`);
            toast.success(res.data.message || "Sincronizado", { id: loadingToast });
            void fetchRouters();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Error al sincronizar"), { id: loadingToast });
        } finally {
            setSyncingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("⚠️ ¿Estás seguro de desvincular este nodo?")) return;
        try {
            await client.delete(`/network/routers/${id}`);
            toast.success("Nodo eliminado");
            void fetchRouters();
        } catch {
            toast.error("No se pudo eliminar");
        }
    };

    useEffect(() => {
        const fetchTimer = window.setTimeout(() => void fetchRouters(), 0);
        return () => window.clearTimeout(fetchTimer);
    }, [fetchRouters]);

    return (
        /* ✅ ADAPTADO: Colores transicionan de blanco a slate oscuro suavemente */
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-700 dark:text-slate-200 pb-12 transition-colors duration-300">

            {/* =========================================================
                HEADER RESPONSIVO DE NODOS
               ========================================================= */}
            <div className="flex justify-between items-center px-1 md:px-0 flex-none gap-2 pb-2">
                <div>
                    {/* ✅ ADAPTADO: Título en negro para claro, blanco para oscuro */}
                    <h2 className="text-xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight transition-colors">
                        Nodos MikroTik
                    </h2>
                    {/* Badge se aclara en modo light */}
                    <div className="hidden sm:flex items-center gap-3 mt-2 bg-white dark:bg-slate-800/80 w-fit px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50 backdrop-blur-md shadow-sm transition-colors">
                        <span className="text-slate-500 dark:text-slate-300 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> Exclusivo PPPoE & Colas Simples
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-2.5 py-2 md:px-5 md:py-3 rounded-xl font-extrabold shadow-md hover:shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-1 text-[10px] md:text-sm tracking-wide uppercase md:normal-case shrink-0"
                >
                    <PlusIcon className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Vincular Nodo</span>
                </button>
            </div>

            {/* GRID */}
            {loading ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700/30 backdrop-blur-sm shadow-sm">
                    <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                    <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-sm text-blue-600 dark:text-blue-400">Escaneando red FdezNet...</span>
                </div>
            ) : routers.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700/30 shadow-sm">
                    <ServerStackIcon className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">No hay nodos vinculados</h3>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {routers.map((router) => (
                        /* ✅ ADAPTADO: Tarjeta limpia y clara en light mode, oscura en dark mode */
                        <div
                            key={router.id}
                            className="relative z-10 bg-white dark:bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-700/50 p-1 transition-colors duration-300 shadow-md dark:shadow-xl group flex flex-col overflow-hidden hover:border-blue-500/40 dark:hover:border-blue-500/50"
                        >

                            {/* Ping & OS Bar */}
                            <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-t-2xl border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center h-14 relative z-10 transition-colors">
                                <RouterPingButton routerId={router.id} />
                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-black tracking-widest bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800 uppercase">
                                    {router.version_os} API
                                </span>
                            </div>

                            <div className="p-5 flex-1 relative z-10 flex flex-col">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="overflow-hidden">
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate tracking-tight">
                                            {router.nombre}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 text-slate-600 dark:text-slate-300">
                                            <span className="bg-slate-50 dark:bg-slate-950/50 px-2 py-0.5 rounded text-xs font-mono border border-slate-200 dark:border-slate-700/50 uppercase tracking-tighter">
                                                {router.ip_vpn || 'SIN IP VPN'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl border border-blue-200 dark:border-blue-500/20">
                                        <CpuChipIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6 mt-auto">
                                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-center shadow-inner transition-colors">
                                        <p className="text-[9px] text-slate-400 dark:text-slate-400 uppercase font-black tracking-wider mb-1">Protocolo</p>
                                        <div className="flex items-center justify-center gap-1">
                                            <ShieldCheckIcon className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm tracking-widest uppercase">PPPoE</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-center shadow-inner transition-colors">
                                        <p className="text-[9px] text-slate-400 dark:text-slate-400 uppercase font-black tracking-wider mb-1">Control QoS</p>
                                        <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
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
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
                                            : 'bg-white dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white hover:border-slate-400 dark:hover:border-slate-500 shadow-sm'}`}
                                >
                                    <ArrowPathIcon className={`w-4 h-4 ${syncingId === router.id ? 'animate-spin' : ''}`} />
                                    <span>{syncingId === router.id ? 'SINCRONIZANDO...' : 'AUTO-SYNC & REPARAR'}</span>
                                </button>
                            </div>

                            {/* ACCIONES */}
                            <div className="flex gap-2 p-2 pt-0 relative z-10">
                                <button
                                    onClick={() => handleEdit(router)}
                                    className="flex-1 bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-600 text-slate-500 dark:text-slate-300 hover:text-white py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-[10px] font-black border border-slate-200 dark:border-slate-700 shadow-sm uppercase tracking-wider active:scale-95"
                                >
                                    <PencilSquareIcon className="w-4 h-4" /> EDITAR
                                </button>

                                <button
                                    onClick={() => handleDelete(router.id)}
                                    className="p-3 bg-slate-50 dark:bg-slate-800/80 hover:bg-rose-600 text-slate-400 dark:text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-200 dark:border-slate-700 group/trash flex items-center justify-center shadow-sm active:scale-90"
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
                onSuccess={() => void fetchRouters()}
                routerToEdit={selectedRouter}
            />
        </div>
    );
}
