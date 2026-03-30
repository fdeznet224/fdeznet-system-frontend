import { useState, useEffect } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import { 
    SignalIcon, PlusIcon, ArrowPathIcon, 
    ServerIcon, ArrowUpIcon, ArrowDownIcon,
    PencilSquareIcon, TrashIcon, FunnelIcon, CpuChipIcon
} from '@heroicons/react/24/outline';
import PlanModal from '../components/modals/CreatePlanModal';

interface Router {
    id: number;
    nombre: string;
}

interface Plan {
    id: number;
    nombre: string;
    precio: number;
    velocidad_subida: number; 
    velocidad_bajada: number; 
    router_id: number;
    garantia_percent?: number;
    prioridad?: number;
}

export default function Planes() {
    const [planes, setPlanes] = useState<Plan[]>([]);
    const [routers, setRouters] = useState<Router[]>([]);
    const [selectedRouter, setSelectedRouter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    
    // Estado para el Modal
    const [modalConfig, setModalConfig] = useState<{isOpen: boolean, plan?: Plan}>({
        isOpen: false,
        plan: undefined
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resRouters, resPlanes] = await Promise.all([
                client.get('/network/routers/'),
                selectedRouter === 'all' 
                    ? client.get('/planes/') 
                    : client.get(`/planes/router/${selectedRouter}`)
            ]);
            setRouters(resRouters.data);
            setPlanes(resPlanes.data);
        } catch (error) {
            toast.error("Error al sincronizar con el servidor");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [selectedRouter]);

    const handleDelete = async (id: number) => {
        if (!window.confirm("⚠️ ¿Estás seguro? Al eliminar este plan, se borrará el Perfil PPPoE asociado en el MikroTik.")) return;
        try {
            await client.delete(`/planes/${id}`);
            toast.success("Plan y Perfil MikroTik eliminados");
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error al eliminar");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20 font-sans">
            
            {/* HEADER PREMIUM */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 pb-2">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm flex items-center gap-3">
                        <SignalIcon className="w-8 h-8 text-blue-500" /> Planes de Internet
                    </h2>
                    <div className="flex items-center gap-3 mt-2 bg-slate-800/80 w-fit px-3 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-md shadow-sm">
                        <span className="text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
                            <CpuChipIcon className="w-3.5 h-3.5 text-blue-400"/> Sincronización PPPoE & Simple Queues
                        </span>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Selector de Nodos Moderno */}
                    <div className="relative w-full sm:w-auto flex items-center bg-slate-800 border border-slate-700 rounded-2xl shadow-lg focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all">
                        <FunnelIcon className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                        <select 
                            value={selectedRouter}
                            onChange={(e) => setSelectedRouter(e.target.value)}
                            className="bg-transparent text-slate-200 text-sm font-bold rounded-2xl pl-10 pr-10 py-3.5 outline-none w-full appearance-none cursor-pointer"
                        >
                            <option value="all">TODOS LOS NODOS</option>
                            {routers.map(r => <option key={r.id} value={r.id} className="bg-slate-800">{r.nombre.toUpperCase()}</option>)}
                        </select>
                        <div className="absolute right-4 pointer-events-none text-slate-500 text-xs">▼</div>
                    </div>

                    <button 
                        onClick={() => setModalConfig({ isOpen: true })}
                        className="w-full sm:w-auto group relative px-6 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all active:scale-95 border border-blue-400/30"
                    >
                        <div className="relative flex justify-center items-center gap-2 font-bold text-sm tracking-wide">
                            <PlusIcon className="w-5 h-5"/> <span className="inline">NUEVO PLAN</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* GRID DE PLANES */}
            {loading ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700/30 backdrop-blur-sm">
                    <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-500 mb-4 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">Sincronizando con MikroTik...</span>
                </div>
            ) : planes.length === 0 ? (
                <div className="py-32 text-center flex flex-col items-center justify-center bg-slate-800/30 rounded-3xl border border-slate-700/30 backdrop-blur-sm border-dashed">
                    <SignalIcon className="w-16 h-16 text-slate-600 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-1">Sin planes configurados</h3>
                    <span className="text-slate-500 text-sm">Crea tu primer plan para asignarlo a tus clientes PPPoE.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
                    {planes.map((plan) => {
                        const routerAsignado = routers.find(r => r.id === plan.router_id);
                        return (
                            <div key={plan.id} className="relative bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 p-1 hover:border-blue-500/50 transition-all duration-300 shadow-xl group overflow-hidden flex flex-col">
                                
                                {/* Decoración de fondo */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/10"></div>

                                <div className="p-5 flex-1 relative z-10 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
                                            <SignalIcon className="w-6 h-6" />
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[9px] text-slate-500 block uppercase font-black tracking-widest mb-0.5">Mensualidad</span>
                                            <span className="text-emerald-400 font-black text-2xl drop-shadow-sm">${plan.precio}</span>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-black text-white truncate mb-1">{plan.nombre}</h3>
                                    
                                    {/* BLOQUE DE VELOCIDAD (SIMPLE QUEUES) */}
                                    <div className="grid grid-cols-2 gap-3 my-5">
                                        {/* Bajada */}
                                        <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50 text-center shadow-inner group-hover:border-emerald-500/30 transition-colors">
                                            <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 uppercase font-black tracking-wider mb-1.5">
                                                <ArrowDownIcon className="w-3.5 h-3.5 text-emerald-400" /> DOWN
                                            </div>
                                            <p className="text-white font-black text-2xl tracking-tight">
                                                {Math.round((plan.velocidad_bajada || 0) / 1024)}<span className="text-sm text-slate-500 font-bold ml-0.5">M</span>
                                            </p>
                                        </div>
                                        {/* Subida */}
                                        <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-700/50 text-center shadow-inner group-hover:border-blue-500/30 transition-colors">
                                            <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 uppercase font-black tracking-wider mb-1.5">
                                                <ArrowUpIcon className="w-3.5 h-3.5 text-blue-400" /> UP
                                            </div>
                                            <p className="text-white font-black text-2xl tracking-tight">
                                                {Math.round((plan.velocidad_subida || 0) / 1024)}<span className="text-sm text-slate-500 font-bold ml-0.5">M</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-auto mb-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/50 w-fit">
                                        <ServerIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest truncate">
                                            {routerAsignado?.nombre || 'S/A'}
                                        </span>
                                    </div>
                                </div>

                                {/* ACCIONES */}
                                <div className="flex gap-2 p-2 pt-0 relative z-10">
                                    <button 
                                        onClick={() => setModalConfig({ isOpen: true, plan })}
                                        className="flex-1 bg-slate-700/50 hover:bg-blue-600 text-slate-300 hover:text-white py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs font-bold border border-slate-600 hover:border-blue-500 shadow-sm"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" /> <span className="hidden sm:inline">EDITAR</span>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(plan.id)}
                                        className="p-3 bg-slate-700/50 hover:bg-rose-600 text-slate-400 hover:text-white rounded-2xl transition-all border border-slate-600 hover:border-rose-500 shadow-sm group/trash"
                                        title="Eliminar Plan"
                                    >
                                        <TrashIcon className="w-5 h-5 group-hover/trash:animate-bounce" />
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
                onSuccess={fetchData}
                routers={routers}
            />
        </div>
    );
}