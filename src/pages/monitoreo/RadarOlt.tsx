import React, { useState, useEffect, useMemo } from 'react';
import client from '../../api/axios'; 
import { toast } from 'react-hot-toast';
import { 
    ArrowPathIcon, PlusIcon, ChevronDownIcon,
    MagnifyingGlassIcon, PencilSquareIcon, 
    TrashIcon, XMarkIcon,
    SignalIcon, ServerIcon,
} from '@heroicons/react/24/outline';

let cacheRadar: { [oltId: number]: { data: any, timestamp: Date } } = {};

export default function RadarOlt() { 
    const [oltsDisponibles, setOltsDisponibles] = useState<any[]>([]);
    const [oltSeleccionada, setOltSeleccionada] = useState<number | "">("");

    const [datosRadar, setDatosRadar] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [filtroActivo, setFiltroActivo] = useState<string>('todos'); 

    const [showAdminModal, setShowAdminModal] = useState(false);
    const [oltEnEdicion, setOltEnEdicion] = useState<any>(null); 

    const fetchOlts = async () => {
        try {
            const res = await client.get('/olts/');
            setOltsDisponibles(res.data);
            if (res.data.length > 0 && !oltSeleccionada) {
                setOltSeleccionada(res.data[0].id);
            }
        } catch (err) {
            toast.error("Error cargando OLTs");
        }
    };

    useEffect(() => { fetchOlts(); }, []);

    const escanearOlt = async (silencioso = false, forzar = false) => {
        if (!oltSeleccionada) return;

        if (!forzar && cacheRadar[oltSeleccionada as number]) {
            const cache = cacheRadar[oltSeleccionada as number];
            const segundosEdad = (new Date().getTime() - cache.timestamp.getTime()) / 1000;
            
            if (segundosEdad < 60) {
                setDatosRadar(cache.data);
                setUltimaActualizacion(cache.timestamp);
                return;
            }
        }

        if (!silencioso) setLoading(true);
        
        try {
            const res = await client.get(`/olts/${oltSeleccionada}/monitoreo-vivo`);
            const now = new Date();
            
            setDatosRadar(res.data.data);
            setUltimaActualizacion(now);
            
            cacheRadar[oltSeleccionada as number] = { data: res.data.data, timestamp: now };
            if (!silencioso) toast.success("Escaneo óptico completado");
        } catch (error) {
            if (!silencioso) toast.error("Error de conexión con OLT");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (oltSeleccionada) {
            if (!cacheRadar[oltSeleccionada as number]) setDatosRadar(null); 
            setFiltroActivo('todos');
            escanearOlt(false, false); 
            const intervalo = setInterval(() => escanearOlt(true, true), 60000); 
            return () => clearInterval(intervalo);
        }
    }, [oltSeleccionada]);

    const { tablaUnificada, contadores, totalRegistros } = useMemo(() => {
        if (!datosRadar) return { tablaUnificada: [], contadores: { optima: 0, alerta: 0, offline: 0, intrusos: 0 }, totalRegistros: 0 };

        let todos: any[] = [];
        let c_optima = 0, c_alerta = 0, c_offline = 0, c_intrusos = 0;

        datosRadar.clientes_activos?.forEach((c: any) => {
            const potencia = parseFloat(c.rx_power);
            if (!isNaN(potencia) && potencia <= -25) {
                todos.push({ ...c, nivel: 'alerta' });
                c_alerta++;
            } else {
                todos.push({ ...c, nivel: 'optima' });
                c_optima++;
            }
        });

        datosRadar.clientes_caidos?.forEach((c: any) => {
            todos.push({ ...c, nivel: 'offline', rx_power: 'LOS' });
            c_offline++;
        });

        datosRadar.onus_desconocidas?.forEach((c: any) => {
            todos.push({ ...c, nombre: '⚠️ Desconocido / No Registrado', nivel: 'intruso' });
            c_intrusos++;
        });

        const totalOriginal = todos.length;
        if (filtroActivo !== 'todos') todos = todos.filter(t => t.nivel === filtroActivo);
        if (busqueda) {
            const q = busqueda.toLowerCase();
            todos = todos.filter(t => t.nombre?.toLowerCase().includes(q) || t.identificador?.toLowerCase().includes(q));
        }

        todos.sort((a, b) => {
            const prioridad: any = { 'offline': 1, 'intruso': 2, 'alerta': 3, 'optima': 4 };
            return prioridad[a.nivel] - prioridad[b.nivel];
        });

        return { tablaUnificada: todos, contadores: { optima: c_optima, alerta: c_alerta, offline: c_offline, intrusos: c_intrusos }, totalRegistros: totalOriginal };
    }, [datosRadar, busqueda, filtroActivo]);

    const handleDeleteOlt = async (id: number) => {
        if (!confirm("¿Eliminar esta OLT de FdezNet?")) return;
        try {
            await client.delete(`/olts/${id}`);
            toast.success("OLT eliminada");
            delete cacheRadar[id];
            fetchOlts();
            setOltSeleccionada("");
            setDatosRadar(null);
        } catch (error) { toast.error("Error al eliminar"); }
    };

    return (
        /* ✅ ADAPTADO: Fondo que transiciona entre modo claro y oscuro */
        <div className="p-4 md:p-6 max-w-[1400px] mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-700 dark:text-slate-200 pb-12 transition-colors duration-300">
            
            {/* HEADER RESPONSIVO ADAPTATIVO */}
            <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 md:p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center shadow-sm dark:shadow-2xl gap-4 flex-none transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight whitespace-nowrap transition-colors">Radar Óptico FdezNet</h1>
                    
                    <div className="flex items-center gap-1.5 w-full sm:w-auto mt-0.5">
                        <div className="relative bg-slate-100 dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700/60 rounded-xl px-2.5 py-2 flex items-center shadow-inner max-w-[150px] sm:max-w-none transition-colors">
                            <select 
                                className="bg-transparent text-blue-600 dark:text-blue-400 font-black outline-none text-[10px] cursor-pointer appearance-none pr-5 truncate"
                                value={oltSeleccionada}
                                onChange={(e) => setOltSeleccionada(Number(e.target.value))}
                            >
                                <option value="" disabled>OLT...</option>
                                {oltsDisponibles.map(o => <option key={o.id} value={o.id} className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white">{o.nombre}</option>)}
                            </select>
                            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none"/>
                        </div>
                        
                        <button onClick={() => { setOltEnEdicion(null); setShowAdminModal(true); }} className="p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl transition active:scale-90" title="Registrar OLT"><PlusIcon className="w-4 h-4" /></button>
                        {oltSeleccionada && (
                            <>
                                <button onClick={() => { setOltEnEdicion(oltsDisponibles.find(o => o.id === oltSeleccionada)); setShowAdminModal(true); }} className="p-2 bg-blue-50 dark:bg-blue-600/10 border border-blue-100 dark:border-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl transition active:scale-90"><PencilSquareIcon className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteOlt(oltSeleccionada as number)} className="p-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/10 text-rose-600 dark:text-rose-500 rounded-xl transition active:scale-90"><TrashIcon className="w-4 h-4" /></button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto border-t border-slate-100 dark:border-slate-800/60 pt-3 lg:pt-0">
                    {ultimaActualizacion && <p className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Scanner: {ultimaActualizacion.toLocaleTimeString()}</p>}
                    <button 
                        onClick={() => escanearOlt(false, true)} 
                        disabled={loading || !oltSeleccionada}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all text-[10px] active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                    >
                        <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>{loading ? 'Escaneando...' : 'Actualizar Radar'}</span>
                    </button>
                </div>
            </div>

            {/* ESTADO DE CARGA */}
            {!datosRadar && loading && (
                <div className="flex flex-col items-center justify-center h-64 space-y-3 bg-white dark:bg-[#12131a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex-1">
                    <SignalIcon className="w-12 h-12 text-blue-500 animate-pulse" />
                    <p className="text-blue-600 dark:text-blue-400 font-black tracking-widest uppercase text-xs">Analizando Potencias FTTH...</p>
                </div>
            )}

            {/* RESULTADOS */}
            {datosRadar && (
                <div className="space-y-4 md:space-y-6 flex-1 flex flex-col animate-in fade-in duration-300">
                    <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:pb-0 scrollbar-none flex-none">
                        <KpiCard titulo="Señal Óptima" valor={contadores.optima} total={totalRegistros} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" borde="border-emerald-500/20" isActive={filtroActivo === 'optima'} onClick={() => setFiltroActivo(prev => prev === 'optima' ? 'todos' : 'optima')} />
                        <KpiCard titulo="Atenuación" valor={contadores.alerta} total={totalRegistros} color="text-amber-600 dark:text-amber-400" bg="bg-amber-500/10" borde="border-amber-500/20" isActive={filtroActivo === 'alerta'} onClick={() => setFiltroActivo(prev => prev === 'alerta' ? 'todos' : 'alerta')} />
                        <KpiCard titulo="Apagados" valor={contadores.offline} total={totalRegistros} color="text-rose-600 dark:text-rose-400" bg="bg-rose-500/10" borde="border-rose-500/20" isActive={filtroActivo === 'offline'} onClick={() => setFiltroActivo(prev => prev === 'offline' ? 'todos' : 'offline')} />
                        <KpiCard titulo="Intrusos" valor={contadores.intrusos} total={totalRegistros} color="text-purple-600 dark:text-purple-400" bg="bg-purple-500/10" borde="border-purple-500/20" isActive={filtroActivo === 'intruso'} onClick={() => setFiltroActivo(prev => prev === 'intruso' ? 'todos' : 'intruso')} />
                    </div>

                    <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-2xl overflow-hidden flex flex-col flex-1 transition-colors">
                        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-[#16171d] flex flex-col sm:flex-row justify-between items-center gap-3 flex-none transition-colors">
                            <h2 className="text-[10px] font-black text-slate-500 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                <ServerIcon className="w-4 h-4 text-slate-400"/> Equipos en {datosRadar.olt_nombre} ({tablaUnificada.length})
                            </h2>
                            <div className="relative w-full sm:w-64">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input type="text" placeholder="Buscar cliente..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-slate-100 dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700/50 rounded-lg py-1.5 pl-9 pr-4 text-[10px] text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                        </div>

                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left whitespace-nowrap text-xs">
                                <thead className="bg-slate-50 dark:bg-[#0b0c10] text-slate-500 text-[9px] uppercase font-black tracking-widest border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm transition-colors">
                                    <tr><th className="px-6 py-3.5">Cliente Asignado</th><th className="px-6 py-3.5">Hardware (MAC/SN)</th><th className="px-6 py-3.5">Potencia Óptica (Rx)</th><th className="px-6 py-3.5 text-center">Estado</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                    {tablaUnificada.map((cliente: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${cliente.nivel === 'intruso' ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-300'}`}>
                                                        {cliente.nombre?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-xs ${cliente.nivel === 'intruso' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-800 dark:text-slate-200'}`}>{cliente.nombre}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">ID: {cliente.id_cliente || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 font-mono text-[11px] font-black text-blue-600 dark:text-blue-300 tracking-wide">{cliente.identificador}</td>
                                            <td className="px-6 py-3.5 font-mono text-xs font-black text-slate-700 dark:text-slate-200 transition-colors">{cliente.rx_power} <span className="text-[9px] font-bold text-slate-400">dBm</span></td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className={`text-[8px] font-black uppercase px-2.5 py-0.5 rounded border tracking-wider ${getBadgeStyle(cliente.nivel)}`}>{cliente.nivel}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {showAdminModal && (
                <OltFormModal 
                    olt={oltEnEdicion} 
                    onClose={() => setShowAdminModal(false)} 
                    onSuccess={() => { fetchOlts(); setShowAdminModal(false); }} 
                />
            )}
        </div>
    );
}

// Subcomponentes auxiliares con colores adaptativos...
const KpiCard = ({ titulo, valor, total, color, bg, borde, onClick, isActive }: any) => (
    <div onClick={onClick} className={`p-4 rounded-xl border cursor-pointer transition-all shrink-0 min-w-[125px] md:min-w-0 flex-1 ${isActive ? `ring-1 ring-blue-500 shadow-md ${bg} ${color} ${borde}` : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16171d] hover:bg-slate-50 dark:hover:bg-[#1a1c23]'}`}>
        <p className="text-[9px] font-black uppercase tracking-wider mb-1 text-slate-500">{titulo}</p>
        <div className="flex justify-between items-end">
            <p className={`text-2xl font-black ${isActive ? color : 'text-slate-800 dark:text-slate-200'}`}>{valor}</p>
            <p className="text-[8px] font-extrabold text-slate-400 bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 rounded font-mono">{total > 0 ? Math.round((valor/total)*100) : 0}%</p>
        </div>
    </div>
);

const getBadgeStyle = (nivel: string) => {
    switch(nivel) {
        case 'optima': return 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
        case 'alerta': return 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
        case 'offline': return 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
        case 'intruso': return 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20';
        default: return 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700';
    }
};

function OltFormModal({ olt, onClose, onSuccess }: any) {
    const [formData, setFormData] = useState({
        nombre: olt?.nombre || '', ip: olt?.ip || '', comunidad: olt?.comunidad || 'public',
        tecnologia: olt?.tecnologia || 'GPON', modelo: olt?.modelo || 'V-SOL'
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (olt) await client.put(`/olts/${olt.id}`, formData);
            else await client.post('/olts/', formData);
            toast.success("OLT Guardada");
            onSuccess();
        } catch (error) { toast.error("Error al guardar OLT"); } 
        finally { setSaving(false); }
    };

    const inputCls = "w-full bg-slate-50 dark:bg-[#0b0c10] border border-slate-200 dark:border-slate-700/50 rounded-xl p-3 text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-colors shadow-inner";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-[#12131a] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 transition-colors">
                <div className="p-4 bg-slate-50 dark:bg-[#16171d] border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
                    <h3 className="text-slate-800 dark:text-white font-black flex items-center gap-1.5 uppercase text-xs tracking-wider">📡 {olt ? 'Editar Nodo OLT' : 'Registrar OLT'}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-rose-500 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div><label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">Nombre Identificador</label><input type="text" className={inputCls} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">IP Gestión</label><input type="text" className={inputCls} value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} required /></div>
                        <div><label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">SNMP Community</label><input type="text" className={inputCls} value={formData.comunidad} onChange={e => setFormData({...formData, comunidad: e.target.value})} required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">Tecnología</label><select className={inputCls} value={formData.tecnologia} onChange={e => setFormData({...formData, tecnologia: e.target.value})}><option value="GPON">GPON</option><option value="EPON">EPON</option></select></div>
                        <div><label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">Marca / Modelo</label><input type="text" className={inputCls} value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} /></div>
                    </div>
                    <button type="submit" disabled={saving} className="w-full mt-1 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest">
                        {saving ? 'Guardando...' : 'Confirmar OLT'}
                    </button>
                </form>
            </div>
        </div>
    );
}