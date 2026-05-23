import { useState, useEffect } from 'react';
import client from '../../api/axios'; 
import { toast } from 'react-hot-toast';
import { 
    ArrowPathIcon,
    MagnifyingGlassIcon, FunnelIcon,
    PrinterIcon, BanknotesIcon, ClockIcon, ShieldExclamationIcon
} from '@heroicons/react/24/outline';
import PaymentModal from '../../components/modals/PaymentModal';

export default function Facturas() {
    const [facturas, setFacturas] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const [routers, setRouters] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedFactura, setSelectedFactura] = useState<any>(null);

    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

    const [filtros, setFiltros] = useState({
        inicio: firstDay,
        fin: lastDay,
        tipoFecha: 'emision',
        routerId: '',
        estado: 'cualquiera'
    });

    useEffect(() => {
        client.get('/network/routers/').then(r => setRouters(r.data));
        fetchFacturas();
    }, []);

    const fetchFacturas = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                start_date: filtros.inicio,
                end_date: filtros.fin,
                tipo_fecha: filtros.tipoFecha,
                estado: filtros.estado,
                ...(filtros.routerId && { router_id: filtros.routerId })
            }).toString();

            const res = await client.get(`/finanzas/listado-completo?${params}`);
            setFacturas(res.data.items);
            setResumen(res.data.resumen);
            setMostrarFiltrosMovil(false);
        } catch {
            toast.error("Error cargando facturas");
        } finally {
            setLoading(false);
        }
    };

    return (
        /* 🔥 CLAVE 1: h-[calc(100dvh-80px)] y overflow-hidden evitan que toda la página baje */
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-700 dark:text-slate-200 h-[calc(100dvh-80px)] md:h-[calc(100vh-100px)] overflow-hidden transition-colors duration-300">
            
            {/* HEADER (Fijo) */}
            <div className="flex justify-between items-center px-1 md:px-0 flex-none shrink-0">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight transition-colors">
                        Gestión Financiera
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] md:text-sm mt-0.5 hidden sm:block">Control de facturación y cobranza centralizada</p>
                </div>
                
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => setMostrarFiltrosMovil(!mostrarFiltrosMovil)}
                        className={`md:hidden p-2.5 rounded-xl border transition-all shadow-sm ${mostrarFiltrosMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
                    >
                        <FunnelIcon className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => { /* lógica masiva */ }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2.5 md:px-4 md:py-2.5 rounded-xl font-extrabold shadow-md active:scale-95 transition text-[10px] md:text-sm tracking-wide uppercase md:normal-case"
                    >
                        <span>Emisión Masiva</span>
                    </button>
                </div>
            </div>

            {/* KPI RESUMEN (Fijo) */}
            {resumen && (
                <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:pb-0 scrollbar-none flex-none shrink-0">
                    <ResumenCard label="Pagado" cantidad={resumen.pagadas_cant} total={resumen.pagadas_total} color="emerald" />
                    <ResumenCard label="Pendiente" cantidad={resumen.pendientes_cant} total={resumen.pendientes_total} color="amber" />
                    <ResumenCard label="Vencido" cantidad={resumen.vencidas_cant} total={resumen.vencidas_total} color="rose" />
                    <ResumenCard label="Anulado" cantidad={resumen.anuladas_cant} total={resumen.anuladas_total} color="slate" />
                </div>
            )}

            {/* FILTROS MÓVIL DESPLEGABLES (Fijo cuando se abre) */}
            {mostrarFiltrosMovil && (
                <div className="md:hidden bg-white dark:bg-[#1a1f2e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg space-y-3 flex-none shrink-0 animate-in fade-in slide-in-from-top-2 z-10 relative">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Desde</label>
                            <input type="date" className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-700 rounded-lg w-full text-xs text-slate-800 dark:text-white p-2 outline-none focus:border-blue-500" value={filtros.inicio} onChange={e => setFiltros({ ...filtros, inicio: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Hasta</label>
                            <input type="date" className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-700 rounded-lg w-full text-xs text-slate-800 dark:text-white p-2 outline-none focus:border-blue-500" value={filtros.fin} onChange={e => setFiltros({ ...filtros, fin: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 block">Nodo / Router</label>
                        <select className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-700 rounded-lg w-full text-xs text-slate-800 dark:text-white p-2 outline-none focus:border-blue-500" value={filtros.routerId} onChange={e => setFiltros({ ...filtros, routerId: e.target.value })}>
                            <option value="">-- Todos --</option>
                            {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1 block">Filtrar Estado</label>
                        <select className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-700 rounded-lg w-full text-xs text-slate-800 dark:text-white p-2 font-bold outline-none focus:border-blue-500" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
                            <option value="cualquiera">Todos los estados</option>
                            <option value="pagada">✅ Pagadas</option>
                            <option value="pendiente">⏳ Pendientes</option>
                            <option value="promesa">🤝 Promesas</option>
                            <option value="anulada">❌ Anuladas</option>
                        </select>
                    </div>
                    <button onClick={fetchFacturas} className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm transition active:scale-95 shadow-md mt-2">
                        {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <MagnifyingGlassIcon className="w-5 h-5" />}
                        Aplicar Filtros
                    </button>
                </div>
            )}
            
            {/* FILTROS ESCRITORIO (Fijo) */}
            <div className="hidden md:grid bg-white dark:bg-[#1a1f2e] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 grid-cols-6 gap-4 items-end shadow-sm dark:shadow-xl flex-none shrink-0 transition-colors">
                <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">Tipo Fecha</label>
                    <select className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-700 rounded-lg w-full text-xs text-slate-800 dark:text-white p-2 outline-none focus:border-blue-500 transition-colors" value={filtros.tipoFecha} onChange={e => setFiltros({ ...filtros, tipoFecha: e.target.value })}>
                        <option value="emision">Fecha Emisión</option>
                        <option value="vencimiento">Fecha Vencimiento</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">Desde</label>
                    <input type="date" className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-700 rounded-lg w-full text-xs text-slate-800 dark:text-white p-2 outline-none focus:border-blue-500 transition-colors" value={filtros.inicio} onChange={e => setFiltros({ ...filtros, inicio: e.target.value })} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">Hasta</label>
                    <input type="date" className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-700 rounded-lg w-full text-xs text-slate-800 dark:text-white p-2 outline-none focus:border-blue-500 transition-colors" value={filtros.fin} onChange={e => setFiltros({ ...filtros, fin: e.target.value })} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5 block">Nodo / Router</label>
                    <select className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-700 rounded-lg w-full text-xs text-slate-800 dark:text-white p-2 outline-none focus:border-blue-500 transition-colors cursor-pointer" value={filtros.routerId} onChange={e => setFiltros({ ...filtros, routerId: e.target.value })}>
                        <option value="">-- Todos --</option>
                        {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-wider mb-1.5 block">Filtrar Estado</label>
                    <select className="bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-700 rounded-lg w-full text-xs text-slate-800 dark:text-white p-2 font-bold outline-none focus:border-blue-500 transition-colors" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
                        <option value="cualquiera">Todos los estados</option>
                        <option value="pagada">✅ Pagadas</option>
                        <option value="pendiente">⏳ Pendientes</option>
                        <option value="promesa">🤝 Promesas</option>
                        <option value="anulada">❌ Anuladas</option>
                    </select>
                </div>
                <button onClick={fetchFacturas} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-[36px] rounded-xl flex items-center justify-center gap-2 font-black text-xs transition active:scale-95 shadow-md">
                    {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin"/> : <MagnifyingGlassIcon className="w-4 h-4" />}
                    Filtrar
                </button>
            </div>

            {/* 🔥 CLAVE 2: flex-1 y min-h-0 le dice a este bloque que tome el resto del espacio y permita el scroll interno */}
            <div className="flex-1 min-h-0 md:bg-white md:dark:bg-[#1a1f2e] md:rounded-2xl md:border md:border-slate-200 md:dark:border-slate-800 md:shadow-xl overflow-hidden flex flex-col transition-colors relative">
                
                {/* 🔥 CLAVE 3: overflow-y-auto en este div envuelve la tabla y las tarjetas para que hagan scroll solas */}
                <div className="overflow-y-auto flex-1 custom-scrollbar pb-10">
                    
                    {/* --- VISTA DESKTOP (TABLA) --- */}
                    <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400 border-collapse hidden md:table">
                        <thead className="bg-slate-100 dark:bg-[#0f1219] text-slate-600 dark:text-slate-200 uppercase font-black sticky top-0 z-10 shadow-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
                            <tr>
                                <th className="p-4">Folio</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Vencimiento / Prórroga</th>
                                <th className="p-4">Total</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {loading && facturas.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-blue-500"/></td></tr>
                            ) : facturas.map(f => {
                                const isVencida = new Date(f.fecha_vencimiento) < new Date() && f.estado === 'pendiente';
                                return (
                                    <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition group bg-transparent">
                                        <td className="p-4 font-mono text-slate-400">#{f.id.toString().padStart(6, '0')}</td>
                                        <td className="p-4">
                                            <div className="font-black text-slate-800 dark:text-white text-sm">{f.cliente?.nombre}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{f.cliente?.ip_asignada}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" /> {f.fecha_vencimiento}</span>
                                                {f.es_promesa_activa && (
                                                    <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20 text-[9px] font-black flex items-center gap-1 w-fit">
                                                        <ShieldExclamationIcon className="w-3 h-3" /> PROMESA: {f.fecha_promesa_pago}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-black text-slate-800 dark:text-white">${f.total}</div>
                                            <div className="text-[9px] text-slate-500 truncate max-w-[120px]">{f.plan_snapshot}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black border ${f.estado === 'pagada' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                                                    f.estado === 'anulada' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700' :
                                                        isVencida ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' :
                                                            'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                                                }`}>
                                                {f.estado === 'pendiente' && isVencida ? 'VENCIDA' : f.estado}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {f.estado !== 'pagada' && f.estado !== 'anulada' && (
                                                    <button onClick={() => { setSelectedFactura(f); setShowPaymentModal(true); }} className="text-emerald-600 dark:text-emerald-400 hover:text-white hover:bg-emerald-600 p-2 rounded-lg transition border border-emerald-200 dark:border-emerald-500/20" title="Cobrar"><BanknotesIcon className="w-4 h-4" /></button>
                                                )}
                                                <button className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg border border-slate-200 dark:border-slate-700 transition" title="PDF"><PrinterIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* --- VISTA MÓVIL (TARJETAS) --- */}
                    <div className="md:hidden flex flex-col gap-3 px-1 pb-10">
                        {loading && facturas.length === 0 ? (
                            <div className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-blue-500"/></div>
                        ) : facturas.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 font-bold">No se encontraron facturas.</div>
                        ) : facturas.map(f => {
                            const isVencida = new Date(f.fecha_vencimiento) < new Date() && f.estado === 'pendiente';
                            return (
                                <div key={f.id} className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden shadow-sm transition-colors">
                                    
                                    {/* Indicador lateral de estado */}
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${f.estado === 'pagada' ? 'bg-emerald-500' : isVencida ? 'bg-rose-500' : f.estado === 'anulada' ? 'bg-slate-400' : 'bg-amber-500'}`}></div>
                                    
                                    {/* Top: Header / Folio & Estado */}
                                    <div className="flex justify-between items-start pl-2">
                                        <div>
                                            <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-500">#{f.id.toString().padStart(6, '0')}</span>
                                            <h3 className="font-black text-slate-900 dark:text-white text-base mt-0.5 leading-tight">{f.cliente?.nombre}</h3>
                                            <span className="text-[10px] text-slate-500 font-mono mt-1 block">{f.cliente?.ip_asignada}</span>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-[9px] uppercase font-black border ${f.estado === 'pagada' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                                                f.estado === 'anulada' ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700' :
                                                    isVencida ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20' :
                                                        'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20'
                                            }`}>
                                            {f.estado === 'pendiente' && isVencida ? 'VENCIDA' : f.estado}
                                        </span>
                                    </div>

                                    {/* Middle: Fechas y Totales */}
                                    <div className="pl-2 flex justify-between items-end mt-1">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                <ClockIcon className="w-4 h-4" /> Vence: {f.fecha_vencimiento}
                                            </span>
                                            {f.es_promesa_activa && (
                                                <span className="bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1 rounded border border-amber-200 dark:border-amber-500/20 text-[10px] font-black flex items-center gap-1 w-fit">
                                                    <ShieldExclamationIcon className="w-4 h-4" /> PROMESA: {f.fecha_promesa_pago}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-slate-900 dark:text-white">${f.total}</span>
                                        </div>
                                    </div>

                                    {/* Bottom: Acciones */}
                                    <div className="pl-2 flex gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-2">
                                        {f.estado !== 'pagada' && f.estado !== 'anulada' && (
                                            <button onClick={() => { setSelectedFactura(f); setShowPaymentModal(true); }} className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm">
                                                <BanknotesIcon className="w-5 h-5"/> Cobrar
                                            </button>
                                        )}
                                        <button className="flex-1 bg-slate-50 dark:bg-[#0f1219] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm">
                                            <PrinterIcon className="w-5 h-5"/> PDF
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {selectedFactura && (
                <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} factura={selectedFactura} onSuccess={fetchFacturas} />
            )}
        </div>
    );
}

const ResumenCard = ({ label, cantidad, total, color }: any) => {
    const colors: any = {
        emerald: "bg-emerald-600 border-emerald-500",
        amber: "bg-amber-600 border-amber-500",
        rose: "bg-rose-600 border-rose-500",
        slate: "bg-slate-600 border-slate-500"
    };
    return (
        <div className={`${colors[color]} p-4 rounded-2xl border shadow-lg shrink-0 min-w-[140px] md:min-w-0 flex-1 transition-colors`}>
            <p className="text-[10px] font-black uppercase text-white/80 tracking-widest">{label} ({cantidad})</p>
            <p className="text-2xl font-black text-white mt-1">${total.toLocaleString()}</p>
        </div>
    );
}