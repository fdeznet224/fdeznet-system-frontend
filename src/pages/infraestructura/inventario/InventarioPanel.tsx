import React, { useState, useEffect, useMemo, Fragment } from 'react';
import axios from 'axios';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { Scanner } from '@yudiel/react-qr-scanner'; 
import {
    ArchiveBoxIcon, UserPlusIcon, QrCodeIcon,
    TrashIcon, ArrowPathIcon, CheckBadgeIcon,
    WrenchScrewdriverIcon, ArrowDownTrayIcon,
    CameraIcon, XMarkIcon, MapPinIcon, UserIcon,
    TruckIcon, ExclamationTriangleIcon, MagnifyingGlassIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';

interface EquipoInventario {
    id: number;
    identificador: string;
    tecnologia: string;
    modelo: string;
    estado: string;
    tecnico_id?: number | null;
    cliente_nombre?: string | null;
    cliente_zona?: string | null;
}

interface Tecnico {
    id: number;
    rol: string;
    nombre_completo?: string | null;
    usuario: string;
}

interface KpiCardProps {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    onClick: () => void;
    active: boolean;
}

function getErrorMessage(error: unknown, fallback: string) {
    if (axios.isAxiosError<{ detail?: string }>(error)) {
        return error.response?.data?.detail || fallback;
    }
    return fallback;
}

export default function InventarioPanel() {
    const [equipos, setEquipos] = useState<EquipoInventario[]>([]);
    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [filtroEstado, setFiltroEstado] = useState<string>('todos');
    const [busqueda, setBusqueda] = useState('');
    const [filtroZona, setFiltroZona] = useState<string>('Todas');

    // Estado para la barra de búsqueda/filtro en Móvil
    const [mobileView, setMobileView] = useState<'none' | 'search' | 'zone'>('none');

    const [showModal, setShowModal] = useState(false);
    const [nuevoId, setNuevoId] = useState('');
    const [tecnologia, setTecnologia] = useState('GPON');
    const [modelo, setModelo] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    const fetchInventario = async () => {
        setLoading(true);
        try {
            const res = await client.get<EquipoInventario[]>('/inventario/');
            setEquipos(res.data);
        } catch {
            toast.error("Error al cargar inventario");
        } finally {
            setLoading(false);
        }
    };

    const fetchTecnicos = async () => {
        try {
            const res = await client.get<Tecnico[]>('/usuarios/');
            setTecnicos(res.data.filter((u) => u.rol === 'tecnico'));
        } catch {
            console.error("Error cargando técnicos");
        }
    };

    useEffect(() => {
        fetchInventario();
        fetchTecnicos();
    }, []);

    const handleAsignarTecnico = async (inventarioId: number, tecnicoId: string) => {
        if (!tecnicoId) return;
        const load = toast.loading("Asignando técnico para retiro...");
        try {
            await client.post(`/clientes/inventario/${inventarioId}/asignar-retiro/${tecnicoId}`);
            toast.success("Técnico asignado correctamente", { id: load });
            fetchInventario();
        } catch {
            toast.error("Error al asignar técnico", { id: load });
        }
    };

    const handleConfirmarRecoleccion = async (eq: EquipoInventario) => {
        if (!confirm(`¿Confirmas que has recuperado el equipo ${eq.identificador}?`)) return;
        const load = toast.loading("Ingresando a stock...");
        try {
            await client.post(`/clientes/inventario/${eq.id}/confirmar-retiro-onu`);
            toast.success("Equipo de vuelta en bodega", { id: load });
            fetchInventario();
        } catch {
            toast.error("Error al procesar", { id: load });
        }
    };

    const handleSuccessfulScan = (codigoEscaneado: string) => {
        const val = codigoEscaneado.toUpperCase();
        setNuevoId(val);

        if (val.startsWith('HWTC')) {
            setTecnologia('GPON');
            setModelo('Huawei EG8141A5');
        } else if (val.startsWith('ZTEG')) {
            setTecnologia('GPON');
            setModelo('ZTE F670L');
        } else if (val.startsWith('ALCL') || val.startsWith('NOK')) {
            setTecnologia('GPON');
            setModelo('Nokia G-2425G-A');
        } else if (val.includes(':')) {
            setTecnologia('EPON');
            setModelo('V-SOL V2801');
        } else {
            setTecnologia('GPON');
        }

        toast.success("¡Código capturado!");
        setIsScanning(false);
    };

    const handleRegistrar = async (e: React.FormEvent) => {
        e.preventDefault();
        const load = toast.loading("Registrando...");
        try {
            await client.post('/inventario/', { identificador: nuevoId, tecnologia, modelo });
            toast.success("Agregado", { id: load });
            setNuevoId(''); setShowModal(false); fetchInventario();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Error"), { id: load });
        }
    };

    const handleEliminar = async (id: number) => {
        if (!confirm("¿Eliminar permanente de la base de datos?")) return;
        try {
            await client.delete(`/inventario/${id}`);
            toast.success("Equipo eliminado con éxito"); 
            fetchInventario();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Error al eliminar"));
        }
    };

    // ================= LÓGICA DE FILTRADO DINÁMICO =================
    
    const zonasUnicas = useMemo(() => {
        const z = equipos.map(e => e.cliente_zona || 'Bodega / Sin Asignar');
        return ['Todas', ...Array.from(new Set(z))].sort();
    }, [equipos]);

    const equiposBaseFiltro = useMemo(() => {
        return equipos.filter(eq => {
            const zonaEq = eq.cliente_zona || 'Bodega / Sin Asignar';
            const matchZone = filtroZona === 'Todas' || zonaEq === filtroZona;
            const matchSearch = busqueda === '' || 
                eq.identificador?.toLowerCase().includes(busqueda.toLowerCase()) || 
                eq.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase());

            return matchZone && matchSearch;
        });
    }, [equipos, filtroZona, busqueda]);

    const stats = useMemo(() => {
        const disponibles = equiposBaseFiltro.filter(e => e.estado === 'DISPONIBLE').length;
        const instalados = equiposBaseFiltro.filter(e => e.estado === 'INSTALADO').length;
        const porRecoger = equiposBaseFiltro.filter(e => e.estado === 'POR_RECOGER').length;
        const conFalla = equiposBaseFiltro.filter(e => e.estado === 'CON_FALLA').length;
        return { total: equiposBaseFiltro.length, disponibles, instalados, porRecoger, conFalla };
    }, [equiposBaseFiltro]);

    const equiposFiltradosFinal = useMemo(() => {
        return equiposBaseFiltro.filter(e => filtroEstado === 'todos' || e.estado === filtroEstado);
    }, [equiposBaseFiltro, filtroEstado]);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 font-sans text-slate-700 dark:text-slate-200 h-[calc(100dvh-80px)] md:h-[calc(100vh-100px)] overflow-hidden transition-colors duration-300">

            {/* ================= HEADER (Idéntico a tu captura) ================= */}
            <div className="flex justify-between items-center bg-white dark:bg-[#12141a] p-4 md:p-5 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors flex-none shrink-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">Bodega e Inventario</h1>
                </div>
                
                <div className="flex gap-2 items-center">
                    {/* Botón Lupa (Solo Móvil) */}
                    <button 
                        onClick={() => setMobileView(mobileView === 'search' ? 'none' : 'search')}
                        className={`sm:hidden p-3 rounded-xl border transition-all ${mobileView === 'search' || busqueda ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-50 dark:bg-[#0a0c10] border-slate-200 dark:border-slate-800 text-slate-500'}`}
                    >
                        <MagnifyingGlassIcon className="w-5 h-5" />
                    </button>
                    
                    {/* Botón Filtro (Solo Móvil) */}
                    <button 
                        onClick={() => setMobileView(mobileView === 'zone' ? 'none' : 'zone')}
                        className={`sm:hidden p-3 rounded-xl border transition-all ${mobileView === 'zone' || filtroZona !== 'Todas' ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-50 dark:bg-[#0a0c10] border-slate-200 dark:border-slate-800 text-slate-500'}`}
                    >
                        <FunnelIcon className="w-5 h-5" />
                    </button>

                    {/* Botón Ingresar (Morado como en tu app) */}
                    <button
                        onClick={() => { setShowModal(true); setIsScanning(false); setModelo(''); setNuevoId(''); }}
                        className="p-3 sm:px-5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-[1rem] font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <UserPlusIcon className="w-5 h-5" /> 
                        <span className="hidden sm:inline text-xs tracking-widest uppercase">Ingresar Equipo</span>
                    </button>
                </div>
            </div>

            {/* ================= BARRAS EXTENDIDAS MÓVIL ================= */}
            {mobileView === 'search' && (
                <div className="sm:hidden relative animate-in slide-in-from-top-2 fade-in flex-none shrink-0">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none" />
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="Buscar por MAC o Cliente..." 
                        value={busqueda} 
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full bg-white dark:bg-[#12141a] border border-indigo-500 rounded-[1.25rem] py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 dark:text-white outline-none shadow-sm placeholder:text-slate-400"
                    />
                </div>
            )}

            {mobileView === 'zone' && (
                <div className="sm:hidden relative animate-in slide-in-from-top-2 fade-in flex-none shrink-0">
                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none" />
                    <select 
                        value={filtroZona} 
                        onChange={e => setFiltroZona(e.target.value)} 
                        className="w-full appearance-none bg-white dark:bg-[#12141a] border border-indigo-500 rounded-[1.25rem] py-3.5 pl-11 pr-10 text-sm font-black text-slate-700 dark:text-slate-300 outline-none shadow-sm cursor-pointer"
                    >
                        {zonasUnicas.map(z => <option key={z} value={z}>{z === 'Todas' ? 'Todas las Zonas' : z}</option>)}
                    </select>
                    <FunnelIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            )}

            {/* ================= BARRAS PC (SIEMPRE VISIBLES) ================= */}
            <div className="hidden sm:flex flex-row gap-3 flex-none shrink-0">
                <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="Buscar por MAC, Serial o Cliente..." 
                        value={busqueda} 
                        onChange={e => setBusqueda(e.target.value)}
                        className="w-full bg-white dark:bg-[#12141a] border border-slate-200 dark:border-slate-800/80 rounded-[1.25rem] py-3.5 pl-11 pr-4 text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm placeholder:text-slate-400"
                    />
                </div>
                
                <div className="relative shrink-0 w-auto">
                    <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                    <select value={filtroZona} onChange={e => setFiltroZona(e.target.value)} className="appearance-none bg-white dark:bg-[#12141a] border border-slate-200 dark:border-slate-800/80 rounded-[1.25rem] py-3.5 pl-10 pr-10 text-xs font-black text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm cursor-pointer">
                        {zonasUnicas.map(z => <option key={z} value={z}>{z === 'Todas' ? 'Todas las Zonas' : z}</option>)}
                    </select>
                    <FunnelIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* TARJETAS ESTADÍSTICAS DINÁMICAS */}
            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:pb-0 scrollbar-none flex-none shrink-0 snap-x">
                <KpiCard title="Total Filtrado" value={stats.total} icon={ArchiveBoxIcon} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-500/10" border="border-indigo-500/20" onClick={() => setFiltroEstado('todos')} active={filtroEstado === 'todos'} />
                <KpiCard title="En Bodega" value={stats.disponibles} icon={CheckBadgeIcon} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" onClick={() => setFiltroEstado('DISPONIBLE')} active={filtroEstado === 'DISPONIBLE'} />
                <KpiCard title="Instalados" value={stats.instalados} icon={WrenchScrewdriverIcon} color="text-purple-600 dark:text-purple-400" bg="bg-purple-500/10" border="border-purple-500/20" onClick={() => setFiltroEstado('INSTALADO')} active={filtroEstado === 'INSTALADO'} />
                <KpiCard title="Por Recoger" value={stats.porRecoger} icon={ArrowDownTrayIcon} color="text-rose-600 dark:text-rose-400" bg="bg-rose-500/10" border="border-rose-500/20" onClick={() => setFiltroEstado('POR_RECOGER')} active={filtroEstado === 'POR_RECOGER'} />
                <KpiCard title="Averiados" value={stats.conFalla} icon={ExclamationTriangleIcon} color="text-red-600 dark:text-red-400" bg="bg-red-500/10" border="border-red-500/20" onClick={() => setFiltroEstado('CON_FALLA')} active={filtroEstado === 'CON_FALLA'} />
            </div>

            {/* LISTA DE EQUIPOS */}
            <div className="flex-1 min-h-0 bg-transparent md:bg-white md:dark:bg-[#12141a] md:rounded-[1.5rem] md:border md:border-slate-200 md:dark:border-slate-800/80 md:shadow-sm overflow-hidden flex flex-col transition-colors duration-200 relative">
                <div className="overflow-y-auto flex-1 custom-scrollbar pb-10 md:pb-0">
                    
                    {/* VISTA ESCRITORIO */}
                    <table className="w-full text-left border-collapse hidden md:table text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4">Equipo y Tecnología</th>
                                <th className="px-6 py-4">Estado / Ubicación</th>
                                <th className="px-6 py-4">Logística</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {loading && equipos.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center"><ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
                            ) : equiposFiltradosFinal.length === 0 ? (
                                <tr><td colSpan={4} className="p-8 text-center text-slate-400 font-bold">No se encontraron equipos con estos filtros.</td></tr>
                            ) : equiposFiltradosFinal.map((eq) => (
                                <tr key={eq.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors bg-transparent text-slate-800 dark:text-slate-200 group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                                                <QrCodeIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                            </div>
                                            <div>
                                                <span className="font-mono font-black text-slate-900 dark:text-white block text-sm tracking-wide">{eq.identificador}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black">{eq.tecnologia} — {eq.modelo}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <EstadoBadge estado={eq.estado} />
                                        {eq.cliente_nombre && (
                                            <div className="mt-2 space-y-1.5">
                                                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                                    <MapPinIcon className="w-3 h-3" /> {eq.cliente_zona || 'Sin Zona'}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-bold">
                                                    <UserIcon className="w-3.5 h-3.5 text-slate-400" /> {eq.cliente_nombre}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {eq.estado === 'POR_RECOGER' ? (
                                            <div className="space-y-1.5 max-w-[200px]">
                                                <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1"><TruckIcon className="w-3 h-3" /> Asignar Técnico</p>
                                                <div className="bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-slate-700/50 rounded-xl px-2 py-1.5 flex items-center shadow-inner">
                                                    <select
                                                        value={eq.tecnico_id || ""}
                                                        onChange={(e) => handleAsignarTecnico(eq.id, e.target.value)}
                                                        className="w-full bg-transparent text-xs text-slate-800 dark:text-white font-bold outline-none cursor-pointer appearance-none"
                                                    >
                                                        <option value="" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">-- Sin asignar --</option>
                                                        {tecnicos.map(t => <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white">{t.nombre_completo || t.usuario}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        ) : eq.estado === 'INSTALADO' ? (
                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg font-bold">Operando</span>
                                        ) : eq.estado === 'CON_FALLA' ? (
                                            <span className="text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded-lg font-bold">Requiere revisión</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg font-bold">En espera</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {(eq.estado === 'DISPONIBLE' || eq.estado === 'CON_FALLA') && (
                                                <button onClick={() => handleEliminar(eq.id)} title="Eliminar equipo" className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/20 rounded-xl border border-slate-200 dark:border-slate-700 transition-all active:scale-95"><TrashIcon className="w-4 h-4" /></button>
                                            )}
                                            {eq.estado === 'POR_RECOGER' && (
                                                <button onClick={() => handleConfirmarRecoleccion(eq)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black hover:bg-emerald-500 transition-all uppercase shadow-md active:scale-95"><CheckBadgeIcon className="w-4 h-4" /> Recibido</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* VISTA MÓVIL (TARJETAS) */}
                    <div className="md:hidden flex flex-col gap-3 px-1 mt-2">
                        {loading && equipos.length === 0 ? (
                            <div className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
                        ) : equiposFiltradosFinal.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 font-bold bg-white dark:bg-[#12141a] rounded-2xl border border-slate-200 dark:border-slate-800">No se encontraron equipos.</div>
                        ) : equiposFiltradosFinal.map((eq) => (
                            <div key={eq.id} className="bg-white dark:bg-[#12141a] rounded-[1.5rem] p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3 shadow-sm relative overflow-hidden transition-colors">

                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex items-start gap-3 overflow-hidden">
                                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0"><QrCodeIcon className="w-5 h-5 text-slate-500" /></div>
                                        <div className="overflow-hidden">
                                            <span className="font-mono font-black text-slate-900 dark:text-white text-base block leading-tight tracking-wide">{eq.identificador}</span>
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-black block mt-0.5 truncate">{eq.tecnologia} — {eq.modelo}</span>
                                        </div>
                                    </div>
                                    <EstadoBadge estado={eq.estado} />
                                </div>

                                {eq.cliente_nombre && (
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40 text-[11px] space-y-2">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider w-fit border border-indigo-100 dark:border-indigo-500/20">
                                            <MapPinIcon className="w-3 h-3" /> {eq.cliente_zona || 'Sin Zona'}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-white font-bold truncate text-xs">
                                            <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>{eq.cliente_nombre}</span>
                                        </div>
                                    </div>
                                )}

                                {eq.estado === 'POR_RECOGER' ? (
                                    <div className="flex flex-col gap-2.5 border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-1">
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 shadow-inner">
                                            <TruckIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                            <select
                                                value={eq.tecnico_id || ""}
                                                onChange={(e) => handleAsignarTecnico(eq.id, e.target.value)} 
                                                className="w-full bg-transparent text-slate-800 dark:text-slate-300 font-bold outline-none text-xs cursor-pointer appearance-none"
                                            >
                                                <option value="" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white">Asignar técnico...</option>
                                                {tecnicos.map(t => <option key={t.id} value={t.id} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-white">{t.nombre_completo || t.usuario}</option>)}
                                            </select>
                                        </div>

                                        <button onClick={() => handleConfirmarRecoleccion(eq)} className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-emerald-600 text-white font-black rounded-xl text-[11px] uppercase tracking-widest shadow-md active:scale-95 transition-all">
                                            <CheckBadgeIcon className="w-5 h-5" /> <span>CONFIRMAR RETORNO</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/50 pt-3 mt-1">
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold italic">
                                            {eq.estado === 'INSTALADO' ? '📡 Operando en campo' : eq.estado === 'CON_FALLA' ? '❌ Equipo Averiado' : '📦 En bodega'}
                                        </p>
                                        {(eq.estado === 'DISPONIBLE' || eq.estado === 'CON_FALLA') && (
                                            <button onClick={() => handleEliminar(eq.id)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/20 rounded-xl active:scale-90 transition-all border border-slate-200 dark:border-slate-700">
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

            {/* MODAL INGRESAR EQUIPO (BOTTOM SHEET MOBILE) */}
            <Transition appear show={showModal} as={Fragment}>
                <Dialog as="div" className="relative z-[200]" onClose={() => { setShowModal(false); setIsScanning(false); }}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/80 backdrop-blur-md" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-hidden flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <Dialog.Panel className="w-full sm:max-w-md bg-white dark:bg-[#12141a] rounded-t-[2rem] sm:rounded-3xl shadow-2xl flex flex-col relative transition-all duration-300">
                            
                            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

                            <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-white dark:bg-[#12141a] rounded-t-[2rem] sm:rounded-t-none">
                                <h3 className="text-slate-900 dark:text-white font-black text-lg flex items-center gap-2">
                                    <ArchiveBoxIcon className="w-6 h-6 text-indigo-500" /> Nuevo Equipo
                                </h3>
                                <button onClick={() => { setShowModal(false); setIsScanning(false); }} className="text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors active:scale-95"><XMarkIcon className="w-5 h-5" /></button>
                            </div>

                            <div className="p-5 space-y-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
                                {isScanning ? (
                                    <div className="bg-black rounded-3xl overflow-hidden border border-slate-300 dark:border-slate-700 relative w-full aspect-square scanner-container shadow-inner">
                                        <style>{`
                                            .scanner-container svg, 
                                            .scanner-container div[style*="box-shadow"],
                                            .scanner-container div[style*="border"] { display: none !important; }
                                        `}</style>
                                        <div className="absolute top-1/2 left-6 right-6 h-[3px] bg-red-500 shadow-[0_0_20px_#ef4444] z-[60] -translate-y-1/2 pointer-events-none rounded-full animate-pulse"></div>
                                        <Scanner
                                            onScan={(res) => { if (res) handleSuccessfulScan(Array.isArray(res) ? res[0].rawValue : res); }}
                                            formats={['qr_code', 'code_128', 'code_39', 'ean_13']}
                                            components={{ tracker: () => null }}
                                        />
                                        <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg z-[100] active:scale-95 transition-transform">
                                            Cancelar
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsScanning(true)} className="w-full py-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 bg-slate-50 dark:bg-[#0a0c10] rounded-3xl flex flex-col items-center gap-2 transition-all group cursor-pointer active:scale-[0.98]">
                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm group-hover:scale-110 transition-transform"><CameraIcon className="w-8 h-8 text-indigo-500" /></div>
                                        <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Escanear Código (MAC/SN)</span>
                                    </button>
                                )}

                                <form onSubmit={handleRegistrar} className="space-y-4 pt-2">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">Identificador Manual</label>
                                        <input type="text" placeholder="Ej. HWTCB991C1AE" className="w-full bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 text-slate-900 dark:text-white font-mono uppercase font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner" value={nuevoId} onChange={(e) => setNuevoId(e.target.value.toUpperCase())} required />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">Tecnología</label>
                                            <select className="w-full bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 text-slate-800 dark:text-white font-black text-xs outline-none focus:border-indigo-500 appearance-none shadow-inner" value={tecnologia} onChange={e => setTecnologia(e.target.value)}>
                                                <option value="GPON">GPON</option>
                                                <option value="EPON">EPON</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5 ml-1">Modelo</label>
                                            <input
                                                list="modelos-onu"
                                                placeholder="Ej. ZTE F670L"
                                                className="w-full bg-slate-50 dark:bg-[#0a0c10] border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 text-slate-900 dark:text-white font-bold text-xs outline-none focus:border-indigo-500 transition-all shadow-inner"
                                                value={modelo}
                                                onChange={e => setModelo(e.target.value)}
                                                required
                                            />
                                            <datalist id="modelos-onu">
                                                <option value="ZTE F670L" />
                                                <option value="ZTE F660" />
                                                <option value="Huawei HG8145V5" />
                                                <option value="Nokia G-2425G-A" />
                                                <option value="V-SOL V2801" />
                                            </datalist>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] uppercase text-[11px] tracking-widest mt-4">Guardar Equipo en Stock</button>
                                </form>
                            </div>
                        </Dialog.Panel>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}

const KpiCard = ({ title, value, icon: Icon, color, bg, border, onClick, active }: KpiCardProps) => (
    <button type="button" onClick={onClick} className={`p-4 text-left rounded-[1.25rem] border cursor-pointer transition-all shrink-0 min-w-[140px] snap-start flex-1 flex flex-col justify-between ${active ? `border-indigo-500 bg-white dark:bg-[#12141a] shadow-md ring-4 ring-indigo-500/10` : `border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#12141a]/60 hover:bg-slate-50 dark:hover:bg-[#12141a] shadow-sm`}`}>
        <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <div className={`p-1.5 rounded-xl border ${bg} ${border}`}><Icon className={`w-4 h-4 ${color}`} /></div>
        </div>
        <p className={`text-2xl font-black ${active ? color : 'text-slate-800 dark:text-white'}`}>{value}</p>
    </button>
);

const EstadoBadge = ({ estado }: { estado: string }) => {
    switch (estado) {
        case 'DISPONIBLE': return <span className="px-2 py-1 rounded-md border text-[9px] font-black bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 tracking-widest">BODEGA</span>;
        case 'INSTALADO': return <span className="px-2 py-1 rounded-md border text-[9px] font-black bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-500/20 tracking-widest">INSTALADO</span>;
        case 'POR_RECOGER': return <span className="px-2 py-1 rounded-md border text-[9px] font-black bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 animate-pulse tracking-widest">A RECOGER</span>;
        case 'CON_FALLA': return <span className="px-2 py-1 rounded-md border text-[9px] font-black bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20 tracking-widest">AVERÍA</span>;
        default: return <span className="px-2 py-1 rounded-md border text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 tracking-widest">{estado}</span>;
    }
};
