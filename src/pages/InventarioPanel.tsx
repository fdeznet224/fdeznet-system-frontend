import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/axios'; 
import { toast } from 'react-hot-toast';
import { Scanner } from '@yudiel/react-qr-scanner'; 
import { 
    ArchiveBoxIcon, UserPlusIcon, QrCodeIcon, 
    TrashIcon, ArrowPathIcon, CheckBadgeIcon,
    WrenchScrewdriverIcon, ArrowDownTrayIcon,
    CameraIcon, XMarkIcon, MapPinIcon, UserIcon,
    TruckIcon
} from '@heroicons/react/24/outline';

export default function InventarioPanel() {
    const [equipos, setEquipos] = useState<any[]>([]);
    const [tecnicos, setTecnicos] = useState<any[]>([]); 
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<string>('todos');
    
    const [showModal, setShowModal] = useState(false);
    const [nuevoId, setNuevoId] = useState('');
    const [tecnologia, setTecnologia] = useState('GPON');
    const [modelo, setModelo] = useState('ZTE F670L');
    const [isScanning, setIsScanning] = useState(false);

    const fetchInventario = async () => {
        setLoading(true);
        try {
            const res = await client.get('/inventario/');
            setEquipos(res.data);
        } catch (error) {
            toast.error("Error al cargar inventario");
        } finally {
            setLoading(false);
        }
    };

    const fetchTecnicos = async () => {
        try {
            const res = await client.get('/usuarios/');
            setTecnicos(res.data.filter((u: any) => u.rol === 'tecnico'));
        } catch (error) {
            console.error("Error cargando técnicos", error);
        }
    };

    useEffect(() => {
        fetchInventario();
        fetchTecnicos(); 
    }, []);

    const handleAsignarTecnico = async (clienteId: number, tecnicoId: string) => {
        if (!tecnicoId) return;
        const load = toast.loading("Asignando técnico para retiro...");
        try {
            await client.post(`/clientes/${clienteId}/asignar-retiro/${tecnicoId}`);
            toast.success("Técnico asignado correctamente", { id: load });
            fetchInventario(); 
        } catch (error) {
            toast.error("Error al asignar técnico", { id: load });
        }
    };

    const handleConfirmarRecoleccion = async (eq: any) => {
        if(!confirm(`¿Confirmas que has recuperado el equipo de ${eq.cliente_nombre}?`)) return;
        const load = toast.loading("Ingresando a stock...");
        try {
            await client.post(`/clientes/${eq.cliente_id}/confirmar-retiro-onu`);
            toast.success("Equipo de vuelta en bodega", { id: load });
            fetchInventario();
        } catch (error) {
            toast.error("Error al procesar", { id: load });
        }
    };

    const handleSuccessfulScan = (codigoEscaneado: string) => {
        const val = codigoEscaneado.toUpperCase();
        setNuevoId(val);
        if (val.includes(':')) {
            setTecnologia('EPON');
            setModelo('V-SOL V2801');
        } else {
            setTecnologia('GPON');
        }
        toast.success("¡Código escaneado!");
        setIsScanning(false);
    };

    const handleRegistrar = async (e: React.FormEvent) => {
        e.preventDefault();
        const load = toast.loading("Registrando...");
        try {
            await client.post('/inventario/', { identificador: nuevoId, tecnologia, modelo });
            toast.success("Agregado", { id: load });
            setNuevoId(''); setShowModal(false); fetchInventario();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error", { id: load });
        }
    };

    const handleEliminar = async (id: number) => {
        if (!confirm("¿Eliminar permanente?")) return;
        try {
            await client.delete(`/inventario/${id}`);
            toast.success("Eliminado"); fetchInventario();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Error");
        }
    };

    const stats = useMemo(() => {
        const disponibles = equipos.filter(e => e.estado === 'DISPONIBLE').length;
        const instalados = equipos.filter(e => e.estado === 'INSTALADO').length;
        const porRecoger = equipos.filter(e => e.estado === 'POR_RECOGER').length;
        return { total: equipos.length, disponibles, instalados, porRecoger };
    }, [equipos]);

    const equiposFiltrados = useMemo(() => {
        return equipos.filter(e => filtro === 'todos' || e.estado === filtro);
    }, [equipos, filtro]);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-200">
            
            {/* =========================================================
                HEADER RESPONSIVO COMPACTO
               ========================================================= */}
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 md:p-6 flex justify-between items-center shadow-xl gap-4 flex-none">
                <div className="flex items-center gap-3 md:gap-4">
                    
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-white leading-tight">Bodega y Inventario</h1>
                        <p className="text-slate-400 text-xs md:text-sm mt-0.5 hidden sm:block">Logística y Control de Equipos</p>
                    </div>
                </div>
                {/* Icono cambiado a UserPlusIcon para estandarizar el alta */}
                <button 
                    onClick={() => { setShowModal(true); setIsScanning(false); }} 
                    className="px-4 py-2.5 md:px-6 md:py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-600/20 flex items-center gap-1.5 transition-all active:scale-95 text-xs md:text-base shrink-0"
                >
                    <UserPlusIcon className="w-4 h-4 md:w-5 md:h-5" /> <span>Ingresar Equipo</span>
                </button>
            </div>

            {/* =========================================================
                KPI CARDS: GRID EN ESCRITORIO / SCROLL EN MÓVIL
               ========================================================= */}
            <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:pb-0 scrollbar-none flex-none">
                <KpiCard title="Total" value={stats.total} icon={ArchiveBoxIcon} color="text-blue-400" bg="bg-blue-500/10" onClick={() => setFiltro('todos')} active={filtro === 'todos'} />
                <KpiCard title="En Bodega" value={stats.disponibles} icon={CheckBadgeIcon} color="text-emerald-400" bg="bg-emerald-500/10" onClick={() => setFiltro('DISPONIBLE')} active={filtro === 'DISPONIBLE'} />
                <KpiCard title="Instalados" value={stats.instalados} icon={WrenchScrewdriverIcon} color="text-purple-400" bg="bg-purple-500/10" onClick={() => setFiltro('INSTALADO')} active={filtro === 'INSTALADO'} />
                <KpiCard title="Por Recoger" value={stats.porRecoger} icon={ArrowDownTrayIcon} color="text-rose-400" bg="bg-rose-500/10" onClick={() => setFiltro('POR_RECOGER')} active={filtro === 'POR_RECOGER'} />
            </div>

            {/* =========================================================
                ZONA DE DATOS (TABLA VS TARJETAS DE ACCIÓN)
               ========================================================= */}
            <div className="flex-1 bg-slate-900 md:border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* 🖥️ VISTA ESCRITORIO */}
                    <table className="w-full text-left border-collapse hidden md:table">
                        <thead>
                            <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 shadow-md">
                                <th className="px-6 py-4 font-bold">Equipo</th>
                                <th className="px-6 py-4 font-bold">Estado / Ubicación</th>
                                <th className="px-6 py-4 font-bold">Logística (Técnico)</th>
                                <th className="px-6 py-4 font-bold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading && equipos.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center"><ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-orange-500"/></td></tr>
                            ) : equiposFiltrados.map((eq) => (
                                <tr key={eq.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <QrCodeIcon className="w-5 h-5 text-slate-500" />
                                            <div>
                                                <span className="font-mono font-bold text-white block">{eq.identificador}</span>
                                                <span className="text-[10px] text-slate-500 uppercase font-black">{eq.tecnologia} — {eq.modelo}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <EstadoBadge estado={eq.estado} />
                                        {eq.cliente_nombre && (
                                            <div className="mt-2 space-y-1">
                                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase italic">
                                                    <MapPinIcon className="w-2.5 h-2.5" /> {eq.cliente_zona || 'Sin Zona'}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-white font-bold">
                                                    <UserIcon className="w-3 h-3 text-slate-500" /> {eq.cliente_nombre}
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{eq.cliente_direccion}</p>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {eq.estado === 'POR_RECOGER' ? (
                                            <div className="space-y-1.5">
                                                <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><TruckIcon className="w-3 h-3" /> Asignar a:</p>
                                                <select 
                                                    value={eq.tecnico_id || ""} 
                                                    onChange={(e) => handleAsignarTecnico(eq.cliente_id, e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] text-white outline-none focus:border-orange-500 cursor-pointer"
                                                >
                                                    <option value="">-- Sin asignar --</option>
                                                    {tecnicos.map(t => (
                                                        <option key={t.id} value={t.id}>{t.nombre_completo || t.usuario}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : eq.estado === 'INSTALADO' ? (
                                            <p className="text-[10px] text-slate-600 font-bold italic">En uso activo</p>
                                        ) : (
                                            <p className="text-[10px] text-emerald-500/60 font-bold italic">Listo para salir</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {eq.estado === 'DISPONIBLE' && (
                                                <button onClick={() => handleEliminar(eq.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                            )}
                                            {eq.estado === 'POR_RECOGER' && (
                                                <button onClick={() => handleConfirmarRecoleccion(eq)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all uppercase"><CheckBadgeIcon className="w-4 h-4" /> Recibido</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* 📱 VISTA MÓVIL (TARJETAS INTELIGENTES DESPEJADAS) */}
                    <div className="md:hidden flex flex-col gap-3 p-2 pb-24">
                        {loading && equipos.length === 0 ? (
                            <div className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-orange-500"/></div>
                        ) : equiposFiltrados.map((eq) => (
                            <div key={eq.id} className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 flex flex-col gap-3 shadow-md">
                                
                                {/* Fila Superior: Datos de Identificación y Estado */}
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-start gap-2.5 overflow-hidden">
                                        <QrCodeIcon className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                                        <div className="overflow-hidden">
                                            <span className="font-mono font-bold text-white text-sm block leading-tight">{eq.identificador}</span>
                                            <span className="text-[9px] text-slate-500 uppercase font-black block mt-0.5 truncate">{eq.tecnologia} — {eq.modelo}</span>
                                        </div>
                                    </div>
                                    <EstadoBadge estado={eq.estado} />
                                </div>

                                {/* Cuerpo: Datos del Cliente Vinculado (Solo si está instalado o por recoger) */}
                                {eq.cliente_nombre && (
                                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80 text-[11px] space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1 text-white font-bold truncate">
                                                <UserIcon className="w-3 h-3 text-slate-500 shrink-0" />
                                                <span>{eq.cliente_nombre}</span>
                                            </div>
                                            <div className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-black text-indigo-400 tracking-wide uppercase font-mono shrink-0">
                                                {eq.cliente_zona || 'Sin Zona'}
                                            </div>
                                        </div>
                                        <p className="text-slate-500 text-[10px] leading-tight line-clamp-1">{eq.cliente_direccion}</p>
                                    </div>
                                )}

                                {/* Pie de Tarjeta: Flujo Logístico Dinámico en Móvil */}
                                {eq.estado === 'POR_RECOGER' ? (
                                    <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-2.5 mt-0.5">
                                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5">
                                            <TruckIcon className="w-4 h-4 text-slate-500 shrink-0" />
                                            <select 
                                                value={eq.tecnico_id || ""} 
                                                onChange={(e) => handleAsignarTecnico(eq.cliente_id, e.target.value)}
                                                className="w-full bg-transparent text-slate-300 font-bold outline-none text-xs cursor-pointer appearance-none"
                                            >
                                                <option value="" className="bg-slate-950">Asignar técnico para retiro...</option>
                                                {tecnicos.map(t => (
                                                    <option key={t.id} value={t.id} className="bg-slate-950">{t.nombre_completo || t.usuario}</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <button 
                                            onClick={() => handleConfirmarRecoleccion(eq)}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-600 text-white font-black rounded-lg text-xs tracking-wide shadow-md transition-all active:scale-[0.98]"
                                        >
                                            <CheckBadgeIcon className="w-4 h-4" /> <span>CONFIRMAR RETORNO A STOCK</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center border-t border-slate-800/50 pt-2 mt-0.5">
                                        <p className="text-[10px] text-slate-500 font-bold italic">
                                            {eq.estado === 'INSTALADO' ? '📡 Equipo operando en campo' : '📦 ONU resguardada en bodega'}
                                        </p>
                                        {eq.estado === 'DISPONIBLE' && (
                                            <button onClick={() => handleEliminar(eq.id)} className="p-1.5 text-slate-500 hover:text-rose-500 active:scale-90 transition-all">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                </div>
            </div>
            
            {/* =========================================================
                MODAL DE INGRESO (QR / CÁMRA)
               ========================================================= */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
                        <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <ArchiveBoxIcon className="w-6 h-6 text-orange-500" /> Nuevo Equipo
                            </h3>
                            <button onClick={() => { setShowModal(false); setIsScanning(false); }} className="text-slate-500 hover:text-white"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            {isScanning ? (
                                <div className="bg-black rounded-xl overflow-hidden border border-slate-700 relative w-full aspect-square">
                                    <Scanner onScan={(res) => { if(res) handleSuccessfulScan(Array.isArray(res) ? res[0].rawValue : res); }} />
                                    <button onClick={() => setIsScanning(false)} className="absolute top-3 right-3 bg-rose-600 text-white px-3 py-1 rounded-lg text-xs font-bold">Cerrar</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsScanning(true)} className="w-full py-8 border-2 border-dashed border-slate-600 hover:border-orange-500 bg-slate-800/50 rounded-xl flex flex-col items-center gap-2 transition-all group">
                                    <CameraIcon className="w-8 h-8 text-slate-400 group-hover:text-orange-500" />
                                    <span className="text-sm font-bold text-slate-300">Escanear Código</span>
                                </button>
                            )}
                            <form onSubmit={handleRegistrar} className="space-y-4 text-slate-950">
                                <input type="text" placeholder="S/N o MAC" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono uppercase outline-none focus:border-orange-500" value={nuevoId} onChange={(e) => setNuevoId(e.target.value.toUpperCase())} />
                                <div className="grid grid-cols-2 gap-3">
                                    <select className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white cursor-pointer outline-none focus:border-orange-500" value={tecnologia} onChange={e => setTecnologia(e.target.value)}>
                                        <option value="GPON">GPON</option>
                                        <option value="EPON">EPON</option>
                                    </select>
                                    <input type="text" placeholder="Modelo" className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-orange-500" value={modelo} onChange={e => setModelo(e.target.value)} />
                                </div>
                                <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98]">Guardar en Bodega</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- SUB-COMPONENTES AUXILIARES ---
const KpiCard = ({ title, value, icon: Icon, color, bg, onClick, active }: any) => (
    <div onClick={onClick} className={`p-4 rounded-xl border cursor-pointer transition-all shrink-0 min-w-[130px] md:min-w-0 flex-1 ${active ? `border-orange-500/50 bg-slate-800 shadow-[0_0_12px_rgba(249,115,22,0.08)]` : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800'}`}>
        <div className="flex justify-between items-start mb-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{title}</p>
            <div className={`p-1.5 rounded-lg ${bg}`}><Icon className={`w-3.5 h-3.5 ${color}`} /></div>
        </div>
        <p className="text-2xl font-black text-white">{value}</p>
    </div>
);

const EstadoBadge = ({ estado }: { estado: string }) => {
    switch (estado) {
        case 'DISPONIBLE': return <span className="px-1.5 py-0.5 rounded border text-[8px] font-extrabold bg-emerald-500/10 text-emerald-400 border-emerald-500/20 tracking-wider">BODEGA</span>;
        case 'INSTALADO': return <span className="px-1.5 py-0.5 rounded border text-[8px] font-extrabold bg-purple-500/10 text-purple-400 border-purple-500/20 tracking-wider">INSTALADO</span>;
        case 'POR_RECOGER': return <span className="px-1.5 py-0.5 rounded border text-[8px] font-extrabold bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse tracking-wider">POR RECOGER</span>;
        default: return <span className="px-1.5 py-0.5 rounded border text-[8px] font-extrabold bg-slate-500/10 text-slate-400 border-slate-500/20 tracking-wider">{estado}</span>;
    }
};