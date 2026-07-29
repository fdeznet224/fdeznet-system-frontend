import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import {
    SignalIcon, PlusIcon, ArrowPathIcon,
    ServerIcon, ArrowUpIcon, ArrowDownIcon,
    PencilSquareIcon, TrashIcon, FunnelIcon, CpuChipIcon
} from '@heroicons/react/24/outline';
import PlanModal from './components/CreatePlanModal';
import type { PlanRecord, RouterOption } from './types';

const getErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || fallback;
    }

    return fallback;
};

export default function Planes() {
    const [planes, setPlanes] = useState<PlanRecord[]>([]);
    const [routers, setRouters] = useState<RouterOption[]>([]);
    const [selectedRouter, setSelectedRouter] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    // Estado para el Modal
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, plan?: PlanRecord }>({
        isOpen: false,
        plan: undefined
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [resRouters, resPlanes] = await Promise.all([
                client.get<RouterOption[]>('/network/routers/'),
                selectedRouter === 'all'
                    ? client.get<PlanRecord[]>('/planes/')
                    : client.get<PlanRecord[]>(`/planes/router/${selectedRouter}`)
            ]);
            setRouters(resRouters.data);
            setPlanes(resPlanes.data);
        } catch {
            toast.error("Error al sincronizar con el servidor");
        } finally {
            setLoading(false);
        }
    }, [selectedRouter]);

    useEffect(() => {
        const fetchTimer = window.setTimeout(() => void fetchData(), 0);
        return () => window.clearTimeout(fetchTimer);
    }, [fetchData]);

    const handleDelete = async (id: number) => {
        if (!window.confirm("⚠️ ¿Estás seguro? Al eliminar este plan, se borrará el Perfil PPPoE asociado en el MikroTik.")) return;
        try {
            await client.delete(`/planes/${id}`);
            toast.success("Plan y Perfil MikroTik eliminados");
            void fetchData();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Error al eliminar"));
        }
    };

    return (
        /* ✅ ADAPTADO: Texto adaptativo desde la raíz */
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-700 dark:text-slate-200 pb-12 transition-colors duration-300">

            {/* =========================================================
                HEADER RESPONSIVO Y FILTROS COMPACTOS INLINE
               ========================================================= */}
            <div className="flex justify-between items-center px-1 md:px-0 flex-none gap-1.5 pb-2">
                <div>
                    {/* ✅ ADAPTADO: Título oscuro en modo claro */}
                    <h2 className="text-sm sm:text-base md:text-2xl font-black text-slate-800 dark:text-white tracking-tight whitespace-nowrap">
                        Planes de Internet
                    </h2>
                    {/* El badge de soporte técnico se adapta al tema */}
                    <div className="hidden sm:flex items-center gap-3 mt-2 bg-white dark:bg-slate-800/80 w-fit px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700/50 backdrop-blur-md shadow-sm">
                        <span className="text-slate-500 dark:text-slate-300 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                            <CpuChipIcon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> Sincronización PPPoE & Simple Queues
                        </span>
                    </div>
                </div>

                {/* Contenedor inline de herramientas micro-compacto */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

                    {/* Selector de Nodos Moderno, Delgado y Adaptativo */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-1.5 py-1.5 flex items-center gap-0.5 shadow-sm">
                        <FunnelIcon className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <select
                            value={selectedRouter}
                            onChange={(e) => setSelectedRouter(e.target.value)}
                            className="bg-transparent text-slate-700 dark:text-slate-300 font-extrabold outline-none text-[10px] md:text-xs cursor-pointer appearance-none pr-0.5"
                        >
                            <option value="all" className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">Todo</option>
                            {routers.map(r => <option key={r.id} value={r.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">{r.nombre.toUpperCase()}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={() => setModalConfig({ isOpen: true })}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-1.5 py-1.5 md:px-4 md:py-2.5 rounded-xl font-black shadow-md active:scale-95 transition flex items-center justify-center gap-1 text-[10px] md:text-sm tracking-wide uppercase md:normal-case"
                    >
                        <PlusIcon className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        <span>Nuevo Plan</span>
                    </button>
                </div>
            </div>

            {/* =========================================================
                GRID DE PLANES EN CONEXIÓN MIKROTIK
               ========================================================= */}
            {loading ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-800/30 rounded-3xl border border-slate-200 dark:border-slate-700/30 backdrop-blur-sm shadow-sm flex-1">
                    <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-500 mb-4" />
                    <span className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs font-mono">Sincronizando con MikroTik...</span>
                </div>
            ) : planes.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-white dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700/30 backdrop-blur-sm flex-1 shadow-sm">
                    <SignalIcon className="w-16 h-16 text-slate-400 dark:text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1">Sin planes configurados</h3>
                    <span className="text-slate-500 text-sm">Crea tu primer plan para asignarlo a tus clientes PPPoE.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 flex-1">
                    {planes.map((plan) => {
                        const routerAsignado = routers.find(r => r.id === plan.router_id);
                        return (
                            /* ✅ ADAPTADO: Tarjeta blanca pulcra vs oscura translúcida */
                            <div key={plan.id} className="relative bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-md dark:shadow-xl group overflow-hidden flex flex-col gap-3 transition-colors duration-200">

                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6 transition-all group-hover:bg-blue-500/10"></div>

                                <div className="flex-1 relative z-10 flex flex-col">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                            <SignalIcon className="w-5 h-5" />
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[8px] text-slate-400 dark:text-slate-500 block uppercase font-black tracking-widest">Mensualidad</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-black text-xl">${plan.precio}</span>
                                        </div>
                                    </div>

                                    <h3 className="text-base font-black text-slate-800 dark:text-white truncate mb-1 mt-1">{plan.nombre}</h3>

                                    {/* BLOQUE DE VELOCIDAD (SIMPLE QUEUES) */}
                                    <div className="grid grid-cols-2 gap-2 my-3">
                                        {/* Bajada */}
                                        <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-inner">
                                            <div className="flex items-center justify-center gap-1 text-[8px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider mb-1">
                                                <ArrowDownIcon className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> DOWN
                                            </div>
                                            <p className="text-slate-900 dark:text-white font-black text-xl tracking-tight">
                                                {Math.round((plan.velocidad_bajada || 0) / 1024)}<span className="text-xs text-slate-400 dark:text-slate-500 font-bold ml-0.5">M</span>
                                            </p>
                                        </div>
                                        {/* Subida */}
                                        <div className="bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-inner">
                                            <div className="flex items-center justify-center gap-1 text-[8px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider mb-1">
                                                <ArrowUpIcon className="w-3 h-3 text-blue-500 dark:text-blue-400" /> UP
                                            </div>
                                            <p className="text-slate-900 dark:text-white font-black text-xl tracking-tight">
                                                {Math.round((plan.velocidad_subida || 0) / 1024)}<span className="text-xs text-slate-400 dark:text-slate-500 font-bold ml-0.5">M</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 mt-auto bg-slate-100 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-200 dark:border-slate-800/80 w-fit">
                                        <ServerIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                                        <span className="text-[9px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest truncate max-w-[120px]">
                                            {routerAsignado?.nombre || 'S/A'}
                                        </span>
                                    </div>
                                </div>

                                {/* ACCIONES */}
                                <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 relative z-10">
                                    <button
                                        onClick={() => setModalConfig({ isOpen: true, plan })}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 text-slate-600 dark:text-slate-300 hover:text-white py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold border border-slate-200 dark:border-slate-800 active:scale-95"
                                    >
                                        <PencilSquareIcon className="w-3.5 h-3.5" /> <span>EDITAR</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(plan.id)}
                                        className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-600 text-slate-400 dark:text-slate-400 hover:text-white rounded-xl transition-all border border-slate-200 dark:border-slate-800 active:scale-95 group/trash"
                                        title="Eliminar Plan"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL (Create/Edit) */}
            <PlanModal
                isOpen={modalConfig.isOpen}
                plan={modalConfig.plan}
                onClose={() => setModalConfig({ isOpen: false, plan: undefined })}
                onSuccess={() => void fetchData()}
                routers={routers}
            />
        </div>
    );
}
