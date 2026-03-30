import { useState, useEffect } from 'react';
import client from '../api/axios';
import { toast } from 'react-hot-toast';
import { 
    GlobeAltIcon, 
    PlusIcon, 
    ArrowPathIcon, 
    ServerIcon, 
    TrashIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    CpuChipIcon
} from '@heroicons/react/24/outline';
import CreateRedModal from '../components/modals/CreateRedModal';
import type { Router } from '../types'; 

// Interfaz local para Red (o impórtala de types si ya la tienes global)
interface RedIP {
    id: number;
    router_id: number;
    nombre: string;
    cidr: string;
    gateway: string;
}

export default function RedesIP() {
    const [redes, setRedes] = useState<RedIP[]>([]);
    const [routers, setRouters] = useState<Router[]>([]);
    const [selectedRouter, setSelectedRouter] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    
    // Estado del Modal (Crear o Editar)
    const [modalConfig, setModalConfig] = useState<{isOpen: boolean, red?: RedIP}>({
        isOpen: false,
        red: undefined
    });
    
    // Estado para "Testing IP"
    const [testingId, setTestingId] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Routers
            const resRouters = await client.get('/network/routers/');
            setRouters(resRouters.data);

            // 2. Redes
            let url = '/network/redes/';
            if (selectedRouter !== 'all') {
                url = `/network/redes/router/${selectedRouter}`;
            }
            const resRedes = await client.get(url);
            setRedes(resRedes.data);
            
        } catch (error) {
            toast.error("Error al cargar topología de red");
        } finally {
            setLoading(false);
        }
    };

    // Calcular siguiente IP libre (Diagnóstico)
    const handleCheckFreeIP = async (redId: number) => {
        setTestingId(redId);
        try {
            // Este endpoint ya lo tienes definido en network.py
            const { data } = await client.get(`/network/redes/${redId}/ips-libres`);
            // data es un array de strings, tomamos la primera
            if (data && data.length > 0) {
                toast.success(`Siguiente IP disponible: ${data[0]}`, {
                    icon: '📍',
                    duration: 5000
                });
            } else {
                toast.error("Esta red parece estar llena (0 IPs libres)");
            }
        } catch (error: any) {
            toast.error("Error calculando IPs libres");
        } finally {
            setTestingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if(!window.confirm("¿Seguro que deseas eliminar esta red? No podrás asignar nuevas IPs de este rango.")) return;
        try {
            await client.delete(`/network/redes/${id}`);
            toast.success("Red eliminada correctamente"); 
            fetchData();
        } catch (e: any) {
            toast.error(e.response?.data?.detail || "Error al eliminar");
        }
    };

    useEffect(() => { fetchData(); }, [selectedRouter]);

    return (
        <div className="space-y-6 p-4 md:p-0 animate-in fade-in duration-500 pb-24">
            
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <GlobeAltIcon className="w-8 h-8 text-emerald-500" /> 
                        Gestión de Redes (IPAM)
                    </h2>
                    <p className="text-slate-400 mt-1 text-sm sm:text-base">Segmentos de red y pools de IPs para clientes.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Filtro Router */}
                    <div className="relative">
                        <CpuChipIcon className="w-5 h-5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <select 
                            value={selectedRouter}
                            onChange={(e) => setSelectedRouter(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-blue-500 transition cursor-pointer hover:bg-slate-750 appearance-none"
                        >
                            <option value="all">Todos los Nodos</option>
                            {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                    </div>

                    {/* Botón Nueva Red */}
                    <button 
                        onClick={() => setModalConfig({ isOpen: true })}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 whitespace-nowrap"
                    >
                        <PlusIcon className="w-5 h-5" /> Nueva Red
                    </button>
                </div>
            </div>

            {/* TABLA DE REDES */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-widest border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4 font-bold">Nombre del Segmento</th>
                                <th className="px-6 py-4 font-bold">Rango CIDR</th>
                                <th className="px-6 py-4 font-bold">Gateway (Puerta de Enlace)</th>
                                <th className="px-6 py-4 font-bold">Nodo Asignado</th>
                                <th className="px-6 py-4 text-center font-bold">IPs Disponibles</th>
                                <th className="px-6 py-4 text-right font-bold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <ArrowPathIcon className="w-8 h-8 animate-spin text-emerald-500" />
                                            <span className="text-slate-500 text-sm">Escaneando topología...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : redes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <GlobeAltIcon className="w-12 h-12 text-slate-600 opacity-50" />
                                            <p>No hay redes configuradas.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                redes.map((red) => {
                                    const routerAsignado = routers.find(r => r.id === red.router_id);
                                    return (
                                        <tr key={red.id} className="hover:bg-slate-700/30 transition-colors group">
                                            
                                            {/* Nombre */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white text-base">{red.nombre}</div>
                                            </td>

                                            {/* CIDR */}
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20 inline-block">
                                                    {red.cidr}
                                                </span>
                                            </td>

                                            {/* Gateway */}
                                            <td className="px-6 py-4">
                                                <div className="text-slate-300 font-mono text-sm bg-slate-900/50 px-2 py-1 rounded w-fit border border-slate-700 flex items-center gap-2">
                                                    <ServerIcon className="w-3 h-3 text-slate-500" />
                                                    {red.gateway || '---'}
                                                </div>
                                            </td>

                                            {/* Router */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-300 text-sm">
                                                    <div className={`w-2 h-2 rounded-full ${routerAsignado ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                    {routerAsignado?.nombre || <span className="text-rose-400 italic">No encontrado</span>}
                                                </div>
                                            </td>

                                            {/* Diagnóstico IP */}
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleCheckFreeIP(red.id)}
                                                    disabled={testingId === red.id}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all active:scale-95 disabled:opacity-50 group/btn"
                                                    title="Calcular siguiente IP libre"
                                                >
                                                    {testingId === red.id ? (
                                                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <MagnifyingGlassIcon className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                                    )}
                                                    {testingId === red.id ? 'Calculando...' : 'Verificar'}
                                                </button>
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => setModalConfig({ isOpen: true, red })}
                                                        className="p-2 bg-slate-700 hover:bg-blue-600 text-white rounded-lg transition-colors"
                                                        title="Editar Red"
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(red.id)}
                                                        className="p-2 bg-slate-700 hover:bg-rose-600 text-white rounded-lg transition-colors"
                                                        title="Eliminar Red"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
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

            {/* MODAL REUTILIZABLE (Crear/Editar) */}
            <CreateRedModal 
                isOpen={modalConfig.isOpen} 
                redToEdit={modalConfig.red} // Asegúrate de actualizar tu Modal para recibir esto
                onClose={() => setModalConfig({ isOpen: false, red: undefined })} 
                onSuccess={fetchData}
                routers={routers}
            />
        </div>
    );
}