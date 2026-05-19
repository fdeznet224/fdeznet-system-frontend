import { useState, useEffect, useMemo } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    MagnifyingGlassIcon, ArrowPathIcon, FunnelIcon, 
    CalendarDaysIcon, UserIcon, TicketIcon, CreditCardIcon
} from '@heroicons/react/24/outline';

export default function Transacciones() {
    const [pagos, setPagos] = useState<any[]>([]);
    const [usuarios, setUsuarios] = useState<any[]>([]);
    const [routers, setRouters] = useState<any[]>([]);
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

    const [filtros, setFiltros] = useState({
        fechaInicio: getHoyLocal(),
        fechaFin: getHoyLocal(),
        usuarioId: '', 
        routerId: ''
    });

    useEffect(() => {
        const loadMetadata = async () => {
            try {
                const [u, r] = await Promise.all([
                    client.get('/usuarios/'), 
                    client.get('/network/routers/') 
                ]);
                setUsuarios(u.data); 
                setRouters(r.data);
            } catch (e) { 
                console.error("Error metadatos", e);
            }
            fetchPagos();
        };
        loadMetadata();
    }, []);

    const fetchPagos = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                start_date: filtros.fechaInicio, 
                end_date: filtros.fechaFin,
                ...(filtros.usuarioId && { usuario_id: filtros.usuarioId }),
                ...(filtros.routerId && { router_id: filtros.routerId })
            }).toString();

            const res = await client.get(`/finanzas/pagos-reporte?${params}`);
            setPagos(res.data.detalles || []);
            setMostrarFiltrosMovil(false); // Cerramos panel en móvil al buscar
            
            if ((res.data.detalles || []).length === 0) {
                toast("No hay movimientos en este rango", { icon: 'ℹ️' });
            }
        } catch (error) { 
            console.error(error);
            toast.error("Error al obtener reporte"); 
        } finally { 
            setLoading(false); 
        }
    };

    const handleFilterChange = (e: any) => setFiltros({ ...filtros, [e.target.name]: e.target.value });

    const totalMostrado = useMemo(() => {
        return pagos.reduce((acc, curr) => acc + Number(curr.monto), 0);
    }, [pagos]);

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-200 pb-12">
            
            {/* =========================================================
                HEADER MINIMALISTA (SÓLO TEXTO PURO)
               ========================================================= */}
            <div className="flex justify-between items-center px-1 md:px-0 flex-none">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Transacciones y Caja</h2>
                </div>
                
                {/* Botón Filtros Interactivos (Solo Móvil) */}
                <button 
                    onClick={() => setMostrarFiltrosMovil(!mostrarFiltrosMovil)}
                    className={`md:hidden p-2.5 rounded-xl border transition-all ${mostrarFiltrosMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700/80 text-slate-400'}`}
                >
                    <FunnelIcon className="w-4 h-4" />
                </button>
            </div>

            {/* =========================================================
                TOTAL EN BODEGA / PANTALLA (REDISEÑO DE BALANCE)
               ========================================================= */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-xl border border-slate-800 shadow-md flex justify-between items-center flex-none">
                <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Total en Pantalla</span>
                    <p className="text-2xl md:text-3xl font-black text-emerald-400 mt-0.5">
                        ${totalMostrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-[9px] bg-slate-800/80 text-slate-400 px-2 py-1 rounded-md font-bold font-mono">
                        {pagos.length} Movimientos
                    </span>
                </div>
            </div>
            
            {/* =========================================================
                FILTROS (GRID FIJO EN PC / COMPACTO DESPLEGABLE EN MÓVIL)
               ========================================================= */}
            {/* Filtros Escritorio */}
            <div className="hidden md:grid bg-slate-800 p-4 rounded-xl border border-slate-700 grid-cols-5 gap-4 items-end shadow-lg flex-none">
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Inicio</label>
                    <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFilterChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Fin</label>
                    <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleFilterChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Operador</label>
                    <select name="usuarioId" value={filtros.usuarioId} onChange={handleFilterChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors cursor-pointer">
                        <option value="">-- Todos --</option>
                        {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo || u.usuario}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 block mb-1">Router</label>
                    <select name="routerId" value={filtros.routerId} onChange={handleFilterChange} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors cursor-pointer">
                        <option value="">-- Todos --</option>
                        {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <button onClick={fetchPagos} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-[34px] rounded-lg flex items-center justify-center gap-2 font-bold text-xs transition active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50">
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <MagnifyingGlassIcon className="w-4 h-4" />} 
                        Buscar
                    </button>
                </div>
            </div>

            {/* Filtros Móvil Desplegables */}
            {mostrarFiltrosMovil && (
                <div className="md:hidden bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl space-y-3 animate-fadeIn flex-none">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Fecha Inicio</label>
                            <input type="date" name="fechaInicio" value={filtros.fechaInicio} onChange={handleFilterChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs outline-none" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Fecha Fin</label>
                            <input type="date" name="fechaFin" value={filtros.fechaFin} onChange={handleFilterChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs outline-none" />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 border-t border-slate-800/60 pt-2.5">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Cajero / Operador</label>
                            <select name="usuarioId" value={filtros.usuarioId} onChange={handleFilterChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs outline-none">
                                <option value="">Todos</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_completo || u.usuario}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Router / Nodo</label>
                            <select name="routerId" value={filtros.routerId} onChange={handleFilterChange} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs outline-none">
                                <option value="">Todos</option>
                                {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <button onClick={fetchPagos} disabled={loading} className="w-full bg-indigo-600 py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold text-xs shadow-md active:scale-95 text-white disabled:opacity-50 mt-1">
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <MagnifyingGlassIcon className="w-4 h-4" />} 
                        <span>CONSULTAR CAJA Y MOVIMIENTOS</span>
                    </button>
                </div>
            )}

            {/* =========================================================
                ZONA DE RENDERIZADO PRINCIPAL
               ========================================================= */}
            <div className="flex-1 bg-slate-800 md:border border-slate-700/50 rounded-2xl overflow-hidden shadow-xl flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* 🖥️ COMPONENTE: TABLA ESCRITORIO */}
                    <table className="w-full text-left text-xs text-slate-400 border-collapse hidden md:table">
                        <thead className="bg-slate-900 text-slate-200 uppercase font-bold sticky top-0 z-10 shadow-md border-b border-slate-700">
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
                        <tbody className="divide-y divide-slate-700/50">
                            {loading && pagos.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-indigo-500"/></td></tr>
                            ) : pagos.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-slate-500 italic">No hay datos para mostrar.</td></tr>
                            ) : (
                                pagos.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-700/30 transition group bg-transparent">
                                        <td className="p-4 font-mono text-slate-500">#{p.id}</td>
                                        <td className="p-4 font-bold text-white text-sm">{p.cliente_nombre}</td>
                                        <td className="p-4 font-mono text-indigo-300">#{p.factura_id}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${p.metodo === 'efectivo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                {p.metodo}
                                            </span>
                                        </td>
                                        <td className="p-4">{new Date(p.fecha).toLocaleString()}</td>
                                        <td className="p-4 text-slate-300">{p.usuario_nombre}</td>
                                        <td className="p-4 text-right font-bold text-emerald-400 text-sm">
                                            +${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* 📱 COMPONENTE: ARCHIVO DE CARDS MÓVILES (NATIVO RÁPIDO) */}
                    <div className="md:hidden flex flex-col gap-2.5 p-2 pb-24">
                        {loading && pagos.length === 0 ? (
                            <div className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-indigo-500"/></div>
                        ) : pagos.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs italic">No hay registros financieros hoy.</div>
                        ) : (
                            pagos.map((p) => (
                                <div key={p.id} className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex flex-col gap-2.5 shadow-md">
                                    
                                    {/* Cabecera Tarjeta: ID de Pago y Monto Líquido */}
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span className="font-mono text-[9px] text-slate-500 block">TICKET #{p.id}</span>
                                            <h3 className="font-bold text-white text-sm mt-0.5 leading-tight">{p.cliente_nombre}</h3>
                                        </div>
                                        {/* Monto destacado en verde */}
                                        <span className="text-base font-black text-emerald-400 shrink-0">
                                            +${Number(p.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    {/* Bloque Informativo Interno */}
                                    <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                                        <div className="space-y-0.5 overflow-hidden">
                                            <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Referencia</span>
                                            <p className="text-indigo-300 font-mono font-bold flex items-center gap-1">
                                                <TicketIcon className="w-3.5 h-3.5 text-slate-500" /> Factura #{p.factura_id}
                                            </p>
                                        </div>
                                        <div className="text-right space-y-0.5">
                                            <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Forma de Pago</span>
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase border ${p.metodo === 'efectivo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                                <CreditCardIcon className="w-3 h-3" /> {p.metodo}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Pie de Tarjeta: Registro de Auditoría (Fecha y Cajero) */}
                                    <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <CalendarDaysIcon className="w-3.5 h-3.5" /> 
                                            {new Date(p.fecha).toLocaleDateString()} {new Date(p.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                        <span className="flex items-center gap-1 font-medium text-slate-400">
                                            <UserIcon className="w-3 h-3 text-slate-600" /> {p.usuario_nombre}
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