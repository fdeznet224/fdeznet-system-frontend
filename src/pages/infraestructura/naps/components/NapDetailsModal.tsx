import { useCallback, useEffect, useState } from 'react';
import client from '@/api/axios';
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
    const [selectedPortInfo, setSelectedPortInfo] = useState<{port: number, client: ClienteNAP | undefined} | null>(null);

    const fetchDetalles = useCallback(async () => {
        if (!napId) return;

        setLoading(true);
        try {
            const res = await client.get<ClienteNAP[]>(`/infraestructura/naps/${napId}/detalles`);
            setClientes(res.data || []);
        } catch {
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    }, [napId]);

    useEffect(() => {
        const syncTimer = window.setTimeout(() => {
            if (isOpen && napId) {
                void fetchDetalles();
                return;
            }

            setClientes([]);
            setSelectedPortInfo(null);
        }, 0);

        return () => window.clearTimeout(syncTimer);
    }, [fetchDetalles, isOpen, napId]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("SN Copiado");
    };

    const puertos = Array.from({ length: capacidad || 16 }, (_, i) => i + 1);

    if (!isOpen) return null;

    return (
        /* ✅ ADAPTADO: Backdrop y contenedor adaptativos */
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
            
            <div className="bg-white dark:bg-[#0b0c15] w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh] relative overflow-hidden transition-colors">
                
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#12121a] transition-colors">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 transition-colors">
                            <CubeIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-500"/>
                            {napNombre || 'Caja NAP'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono font-bold">
                            SC/APC Interface • {capacidad} Puertos
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                        <XMarkIcon className="w-5 h-5"/>
                    </button>
                </div>

                {/* Grid de Puertos */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#0f1016] p-6 relative transition-colors">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 text-indigo-500 animate-pulse">
                            <SignalIcon className="w-10 h-10"/>
                            <span className="mt-2 text-sm font-black uppercase tracking-widest">Escaneando...</span>
                        </div>
                    ) : (
                        <div className="flex justify-center">
                            <div className="grid grid-cols-4 gap-3 md:gap-4 w-full max-w-md">
                                {puertos.map((numPuerto) => {
                                    const ocupante = clientes.find(c => c.puerto_nap === numPuerto);
                                    
                                    // ✅ ADAPTADO: Estilos dinámicos
                                    const statusStyle = ocupante
                                        ? "border-rose-400 dark:border-rose-500/50 text-rose-600 dark:text-rose-500 bg-rose-50 dark:bg-rose-500/5 hover:bg-rose-100 dark:hover:bg-rose-500/10" 
                                        : "border-emerald-400 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-[#15161e] hover:bg-emerald-100 dark:hover:bg-emerald-500/10";

                                    return (
                                        <button
                                            key={numPuerto}
                                            onClick={() => setSelectedPortInfo({port: numPuerto, client: ocupante})}
                                            className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-95 ${statusStyle}`}
                                        >
                                            <span className="text-xl md:text-2xl font-black">{numPuerto}</span>
                                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest opacity-80">
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
                <div className="p-4 bg-slate-50 dark:bg-[#12121a] border-t border-slate-100 dark:border-white/5 flex justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors">
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Libre</span>
                    <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Ocupado</span>
                </div>
            </div>

            {/* MODAL DETALLE PUERTO */}
            {selectedPortInfo && (
                <div 
                    className="absolute inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedPortInfo(null)}
                >
                    <div 
                        className="bg-white dark:bg-[#181820] w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 relative transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button onClick={() => setSelectedPortInfo(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white"><XMarkIcon className="w-6 h-6"/></button>

                        <div className="flex items-center gap-4 mb-6">
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 text-2xl font-black ${selectedPortInfo.client ? 'border-rose-500 text-rose-600 dark:text-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'border-emerald-500 text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'}`}>
                                {selectedPortInfo.port}
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Estado</h4>
                                <h3 className={`text-xl font-black ${selectedPortInfo.client ? 'text-slate-900 dark:text-white' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {selectedPortInfo.client ? 'OCUPADO' : 'DISPONIBLE'}
                                </h3>
                            </div>
                        </div>

                        {selectedPortInfo.client ? (
                            <div className="space-y-4">
                                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                                    <div className="flex items-center gap-2 mb-1">
                                        <UserIcon className="w-4 h-4 text-slate-400"/>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Abonado</span>
                                    </div>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{selectedPortInfo.client.nombre}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5 cursor-pointer hover:border-indigo-500/50 transition" onClick={() => selectedPortInfo.client?.cedula && copyToClipboard(selectedPortInfo.client.cedula)}>
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="flex items-center gap-2">
                                            <LinkIcon className="w-4 h-4 text-slate-400"/>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Serial ONU</span>
                                        </div>
                                        <Square2StackIcon className="w-4 h-4 text-slate-500"/>
                                    </div>
                                    <p className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400 truncate">{selectedPortInfo.client.cedula || '---'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <WifiIcon className="w-12 h-12 text-emerald-500/50 mx-auto mb-3"/>
                                <p className="text-sm text-slate-600 dark:text-slate-300">Este puerto está libre físicamente.</p>
                                <button onClick={() => setSelectedPortInfo(null)} className="mt-6 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl transition uppercase tracking-widest text-xs">Entendido</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
