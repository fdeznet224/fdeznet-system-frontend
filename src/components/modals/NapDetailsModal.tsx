import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    XMarkIcon, CubeIcon, UserIcon, 
    LinkIcon, Square2StackIcon,
    SignalIcon, WifiIcon
} from '@heroicons/react/24/outline';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    napId: number | null;
    napNombre: string;
    capacidad: number;
}

interface ClienteNAP {
    id: number;
    nombre: string;
    puerto_nap: number;
    cedula?: string;
}

export default function NapDetailsModal({ isOpen, onClose, napId, napNombre, capacidad }: Props) {
    const [clientes, setClientes] = useState<ClienteNAP[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Estado para el Modal de Detalle (Tarjeta Central)
    const [selectedPortInfo, setSelectedPortInfo] = useState<{port: number, client: ClienteNAP | undefined} | null>(null);

    useEffect(() => {
        if (isOpen && napId) {
            fetchDetalles();
        } else {
            setClientes([]);
            setSelectedPortInfo(null);
        }
    }, [isOpen, napId]);

    const fetchDetalles = async () => {
        setLoading(true);
        try {
            const res = await client.get(`/infraestructura/naps/${napId}/detalles`);
            setClientes(res.data || []);
        } catch {
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("SN Copiado");
    };

    const puertos = Array.from({ length: capacidad || 16 }, (_, i) => i + 1);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
            
            {/* === CONTENEDOR PRINCIPAL DE LA CAJA === */}
            <div className="bg-[#0b0c15] w-full max-w-2xl rounded-3xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] relative overflow-hidden">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-white/5 bg-[#12121a]">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <CubeIcon className="w-6 h-6 text-indigo-500"/>
                            {napNombre || 'Caja NAP'}
                        </h2>
                        <p className="text-xs text-slate-400 mt-1 font-mono">
                            SC/APC Interface • {capacidad} Puertos
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-800/50 rounded-full text-slate-400 hover:text-white transition active:scale-95">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                </div>

                {/* Grid de Puertos (Scrollable) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0f1016] p-6 relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-indigo-500 animate-pulse">
                            <SignalIcon className="w-10 h-10"/>
                            <span className="mt-2 text-sm">Escaneando...</span>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            {/* GRID: 4 Columnas, Gap Pequeño (3) */}
                            <div className="grid grid-cols-4 gap-3 md:gap-4 w-full max-w-md">
                                {puertos.map((numPuerto) => {
                                    const ocupante = clientes.find(c => c.puerto_nap === numPuerto);
                                    
                                    // Estilos según estado
                                    const statusStyle = ocupante
                                        ? "border-rose-500/50 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.15)]" // Ocupado
                                        : "border-emerald-500/30 text-emerald-500 bg-[#15161e] hover:bg-emerald-500/10 hover:border-emerald-500"; // Libre

                                    return (
                                        <button
                                            key={numPuerto}
                                            onClick={() => setSelectedPortInfo({port: numPuerto, client: ocupante})}
                                            className={`
                                                aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95
                                                ${statusStyle}
                                            `}
                                        >
                                            <span className="text-xl md:text-2xl font-bold">{numPuerto}</span>
                                            <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest opacity-80">
                                                {ocupante ? 'OCUPADO' : 'LIBRE'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Legend */}
                <div className="p-4 bg-[#12121a] border-t border-white/5 flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span> Libre
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.5)]"></span> Ocupado
                    </span>
                </div>
            </div>

            {/* === MODAL DE DETALLE (TARJETA CENTRAL) === */}
            {/* Se muestra SOLO si hay un puerto seleccionado */}
            {selectedPortInfo && (
                <div 
                    className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-[3px] animate-in fade-in duration-200"
                    onClick={() => setSelectedPortInfo(null)} // Click afuera cierra
                >
                    <div 
                        className="bg-[#181820] w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl p-6 relative animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()} // Click adentro no cierra
                    >
                        {/* Botón Cerrar Tarjeta */}
                        <button 
                            onClick={() => setSelectedPortInfo(null)}
                            className="absolute top-4 right-4 text-slate-500 hover:text-white"
                        >
                            <XMarkIcon className="w-6 h-6"/>
                        </button>

                        {/* Encabezado Tarjeta */}
                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 text-2xl font-black ${selectedPortInfo.client ? 'border-rose-500 text-rose-500 bg-rose-500/10' : 'border-emerald-500 text-emerald-500 bg-emerald-500/10'}`}>
                                {selectedPortInfo.port}
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase">Estado del Puerto</h4>
                                <h3 className={`text-xl font-bold ${selectedPortInfo.client ? 'text-white' : 'text-emerald-400'}`}>
                                    {selectedPortInfo.client ? 'OCUPADO' : 'DISPONIBLE'}
                                </h3>
                            </div>
                        </div>

                        {/* Contenido Dinámico */}
                        {selectedPortInfo.client ? (
                            <div className="space-y-4">
                                {/* Cliente */}
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <UserIcon className="w-4 h-4 text-slate-500"/>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Abonado</span>
                                    </div>
                                    <p className="text-lg font-bold text-white leading-tight">
                                        {selectedPortInfo.client.nombre}
                                    </p>
                                </div>

                                {/* SN ONU (Copiable) */}
                                <div 
                                    onClick={() => selectedPortInfo.client?.cedula && copyToClipboard(selectedPortInfo.client.cedula)}
                                    className="bg-black/20 p-4 rounded-xl border border-white/5 hover:border-indigo-500/50 cursor-pointer transition group"
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <LinkIcon className="w-4 h-4 text-slate-500"/>
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Serial ONU</span>
                                        </div>
                                        <Square2StackIcon className="w-4 h-4 text-slate-600 group-hover:text-white"/>
                                    </div>
                                    <p className="text-sm font-mono font-bold text-indigo-400 truncate">
                                        {selectedPortInfo.client.cedula || '---'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <WifiIcon className="w-12 h-12 text-emerald-500/50 mx-auto mb-3"/>
                                <p className="text-sm text-slate-300">
                                    Este puerto está libre físicamente. Puedes asignar un nuevo cliente aquí.
                                </p>
                                <button 
                                    onClick={() => setSelectedPortInfo(null)}
                                    className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition"
                                >
                                    Entendido
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}