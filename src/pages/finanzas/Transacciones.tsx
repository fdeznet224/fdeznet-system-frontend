import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from 'react';
import client from '../../api/axios'; 
import { toast } from 'react-hot-toast';
import { 
    ArrowPathIcon,
    MagnifyingGlassIcon, FunnelIcon,
    CalendarDaysIcon, UserIcon, TicketIcon, CreditCardIcon
} from '@heroicons/react/24/outline';

interface PaymentReportItem {
    id: number;
    cliente_nombre: string;
    factura_id: number;
    metodo: string;
    fecha: string;
    usuario_nombre: string;
    monto: number | string;
    zona_nombre?: string;
    router_nombre?: string;
}

interface UserCatalog {
    id: number;
    nombre_completo?: string | null;
    usuario: string;
}

interface RouterCatalog {
    id: number;
    nombre: string;
}
interface ZoneCatalog { id: number; nombre: string; }

interface PaymentReportResponse {
    detalles?: PaymentReportItem[];
}

interface TransactionFilters {
    fechaInicio: string;
    fechaFin: string;
    usuarioId: string;
    routerId: string;
    zonaId: string;
}

export default function Transacciones() {
    const [pagos, setPagos] = useState<PaymentReportItem[]>([]);
    const [usuarios, setUsuarios] = useState<UserCatalog[]>([]);
    const [routers, setRouters] = useState<RouterCatalog[]>([]);
    const [zonas, setZonas] = useState<ZoneCatalog[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Control de filtros en móvil
    const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false);
    
    const getHoyLocal = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [filtros, setFiltros] = useState<TransactionFilters>({
        fechaInicio: getHoyLocal(),
        fechaFin: getHoyLocal(),
        usuarioId: '', 
        routerId: '',
        zonaId: ''
    });
    const filtrosRef = useRef(filtros);
    filtrosRef.current = filtros;

    const fetchPagos = useCallback(async () => {
        setLoading(true);
        const currentFilters = filtrosRef.current;
        try {
            const params = new URLSearchParams({
                start_date: currentFilters.fechaInicio,
                end_date: currentFilters.fechaFin,
                ...(currentFilters.usuarioId && { usuario_id: currentFilters.usuarioId }),
                ...(currentFilters.routerId && { router_id: currentFilters.routerId }),
                ...(currentFilters.zonaId && { zona_id: currentFilters.zonaId })
            }).toString();

            const res = await client.get<PaymentReportResponse>(`/finanzas/pagos-reporte?${params}`);
            const detalles = res.data.detalles ?? [];
            setPagos(detalles);
            setMostrarFiltrosMovil(false);

            if (detalles.length === 0) {
                toast("No hay movimientos en este rango", { icon: 'ℹ️' });
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al obtener reporte");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [u, r, z] = await Promise.all([
                    client.get<UserCatalog[]>('/usuarios/'),
                    client.get<RouterCatalog[]>('/network/routers/'),
                    client.get<ZoneCatalog[]>('/zonas/')
                ]);
                setUsuarios(u.data); 
                setRouters(r.data);
                setZonas(z.data);
            } catch (e) { 
                console.error("Error metadatos", e);
            }
            void fetchPagos();
        };
        void loadMetadata();
    }, [fetchPagos]);

    const handleFilterChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFiltros((current) => ({ ...current, [event.target.name]: event.target.value }));
    };

    const totalMostrado = useMemo(() => {
        return pagos.reduce((acc, curr) => acc + Number(curr.monto), 0);
    }, [pagos]);
    const totalPorMetodo = useMemo(() => pagos.reduce<Record<string, number>>((totales, pago) => {
        totales[pago.metodo] = (totales[pago.metodo] || 0) + Number(pago.monto);
        return totales;
    }, {}), [pagos]);

    return (
        /* ✅ ADAPTADO: Fondo base adaptativo */
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-700 dark:text-slate-200 pb-12 transition-colors duration-300">
            
            {/* HEADER MINIMALISTA */}
            <div className="flex justify-between items-center px-1 md:px-0 flex-none">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">Corte de Cobranza</h2>
                </div>
                
                <button 
                    onClick={() => setMostrarFiltrosMovil(!mostrarFiltrosMovil)}
                    className={`md:hidden p-2.5 rounded-xl border transition-all ${mostrarFiltrosMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500'}`}
                >
                    <FunnelIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(totalPorMetodo).map(([metodo, total]) => (
                    <div key={metodo} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[9px] uppercase font-black text-slate-400">{metodo}</span>
                        <p className="text-lg font-black text-slate-900 dark:text-white">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                ))}
            </div>

            {/* TOTAL EN PANTALLA ADAPTATIVO */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-between items-center flex-none transition-colors">
                <div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Total en Pantalla</span>
                    <p className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 transition-colors">
                        ${totalMostrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md font-bold font-mono transition-colors">
                        {pagos.length} Movimientos
                    </span>
                </div>
            </div>
            
            {/* FILTROS ESCRITORIO */}
            <div className="hidden md:grid bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid-cols-6 gap-4 items-end shadow-sm flex-none transition-colors">
                <div>
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-1">Inicio</label>
                    <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFilterChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-white text-xs outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-1">Fin</label>
                    <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleFilterChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-white text-xs outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-1">Operador</label>
                    <select name="usuarioId" value={filtros.usuarioId} onChange={handleFilterChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-white text-xs outline-none focus:border-indigo-500 transition-colors cursor-pointer">
                        <option value="">-- Todos --</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo || u.usuario}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-1">Zona</label>
                    <select name="zonaId" value={filtros.zonaId} onChange={handleFilterChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-white text-xs outline-none focus:border-indigo-500 transition-colors cursor-pointer">
                        <option value="">-- Todas --</option>
                        {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 dark:text-slate-500 block mb-1">Router</label>
                    <select name="routerId" value={filtros.routerId} onChange={handleFilterChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-white text-xs outline-none focus:border-indigo-500 transition-colors cursor-pointer">
                        <option value="">-- Todos --</option>
                        {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <button onClick={fetchPagos} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-[38px] rounded-lg flex items-center justify-center gap-2 font-black text-xs transition active:scale-95 shadow-md disabled:opacity-50">
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <MagnifyingGlassIcon className="w-4 h-4" />} 
                        Buscar
                    </button>
                </div>
            </div>

            {/* FILTROS MÓVIL */}
            {mostrarFiltrosMovil && (
                <div className="md:hidden bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-3 transition-colors">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">Fecha Inicio</label>
                            <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFilterChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-white text-xs outline-none" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">Fecha Fin</label>
                            <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleFilterChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-white text-xs outline-none" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">Cajero</label>
                            <select name="usuarioId" value={filtros.usuarioId} onChange={handleFilterChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-white text-xs outline-none">
                                <option value="">Todos</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo || u.usuario}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase block mb-1">Router</label>
                            <select name="routerId" value={filtros.routerId} onChange={handleFilterChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-white text-xs outline-none">
                                <option value="">Todos</option>
                                {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={fetchPagos} disabled={loading} className="w-full bg-indigo-600 py-3 rounded-lg flex items-center justify-center gap-2 font-black text-xs shadow-md active:scale-95 text-white disabled:opacity-50 mt-1 uppercase tracking-widest">
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <MagnifyingGlassIcon className="w-4 h-4" />} 
                        Consultar
                    </button>
                </div>
            )}

            {/* TABLA PRINCIPAL ADAPTATIVA */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-xl overflow-hidden flex flex-col transition-colors">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400 border-collapse hidden md:table">
                        <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-200 uppercase font-black sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
                            <tr>
                                <th className="p-4">ID Pago</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Factura</th>
                                <th className="p-4 text-center">Método</th>
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Cajero</th>
                                <th className="p-4 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {loading && pagos.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-indigo-600 dark:text-indigo-500"/></td></tr>
                            ) : pagos.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-slate-400 dark:text-slate-500 italic">No hay datos.</td></tr>
                            ) : (
                                pagos.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition group bg-transparent">
                                        <td className="p-4 font-mono text-slate-400">#{p.id}</td>
                                        <td className="p-4 font-black text-slate-800 dark:text-white">{p.cliente_nombre}</td>
                                        <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">#{p.factura_id}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${p.metodo === 'efectivo' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'}`}>
                                                {p.metodo}
                                            </span>
                                        </td>
                                        <td className="p-4">{new Date(p.fecha).toLocaleString()}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300 font-bold">{p.usuario_nombre}</td>
                                        <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                                            +${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* VISTA MÓVIL ADAPTATIVA */}
                    <div className="md:hidden flex flex-col gap-2.5 p-2 pb-24">
                        {loading && pagos.length === 0 ? (
                            <div className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-indigo-600 dark:text-indigo-500"/></div>
                        ) : pagos.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 dark:text-slate-500 text-xs italic">No hay registros financieros hoy.</div>
                        ) : (
                            pagos.map((p) => (
                                <div key={p.id} className="bg-white dark:bg-slate-900/90 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 shadow-sm transition-colors">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-mono text-[9px] text-slate-400 block">TICKET #{p.id}</span>
                                            <h3 className="font-black text-slate-800 dark:text-white text-sm mt-0.5 leading-tight">{p.cliente_nombre}</h3>
                                        </div>
                                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                                            +${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-[11px] transition-colors">
                                        <div className="space-y-0.5 overflow-hidden">
                                            <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Referencia</span>
                                            <p className="text-indigo-600 dark:text-indigo-400 font-mono font-bold flex items-center gap-1">
                                                <TicketIcon className="w-3.5 h-3.5 text-slate-500" /> Factura #{p.factura_id}
                                            </p>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Forma de Pago</span>
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${p.metodo === 'efectivo' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-400 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'}`}>
                                                <CreditCardIcon className="w-3 h-3" /> {p.metodo}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800/60 pt-2 mt-0.5 transition-colors">
                                        <span className="flex items-center gap-1">
                                            <CalendarDaysIcon className="w-3.5 h-3.5" /> 
                                            {new Date(p.fecha).toLocaleDateString()} {new Date(p.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                        <span className="flex items-center gap-1 font-bold">
                                            <UserIcon className="w-3 h-3 text-slate-400" /> {p.usuario_nombre}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
