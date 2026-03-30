import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    CubeIcon, MapPinIcon, PlusIcon, TrashIcon, 
    MapIcon, EyeIcon, PencilSquareIcon 
} from '@heroicons/react/24/outline';

// Importaciones Correctas
import CreateNapModal from '../../components/modals/CreateNapModal';
import NapDetailsModal from '../../components/modals/NapDetailsModal'; // ✅ CORREGIDO

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
    
    // Estado del Modal CREAR/EDITAR
    const [modalConfig, setModalConfig] = useState<{isOpen: boolean, nap?: CajaNap}>({
        isOpen: false, 
        nap: undefined
    });

    // Estado del Modal VISUAL (Diagrama)
    const [detailsModal, setDetailsModal] = useState<{isOpen: boolean, nap?: CajaNap}>({
        isOpen: false,
        nap: undefined
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Asegúrate que la ruta sea correcta según tu backend (/configuracion/zonas o /zonas/)
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
        <div className="space-y-6 animate-in fade-in pb-24 p-4 md:p-0">
            {/* Header y Filtros */}
            <div className="flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                        <CubeIcon className="w-8 h-8 text-emerald-500" /> Cajas NAP (FTTH)
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Gestión de puertos y ONUs en campo.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Filtro Zona */}
                    <div className="relative">
                        <MapIcon className="w-5 h-5 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
                        <select 
                            value={selectedZona} onChange={(e) => setSelectedZona(e.target.value)} 
                            className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-emerald-500 appearance-none cursor-pointer hover:bg-slate-700 transition"
                        >
                            <option value="all">Todas las Zonas</option>
                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                        </select>
                    </div>

                    {/* Botón Nueva NAP */}
                    <button 
                        onClick={() => setModalConfig({isOpen: true})} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl flex gap-2 items-center justify-center font-bold shadow-lg shadow-emerald-600/20 active:scale-95 transition"
                    >
                        <PlusIcon className="w-5 h-5"/> <span className="hidden sm:inline">Nueva NAP</span>
                    </button>
                </div>
            </div>

            {/* Grid de Cajas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-20 text-slate-500">Cargando inventario...</div>
                ) : naps.map(nap => {
                    const porcentaje = (nap.puertos_usados / nap.capacidad) * 100;
                    const zonaNombre = zonas.find(z => z.id === nap.zona_id)?.nombre || 'Zona desconocida';

                    return (
                        <div key={nap.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-5 shadow-xl relative overflow-hidden group hover:border-slate-600 transition-colors">
                            {/* Barra estado superior */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${nap.puertos_libres === 0 ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
                            
                            {/* Info Principal */}
                            <div className="flex justify-between mt-2 mb-4">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 block">{zonaNombre}</span>
                                    <h3 className="text-lg font-bold text-white truncate w-40 sm:w-auto" title={nap.nombre}>{nap.nombre}</h3>
                                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 truncate">
                                        <MapPinIcon className="w-3 h-3"/> {nap.ubicacion}
                                    </p>
                                </div>
                                <div className="text-right bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase block">Ocupación</span>
                                    <div className="text-xl font-black text-white leading-none">
                                        {nap.puertos_usados}<span className="text-sm text-slate-600 font-medium">/{nap.capacidad}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Barra de Progreso Visual */}
                            <div className="w-full bg-slate-700/50 rounded-full h-2 mb-4 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${nap.puertos_libres === 0 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                                    style={{ width: `${porcentaje}%` }}
                                ></div>
                            </div>

                            {/* Botones de Acción */}
                            <div className="pt-4 border-t border-slate-700/50 flex gap-2">
                                {/* Ver Diagrama (Visual) */}
                                <button 
                                    onClick={() => setDetailsModal({isOpen: true, nap})}
                                    className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 py-2.5 rounded-xl border border-indigo-500/20 transition group/btn"
                                >
                                    <EyeIcon className="w-4 h-4 group-hover/btn:scale-110 transition-transform"/> Ver Puertos
                                </button>
                                
                                {/* Editar */}
                                <button 
                                    onClick={() => setModalConfig({isOpen: true, nap})}
                                    className="p-2.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-blue-600 rounded-xl transition"
                                    title="Editar datos"
                                >
                                    <PencilSquareIcon className="w-4 h-4"/>
                                </button>

                                {/* Eliminar */}
                                <button 
                                    onClick={() => handleDelete(nap.id)} 
                                    className="p-2.5 text-slate-400 hover:text-white bg-slate-700/50 hover:bg-rose-600 rounded-xl transition"
                                    title="Eliminar NAP"
                                >
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal CREAR / EDITAR */}
            <CreateNapModal 
                isOpen={modalConfig.isOpen} 
                onClose={() => setModalConfig({isOpen: false, nap: undefined})} 
                onSuccess={fetchData} 
                zonas={zonas}
                napToEdit={modalConfig.nap}
            />

            {/* Modal VISUAL (Diagrama de puertos) */}
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