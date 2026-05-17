import React, { useState, useEffect, useMemo } from 'react';
import client from '../api/axios'; 
import { toast } from 'react-hot-toast';
import { Scanner } from '@yudiel/react-qr-scanner'; 
import { 
    ArchiveBoxIcon, PlusIcon, QrCodeIcon, 
    TrashIcon, ArrowPathIcon, CheckBadgeIcon,
    WrenchScrewdriverIcon, ArrowDownTrayIcon,
    CameraIcon, XMarkIcon, MapPinIcon, UserIcon,
    TruckIcon // 👈 Nuevo ícono para logística
} from '@heroicons/react/24/outline';

export default function InventarioPanel() {
    const [equipos, setEquipos] = useState<any[]>([]);
    const [tecnicos, setTecnicos] = useState<any[]>([]); // 👈 Estado para la lista de personal
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
            // Filtramos solo los que tienen rol de técnico
            setTecnicos(res.data.filter((u: any) => u.rol === 'tecnico'));
        } catch (error) {
            console.error("Error cargando técnicos", error);
        }
    };

    useEffect(() => {
        fetchInventario();
        fetchTecnicos(); // Cargamos el personal al iniciar
    }, []);

    const handleAsignarTecnico = async (clienteId: number, tecnicoId: string) => {
        if (!tecnicoId) return;
        const load = toast.loading("Asignando técnico para retiro...");
        try {
            await client.post(`/clientes/${clienteId}/asignar-retiro/${tecnicoId}`);
            toast.success("Técnico asignado correctamente", { id: load });
            fetchInventario(); // Refrescamos la tabla
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

    // ... (handleRegistrar, handleEliminar, handleSuccessfulScan se mantienen igual)
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

    const equiposFiltrados = equipos.filter(e => filtro === 'todos' || e.estado === filtro);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* ENCABEZADO Y STATS (Igual al anterior) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center shadow-xl gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20">
                        <ArchiveBoxIcon className="w-8 h-8 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white">Bodega & Inventario</h1>
                        <p className="text-slate-400 text-sm">Logística y Control de Equipos</p>
                    </div>
                </div>
                <button onClick={() => { setShowModal(true); setIsScanning(false); }} className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-600/20 flex items-center gap-2 transition-all">
                    <PlusIcon className="w-5 h-5" /> Ingresar Equipo
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard title="Total" value={stats.total} icon={ArchiveBoxIcon} color="text-blue-400" bg="bg-blue-500/10" onClick={() => setFiltro('todos')} active={filtro === 'todos'} />
                <KpiCard title="En Bodega" value={stats.disponibles} icon={CheckBadgeIcon} color="text-emerald-400" bg="bg-emerald-500/10" onClick={() => setFiltro('DISPONIBLE')} active={filtro === 'DISPONIBLE'} />
                <KpiCard title="Instalados" value={stats.instalados} icon={WrenchScrewdriverIcon} color="text-purple-400" bg="bg-purple-500/10" onClick={() => setFiltro('INSTALADO')} active={filtro === 'INSTALADO'} />
                <KpiCard title="Por Recoger" value={stats.porRecoger} icon={ArrowDownTrayIcon} color="text-rose-400" bg="bg-rose-500/10" onClick={() => setFiltro('POR_RECOGER')} active={filtro === 'POR_RECOGER'} />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                                <th className="px-6 py-4 font-bold">Equipo</th>
                                <th className="px-6 py-4 font-bold">Estado / Ubicación</th>
                                <th className="px-6 py-4 font-bold">Logística (Técnico)</th>
                                <th className="px-6 py-4 font-bold text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {loading ? (
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
                                                {/* 🚩 NUEVA BADGE DE ZONA 🚩 */}
                                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase italic">
                                                    <MapPinIcon className="w-2.5 h-2.5" /> {eq.cliente_zona || 'Sin Zona'}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-white font-bold">
                                                    <UserIcon className="w-3 h-3 text-slate-500" />
                                                    {eq.cliente_nombre}
                                                </div>
                                                <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{eq.cliente_direccion}</p>
                                            </div>
                                        )}
                                    </td>

                                    <td className="px-6 py-4">
                                        {/* 👇 SELECTOR DE TÉCNICO PARA RECOGER 👇 */}
                                        {eq.estado === 'POR_RECOGER' ? (
                                            <div className="space-y-1.5">
                                                <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
                                                    <TruckIcon className="w-3 h-3" /> Asignar a:
                                                </p>
                                                <select 
                                                    value={eq.tecnico_id || ""} 
                                                    onChange={(e) => handleAsignarTecnico(eq.cliente_id, e.target.value)}
                                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] text-white outline-none focus:border-orange-500"
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
                                                <button onClick={() => handleEliminar(eq.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                            
                                            {eq.estado === 'POR_RECOGER' && (
                                                <button 
                                                    onClick={() => handleConfirmarRecoleccion(eq)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-black hover:bg-emerald-600 hover:text-white transition-all uppercase"
                                                >
                                                    <CheckBadgeIcon className="w-4 h-4" /> 
                                                    Recibido
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* ... (Modal de ingreso se mantiene igual) ... */}
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
                            <form onSubmit={handleRegistrar} className="space-y-4">
                                <input type="text" placeholder="S/N o MAC" className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono uppercase" value={nuevoId} onChange={(e) => setNuevoId(e.target.value.toUpperCase())} />
                                <div className="grid grid-cols-2 gap-3">
                                    <select className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" value={tecnologia} onChange={e => setTecnologia(e.target.value)}>
                                        <option value="GPON">GPON</option>
                                        <option value="EPON">EPON</option>
                                    </select>
                                    <input type="text" placeholder="Modelo" className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-white" value={modelo} onChange={e => setModelo(e.target.value)} />
                                </div>
                                <button type="submit" className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl shadow-lg">Guardar en Bodega</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ... KpiCard y EstadoBadge ...
const KpiCard = ({ title, value, icon: Icon, color, bg, onClick, active }: any) => (
    <div onClick={onClick} className={`p-5 rounded-2xl border cursor-pointer transition-all ${active ? `border-orange-500/50 bg-slate-800 shadow-[0_0_15px_rgba(249,115,22,0.1)]` : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800'}`}>
        <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black text-slate-500 uppercase">{title}</p>
            <div className={`p-2 rounded-lg ${bg}`}><Icon className={`w-4 h-4 ${color}`} /></div>
        </div>
        <p className="text-3xl font-black text-white">{value}</p>
    </div>
);

const EstadoBadge = ({ estado }: { estado: string }) => {
    switch (estado) {
        case 'DISPONIBLE': return <span className="px-2 py-0.5 rounded border text-[10px] font-black bg-emerald-500/10 text-emerald-400 border-emerald-500/20">BODEGA</span>;
        case 'INSTALADO': return <span className="px-2 py-0.5 rounded border text-[10px] font-black bg-purple-500/10 text-purple-400 border-purple-500/20">INSTALADO</span>;
        case 'POR_RECOGER': return <span className="px-2 py-0.5 rounded border text-[10px] font-black bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse">POR RECOGER</span>;
        default: return <span className="px-2 py-0.5 rounded border text-[10px] font-black bg-slate-500/10 text-slate-400 border-slate-500/20">{estado}</span>;
    }
};