import React, { useState, useEffect, useMemo } from 'react';
import client from '../../api/axios'; 
import { toast } from 'react-hot-toast';
import { 
    ArrowPathIcon, ServerStackIcon, ChevronDownIcon,
    MagnifyingGlassIcon, PlusIcon, PencilSquareIcon, 
    TrashIcon, XMarkIcon, CpuChipIcon, ExclamationTriangleIcon,
    SignalIcon, ServerIcon
} from '@heroicons/react/24/outline';

// 🔥 CACHÉ GLOBAL: Sobrevive a los cambios de vista en React
let cacheRadar: { [oltId: number]: { data: any, timestamp: Date } } = {};

export default function RadarOlt() { 
    const [oltsDisponibles, setOltsDisponibles] = useState<any[]>([]);
    const [oltSeleccionada, setOltSeleccionada] = useState<number | "">("");

    const [datosRadar, setDatosRadar] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [filtroActivo, setFiltroActivo] = useState<string>('todos'); 

    // ESTADOS PARA GESTIÓN DE OLT
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

    // ✨ NUEVA LÓGICA DE ESCANEO CON CACHÉ
    const escanearOlt = async (silencioso = false, forzar = false) => {
        if (!oltSeleccionada) return;

        // 1. Si NO estamos forzando, revisamos si hay caché válida (menos de 60 segundos de antigüedad)
        if (!forzar && cacheRadar[oltSeleccionada as number]) {
            const cache = cacheRadar[oltSeleccionada as number];
            const segundosEdad = (new Date().getTime() - cache.timestamp.getTime()) / 1000;
            
            // Si la caché tiene menos de 60 segundos, la mostramos inmediatamente y cancelamos la petición
            if (segundosEdad < 60) {
                setDatosRadar(cache.data);
                setUltimaActualizacion(cache.timestamp);
                return;
            }
        }

        // 2. Si no hay caché o ya es vieja, hacemos la petición a la OLT
        if (!silencioso) setLoading(true);
        
        try {
            const res = await client.get(`/olts/${oltSeleccionada}/monitoreo-vivo`);
            const now = new Date();
            
            setDatosRadar(res.data.data);
            setUltimaActualizacion(now);
            
            // Guardamos el resultado fresco en la memoria global
            cacheRadar[oltSeleccionada as number] = {
                data: res.data.data,
                timestamp: now
            };

            if (!silencioso) toast.success("Escaneo óptico completado");
        } catch (error) {
            if (!silencioso) toast.error("Error de conexión con OLT");
        } finally {
            setLoading(false);
        }
    };

    // Efecto principal al cambiar la OLT seleccionada
    useEffect(() => {
        if (oltSeleccionada) {
            // Si no hay caché, limpiamos la pantalla para mostrar el estado de carga
            if (!cacheRadar[oltSeleccionada as number]) {
                setDatosRadar(null); 
            }
            setFiltroActivo('todos');
            
            // Primer escaneo (intentará usar caché)
            escanearOlt(false, false); 
            
            // Intervalo en segundo plano (Fuerza la actualización silenciosa cada 60s)
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
        if (!confirm("¿Eliminar esta OLT de FdezNet? No afectará a los clientes en la base de datos.")) return;
        try {
            await client.delete(`/olts/${id}`);
            toast.success("OLT eliminada");
            // Limpiamos su caché al eliminarla
            delete cacheRadar[id];
            fetchOlts();
            setOltSeleccionada("");
            setDatosRadar(null);
        } catch (error) { toast.error("Error al eliminar"); }
    };

    return (
        <div className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-6">
            
            {/* ================= ENCABEZADO Y CONTROLES ================= */}
            <div className="bg-[#12131a] border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center shadow-2xl gap-5">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="h-14 w-14 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-blue-500/30">
                        <ServerStackIcon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-xl font-black text-white mb-1 tracking-wide">Radar Óptico FdezNet</h1>
                        <div className="flex items-center gap-2">
                            <div className="relative w-full md:w-64">
                                <select 
                                    className="w-full bg-[#0b0c10] border border-slate-700/50 rounded-lg py-2 pl-3 pr-8 text-sm text-blue-400 font-bold outline-none focus:border-blue-500 appearance-none transition-colors cursor-pointer"
                                    value={oltSeleccionada}
                                    onChange={(e) => setOltSeleccionada(Number(e.target.value))}
                                >
                                    <option value="" disabled>Seleccionar OLT...</option>
                                    {oltsDisponibles.map(o => <option key={o.id} value={o.id}>{o.nombre} ({o.tecnologia})</option>)}
                                </select>
                                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"/>
                            </div>
                            
                            <button onClick={() => { setOltEnEdicion(null); setShowAdminModal(true); }} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors" title="Registrar Nueva OLT"><PlusIcon className="w-5 h-5" /></button>
                            {oltSeleccionada && (
                                <>
                                    <button onClick={() => { setOltEnEdicion(oltsDisponibles.find(o => o.id === oltSeleccionada)); setShowAdminModal(true); }} className="p-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg transition-colors"><PencilSquareIcon className="w-5 h-5" /></button>
                                    <button onClick={() => handleDeleteOlt(oltSeleccionada as number)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end w-full md:w-auto">
                    {/* Al dar clic al botón, forzamos la actualización saltándonos la caché */}
                    <button 
                        onClick={() => escanearOlt(false, true)} 
                        disabled={loading || !oltSeleccionada}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Escaneando...' : 'Actualizar Radar'}
                    </button>
                    {ultimaActualizacion && <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-wider">Último escaneo: {ultimaActualizacion.toLocaleTimeString()}</p>}
                </div>
            </div>

            {/* ================= ESTADO DE CARGA ================= */}
            {!datosRadar && loading && (
                <div className="flex flex-col items-center justify-center h-64 space-y-4 bg-[#12131a] rounded-2xl border border-slate-800 shadow-lg">
                    <div className="relative">
                        <SignalIcon className="w-16 h-16 text-blue-500/20" />
                        <SignalIcon className="w-16 h-16 text-blue-500 absolute inset-0 animate-ping opacity-50" />
                    </div>
                    <p className="text-blue-400 font-bold tracking-widest uppercase text-sm">Analizando Red FTTH...</p>
                </div>
            )}

            {/* ================= DASHBOARD DE RESULTADOS ================= */}
            {datosRadar && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    
                    {/* KPIs SUPERIORES */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <KpiCard titulo="Señal Óptima" valor={contadores.optima} total={totalRegistros} color="text-emerald-400" bg="bg-emerald-500/10" borde="border-emerald-500/20" isActive={filtroActivo === 'optima'} onClick={() => setFiltroActivo(prev => prev === 'optima' ? 'todos' : 'optima')} />
                        <KpiCard titulo="Atenuación Alta" valor={contadores.alerta} total={totalRegistros} color="text-amber-400" bg="bg-amber-500/10" borde="border-amber-500/20" isActive={filtroActivo === 'alerta'} onClick={() => setFiltroActivo(prev => prev === 'alerta' ? 'todos' : 'alerta')} />
                        <KpiCard titulo="Corte / Apagados" valor={contadores.offline} total={totalRegistros} color="text-rose-400" bg="bg-rose-500/10" borde="border-rose-500/20" isActive={filtroActivo === 'offline'} onClick={() => setFiltroActivo(prev => prev === 'offline' ? 'todos' : 'offline')} />
                        <KpiCard titulo="Intrusos (No Reg.)" valor={contadores.intrusos} total={totalRegistros} color="text-purple-400" bg="bg-purple-500/10" borde="border-purple-500/20" isActive={filtroActivo === 'intruso'} onClick={() => setFiltroActivo(prev => prev === 'intruso' ? 'todos' : 'intruso')} />
                    </div>

                    {/* TABLA PRINCIPAL */}
                    <div className="bg-[#12131a] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                        
                        {/* Buscador de Tabla */}
                        <div className="p-4 border-b border-slate-800 bg-[#16171d] flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <ServerIcon className="w-4 h-4"/> Equipos en {datosRadar.olt_nombre} ({tablaUnificada.length})
                                {filtroActivo !== 'todos' && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded ml-2">Filtrado</span>}
                            </h2>
                            <div className="relative w-full sm:w-72">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input type="text" placeholder="Buscar por cliente o MAC..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-[#0b0c10] border border-slate-700/50 rounded-lg py-2 pl-9 pr-4 text-sm text-white outline-none focus:border-blue-500 transition-colors" />
                            </div>
                        </div>

                        {/* Listado de Clientes */}
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left whitespace-nowrap">
                                <thead>
                                    <tr className="bg-[#0b0c10] text-slate-500 text-[10px] uppercase font-black border-b border-slate-800 tracking-wider">
                                        <th className="px-6 py-4">Cliente Asignado</th>
                                        <th className="px-6 py-4">Hardware (MAC/SN)</th>
                                        <th className="px-6 py-4">Potencia Óptica (Rx)</th>
                                        <th className="px-6 py-4 text-center">Estado Link</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {tablaUnificada.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500 text-sm">No se encontraron equipos bajo estos criterios.</td></tr>
                                    ) : (
                                        tablaUnificada.map((cliente: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-800/30 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${cliente.nivel === 'intruso' ? 'bg-purple-600' : 'bg-slate-700 group-hover:bg-blue-600 transition-colors'}`}>
                                                            {cliente.nombre ? cliente.nombre.charAt(0).toUpperCase() : '?'}
                                                        </div>
                                                        <div>
                                                            <p className={`font-bold text-sm ${cliente.nivel === 'intruso' ? 'text-purple-400' : 'text-slate-200'}`}>{cliente.nombre}</p>
                                                            <p className="text-[10px] text-slate-500 uppercase">ID Sistema: {cliente.id_cliente || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <CpuChipIcon className="w-4 h-4 text-slate-500"/>
                                                        <span className="font-mono text-xs font-bold text-blue-300 tracking-wider">{cliente.identificador}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <SignalIndicator power={cliente.rx_power} nivel={cliente.nivel} />
                                                        <span className={`font-mono text-sm font-black ${getPowerColor(cliente.nivel)}`}>
                                                            {cliente.rx_power} {cliente.rx_power !== 'LOS' && <span className="text-[10px] font-normal text-slate-500">dBm</span>}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border tracking-widest ${getBadgeStyle(cliente.nivel)}`}>
                                                        {cliente.nivel}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= MODAL DE CONFIGURACIÓN DE OLT ================= */}
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

// ================= COMPONENTES DE UI =================

const SignalIndicator = ({ power, nivel }: any) => {
    let bars = 0;
    let color = "bg-slate-700";
    
    if (nivel === 'optima') { bars = 3; color = "bg-emerald-500"; }
    else if (nivel === 'alerta') { bars = 2; color = "bg-amber-500"; }
    else if (nivel === 'intruso') { bars = 1; color = "bg-purple-500"; }
    else { bars = 0; color = "bg-rose-500"; } 

    return (
        <div className="flex items-end gap-[2px] h-4">
            <div className={`w-1.5 rounded-sm ${bars >= 1 ? color : 'bg-slate-800'} h-1/3`}></div>
            <div className={`w-1.5 rounded-sm ${bars >= 2 ? color : 'bg-slate-800'} h-2/3`}></div>
            <div className={`w-1.5 rounded-sm ${bars >= 3 ? color : 'bg-slate-800'} h-full`}></div>
        </div>
    );
};

const getPowerColor = (nivel: string) => {
    switch(nivel) {
        case 'optima': return 'text-emerald-400';
        case 'alerta': return 'text-amber-400';
        case 'intruso': return 'text-purple-400';
        default: return 'text-rose-500';
    }
};

const getBadgeStyle = (nivel: string) => {
    switch(nivel) {
        case 'optima': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        case 'alerta': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
        case 'offline': return 'bg-rose-500/10 text-rose-500 border-rose-500/30';
        case 'intruso': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
        default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
};

const KpiCard = ({ titulo, valor, total, color, bg, borde, onClick, isActive }: any) => (
    <div onClick={onClick} className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${isActive ? `ring-1 ring-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] ${bg} ${color} ${borde}` : `border-slate-800 bg-[#16171d] hover:bg-[#1a1c23] hover:border-slate-700`}`}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">{titulo}</p>
        <div className="flex justify-between items-end">
            <p className={`text-3xl font-black ${isActive ? color : 'text-slate-200'}`}>{valor}</p>
            <p className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-1 rounded">
                {total > 0 ? Math.round((valor/total)*100) : 0}%
            </p>
        </div>
    </div>
);

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
            toast.success("OLT Registrada");
            onSuccess();
        } catch (error) { toast.error("Error al guardar OLT"); } 
        finally { setSaving(false); }
    };

    const inputCls = "w-full bg-[#0b0c10] border border-slate-700/50 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 transition-colors";

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <div className="bg-[#12131a] border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                <div className="p-5 bg-[#16171d] border-b border-slate-800 flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2 uppercase text-sm tracking-wider"><ServerStackIcon className="w-5 h-5 text-blue-500" /> {olt ? 'Editar Nodo OLT' : 'Registrar OLT'}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-rose-400 transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Nombre Identificador</label><input type="text" placeholder="Ej: Nodo Centro" className={inputCls} value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">IP de Gestión</label><input type="text" placeholder="192.168.1.100" className={inputCls} value={formData.ip} onChange={e => setFormData({...formData, ip: e.target.value})} required /></div>
                        <div><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Comunidad SNMP</label><input type="text" placeholder="public" className={inputCls} value={formData.comunidad} onChange={e => setFormData({...formData, comunidad: e.target.value})} required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Tecnología</label><select className={inputCls} value={formData.tecnologia} onChange={e => setFormData({...formData, tecnologia: e.target.value})}><option value="GPON">GPON</option><option value="EPON">EPON</option></select></div>
                        <div><label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Marca / Modelo</label><input type="text" placeholder="VSOL, Huawei..." className={inputCls} value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} /></div>
                    </div>
                    <button type="submit" disabled={saving} className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
                        {saving ? 'Aplicando Configuración...' : 'Confirmar OLT'}
                    </button>
                </form>
            </div>
        </div>
    );
}