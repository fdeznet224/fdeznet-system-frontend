import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    MapPinIcon, PlusIcon, TrashIcon, 
    MapIcon, EyeIcon, PencilSquareIcon, FunnelIcon 
} from '@heroicons/react/24/outline';

import CreateNapModal from '../../components/modals/CreateNapModal';
import NapDetailsModal from '../../components/modals/NapDetailsModal'; 

interface CajaNap {
    id: number;
    nombre: string;
    ubicacion: string;
    capacidad: number;
    puertos_usados: number;
    puertos_libres: number;
    zona_id: number;
}
interface Zona { id: number; nombre: string; }

export default function CajasNap() {
    const [naps, setNaps] = useState<CajaNap[]>([]);
    const [zonas, setZonas] = useState<Zona[]>([]);
    const [selectedZona, setSelectedZona] = useState('all');
    const [loading, setLoading] = useState(true);
    
    const [modalConfig, setModalConfig] = useState<{isOpen: boolean, nap?: CajaNap}>({
        isOpen: false, 
        nap: undefined
    });

    const [detailsModal, setDetailsModal] = useState<{isOpen: boolean, nap?: CajaNap}>({
        isOpen: false,
        nap: undefined
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const resZonas = await client.get('/zonas'); 
            setZonas(resZonas.data);
            
            let url = '/infraestructura/naps';
            if (selectedZona !== 'all') url += `?zona_id=${selectedZona}`;
            const resNaps = await client.get(url);
            setNaps(resNaps.data);
        } catch { 
            toast.error("Error cargando inventario"); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [selectedZona]);

    const handleDelete = async (id: number) => {
        if(!confirm("¿Estás seguro de eliminar esta NAP?")) return;
        try { 
            await client.delete(`/infraestructura/naps/${id}`); 
            toast.success("NAP eliminada");
            fetchData(); 
        } catch(e: any) { 
            toast.error(e.response?.data?.detail || "Error al eliminar"); 
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-800 dark:text-slate-200 pb-12 transition-colors duration-300">
            
            {/* =========================================================
                HEADER RESPONSIVO Y FILTROS COMPACTOS INLINE
               ========================================================= */}
            <div className="flex justify-between items-center px-1 md:px-0 flex-none gap-2 pb-2">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">
                        Cajas NAP (FTTH)
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 hidden sm:block">Gestión de puertos y ONUs en campo.</p>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                    
                    {/* Selector Micro-Compacto de Zona (ADAPTATIVO) */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 flex items-center gap-1 shadow-sm transition-colors">
                        <FunnelIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 md:hidden" />
                        <MapIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 hidden md:block" />
                        <select 
                            value={selectedZona} 
                            onChange={(e) => setSelectedZona(e.target.value)} 
                            className="bg-transparent text-slate-700 dark:text-slate-300 font-bold outline-none text-xs cursor-pointer appearance-none"
                        >
                            <option value="all" className="bg-white dark:bg-slate-950">Todas las Zonas</option>
                            {zonas.map(z => <option key={z.id} value={z.id} className="bg-white dark:bg-slate-950">{z.nombre}</option>)}
                        </select>
                    </div>

                    <button 
                        onClick={() => setModalConfig({isOpen: true})} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-2 md:px-4 md:py-2.5 rounded-xl font-black shadow-md active:scale-95 transition flex items-center justify-center gap-1 text-[10px] md:text-sm tracking-wide uppercase md:normal-case"
                    >
                        <PlusIcon className="w-4 h-4 md:w-5 md:h-5"/> 
                        <span>Nueva NAP</span>
                    </button>
                </div>
            </div>

            {/* =========================================================
                GRID DE CAJAS DISPONIBLES (ADAPTATIVO)
               ========================================================= */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 flex-1">
                {loading ? (
                    <div className="col-span-full text-center py-20 text-slate-400 dark:text-slate-500 text-xs uppercase font-black tracking-widest animate-pulse">Cargando puertos FTTH...</div>
                ) : naps.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-slate-400 dark:text-slate-500 text-xs italic">No hay cajas NAP registradas.</div>
                ) : (
                    naps.map(nap => {
                        const porcentaje = (nap.puertos_usados / nap.capacidad) * 100;
                        const zonaNombre = zonas.find(z => z.id === nap.zona_id)?.nombre || 'Zona desconocida';

                        return (
                            /* ✅ ADAPTADO: Tarjetas blancas en light mode, slate en dark */
                            <div key={nap.id} className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm dark:shadow-xl relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col gap-3">
                                <div className={`absolute top-0 left-0 right-0 h-1 ${nap.puertos_libres === 0 ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                                
                                <div className="flex justify-between items-start mt-1">
                                    <div className="overflow-hidden">
                                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{zonaNombre}</span>
                                        <h3 className="text-base font-black text-slate-800 dark:text-white truncate max-w-[160px] sm:max-w-[200px] mt-0.5" title={nap.nombre}>{nap.nombre}</h3>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 truncate">
                                            <MapPinIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500"/> {nap.ubicacion}
                                        </p>
                                    </div>
                                    <div className="text-right bg-slate-50 dark:bg-slate-950/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800/80 shrink-0">
                                        <span className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Ocupación</span>
                                        <div className="text-lg font-black text-slate-800 dark:text-white leading-none mt-0.5">
                                            {nap.puertos_usados}<span className="text-xs text-slate-400 dark:text-slate-600 font-bold">/{nap.capacidad}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-950">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${nap.puertos_libres === 0 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                                        style={{ width: `${porcentaje}%` }}
                                    ></div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex gap-2 mt-auto">
                                    <button 
                                        onClick={() => setDetailsModal({isOpen: true, nap})}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-300 hover:text-white bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-600 py-2 rounded-xl border border-indigo-100 dark:border-indigo-500/10 transition group/btn uppercase tracking-wide"
                                    >
                                        <EyeIcon className="w-4 h-4"/> Ver Puertos
                                    </button>
                                    
                                    <button 
                                        onClick={() => setModalConfig({isOpen: true, nap})}
                                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition active:scale-90"
                                    >
                                        <PencilSquareIcon className="w-4 h-4"/>
                                    </button>

                                    <button 
                                        onClick={() => handleDelete(nap.id)} 
                                        className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition active:scale-90"
                                    >
                                        <TrashIcon className="w-4 h-4"/>
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <CreateNapModal 
                isOpen={modalConfig.isOpen} 
                onClose={() => setModalConfig({isOpen: false, nap: undefined})} 
                onSuccess={fetchData} 
                zonas={zonas}
                napToEdit={modalConfig.nap}
            />

            <NapDetailsModal 
                isOpen={detailsModal.isOpen} 
                onClose={() => setDetailsModal({isOpen: false, nap: undefined})}
                napId={detailsModal.nap?.id || null}
                napNombre={detailsModal.nap?.nombre || ''}
                capacidad={detailsModal.nap?.capacidad || 16}
            />
        </div>
    );
}