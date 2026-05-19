import { useState, useEffect, useMemo } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
    MagnifyingGlassIcon, PrinterIcon, ArrowPathIcon,
    BanknotesIcon, ShieldExclamationIcon, ClockIcon,
    FunnelIcon, CalendarDaysIcon
} from '@heroicons/react/24/outline';
import PaymentModal from '../../components/modals/PaymentModal';

export default function Facturas() {
    const [facturas, setFacturas] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const [routers, setRouters] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Control Paneles Móviles
    const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false);

    // Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedFactura, setSelectedFactura] = useState<any>(null);

    // Filtros
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
            setMostrarFiltrosMovil(false); // Cerramos el panel al filtrar en móvil
        } catch {
            toast.error("Error cargando facturas");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-4 md:gap-6 font-sans text-slate-200 pb-12">

            {/* =========================================================
                HEADER RESPONSIVO
               ========================================================= */}
            <div className="flex justify-between items-center px-1 md:px-0 flex-none gap-2">
                <div>
                    {/* ✅ LIMPIO: Se eliminó el BanknotesIcon del título para una vista más limpia */}
                    <h2 className="text-lg md:text-2xl font-black text-white tracking-tight">
                        Gestión Financiera
                    </h2>
                    <p className="text-slate-400 text-[11px] md:text-sm mt-0.5 hidden sm:block">Control de facturación y cobranza centralizada</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Botón Filtros Móvil */}
                    <button
                        onClick={() => setMostrarFiltrosMovil(!mostrarFiltrosMovil)}
                        className={`md:hidden p-2 rounded-xl border transition-all ${mostrarFiltrosMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700/80 text-slate-400'}`}
                    >
                        <FunnelIcon className="w-4 h-4" />
                    </button>

                    {/* ✅ REDISEÑADO: Botón más pequeño en móvil (text-[10px], px-2.5, py-1.5) y sin iconos estorbando */}
                    <button
                        onClick={() => {/* ... tu lógica masiva ... */ }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-2 md:px-4 md:py-2.5 rounded-xl font-extrabold shadow-md active:scale-95 transition text-[10px] md:text-sm tracking-wide uppercase md:normal-case"
                    >
                        <span>Emisión Masiva</span>
                    </button>
                </div>
            </div>

            {/* =========================================================
                KPI RESUMEN: SCROLL HORIZONTAL EN MÓVIL / GRID EN PC
               ========================================================= */}
            {resumen && (
                <div className="flex gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:pb-0 scrollbar-none flex-none">
                    <ResumenCard label="Pagado" cantidad={resumen.pagadas_cant} total={resumen.pagadas_total} color="emerald" />
                    <ResumenCard label="Pendiente" cantidad={resumen.pendientes_cant} total={resumen.pendientes_total} color="amber" />
                    <ResumenCard label="Vencido" cantidad={resumen.vencidas_cant} total={resumen.vencidas_total} color="rose" />
                    <ResumenCard label="Anulado" cantidad={resumen.anuladas_cant} total={resumen.anuladas_total} color="slate" />
                </div>
            )}

            {/* =========================================================
                ZONA DE FILTROS (FIJOS EN ESCRITORIO / DESPLEGABLE EN MÓVIL)
               ========================================================= */}
            {/* Filtros Escritorio */}
            <div className="hidden md:grid bg-slate-800 p-5 rounded-2xl border border-slate-700 grid-cols-6 gap-4 items-end shadow-xl flex-none">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Tipo Fecha</label>
                    <select className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2 outline-none focus:border-blue-500" value={filtros.tipoFecha} onChange={e => setFiltros({ ...filtros, tipoFecha: e.target.value })}>
                        <option value="emision">Fecha Emisión</option>
                        <option value="vencimiento">Fecha Vencimiento</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Desde</label>
                    <input type="date" className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2 outline-none focus:border-blue-500" value={filtros.inicio} onChange={e => setFiltros({ ...filtros, inicio: e.target.value })} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Hasta</label>
                    <input type="date" className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2 outline-none focus:border-blue-500" value={filtros.fin} onChange={e => setFiltros({ ...filtros, fin: e.target.value })} />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Nodo / Router</label>
                    <select className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2 outline-none focus:border-blue-500" value={filtros.routerId} onChange={e => setFiltros({ ...filtros, routerId: e.target.value })}>
                        <option value="">-- Todos --</option>
                        {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block text-amber-500">Filtrar Estado</label>
                    <select className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2 font-bold outline-none focus:border-blue-500" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
                        <option value="cualquiera">Todos los estados</option>
                        <option value="pagada">✅ Pagadas</option>
                        <option value="pendiente">⏳ Pendientes</option>
                        <option value="promesa">🤝 Promesas de Pago</option>
                        <option value="anulada">❌ Anuladas</option>
                    </select>
                </div>
                <button onClick={fetchFacturas} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-[36px] rounded-xl flex items-center justify-center gap-2 font-bold transition shadow-lg shadow-blue-900/20 active:scale-95">
                    {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <MagnifyingGlassIcon className="w-5 h-5" />}
                    <span>Filtrar</span>
                </button>
            </div>

            {/* Panel de Filtros Desplegable en Móvil */}
            {mostrarFiltrosMovil && (
                <div className="md:hidden bg-slate-900 p-4 rounded-xl border border-slate-700/80 shadow-2xl space-y-3.5 animate-fadeIn flex-none">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Rango / Tipo</label>
                            <select className="bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 p-2 outline-none" value={filtros.tipoFecha} onChange={e => setFiltros({ ...filtros, tipoFecha: e.target.value })}>
                                <option value="emision">Emisión</option>
                                <option value="vencimiento">Vencimiento</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Estado Factura</label>
                            <select className="bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 p-2 font-bold outline-none" value={filtros.estado} onChange={e => setFiltros({ ...filtros, estado: e.target.value })}>
                                <option value="cualquiera">Todos</option>
                                <option value="pagada">Pagadas</option>
                                <option value="pendiente">Pendientes</option>
                                <option value="promesa">Promesas</option>
                                <option value="anulada">Anuladas</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-3">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Desde</label>
                            <input type="date" className="bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 p-2 outline-none" value={filtros.inicio} onChange={e => setFiltros({ ...filtros, inicio: e.target.value })} />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Hasta</label>
                            <input type="date" className="bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 p-2 outline-none" value={filtros.fin} onChange={e => setFiltros({ ...filtros, fin: e.target.value })} />
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-3">
                        <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Filtrar por Nodo / Router</label>
                        <select className="bg-slate-950 border border-slate-800 rounded-lg w-full text-xs text-slate-200 p-2 outline-none" value={filtros.routerId} onChange={e => setFiltros({ ...filtros, routerId: e.target.value })}>
                            <option value="">-- Todos los Routers --</option>
                            {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>
                    </div>

                    <button onClick={fetchFacturas} className="w-full bg-blue-600 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-xs shadow-lg shadow-blue-900/20 active:scale-95">
                        {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <MagnifyingGlassIcon className="w-4 h-4" />}
                        <span>APLICAR FILTROS EN PRODUCCIÓN</span>
                    </button>
                </div>
            )}

            {/* =========================================================
                ZONA DE ENTRADA DE DATOS (TABLA VS CARDS FINANCIERAS)
               ========================================================= */}
            <div className="flex-1 bg-slate-800 md:border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">

                    {/* 🖥️ COMPONENTE: TABLA ESCRITORIO */}
                    <table className="w-full text-left text-xs text-slate-400 border-collapse hidden md:table">
                        <thead className="bg-slate-900 text-slate-300 uppercase font-bold border-b border-slate-700 sticky top-0 z-10 shadow-md">
                            <tr>
                                <th className="p-4">Folio</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Vencimiento / Prórroga</th>
                                <th className="p-4">Total</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {loading && facturas.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                            ) : facturas.map(f => {
                                const isVencida = new Date(f.fecha_vencimiento) < new Date() && f.estado === 'pendiente';
                                return (
                                    <tr key={f.id} className="hover:bg-slate-700/30 transition group bg-transparent">
                                        <td className="p-4 font-mono text-slate-500 group-hover:text-blue-400">#{f.id.toString().padStart(6, '0')}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-white text-sm">{f.cliente?.nombre}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{f.cliente?.ip_asignada}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" /> {f.fecha_vencimiento}</span>
                                                {f.es_promesa_activa && (
                                                    <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 text-[9px] font-black flex items-center gap-1 w-fit">
                                                        <ShieldExclamationIcon className="w-3 h-3" /> PROMESA: {f.fecha_promesa_pago}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-black text-white">${f.total}</div>
                                            <div className="text-[9px] text-slate-500 truncate max-w-[120px]">{f.plan_snapshot}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black border ${f.estado === 'pagada' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    f.estado === 'anulada' ? 'bg-slate-800 text-slate-500 border-slate-700' :
                                                        isVencida ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                {f.estado === 'pendiente' && isVencida ? 'VENCIDA' : f.estado}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {f.estado !== 'pagada' && f.estado !== 'anulada' && (
                                                    <button onClick={() => { setSelectedFactura(f); setShowPaymentModal(true); }} className="text-emerald-400 hover:text-white hover:bg-emerald-600 p-2 rounded-lg transition border border-emerald-500/20" title="Cobrar"><BanknotesIcon className="w-4 h-4" /></button>
                                                )}
                                                <button className="text-slate-400 hover:text-blue-400 p-2 rounded-lg border border-slate-700" title="PDF"><PrinterIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* 📱 COMPONENTE: TARJETAS FINANCIERAS MÓVILES (ULTRA LIGERAS) */}
                    <div className="md:hidden flex flex-col gap-2.5 p-2 pb-24">
                        {loading && facturas.length === 0 ? (
                            <div className="p-8 text-center"><ArrowPathIcon className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
                        ) : facturas.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-xs">No se encontraron facturas en este rango.</div>
                        ) : (
                            facturas.map(f => {
                                const isVencida = new Date(f.fecha_vencimiento) < new Date() && f.estado === 'pendiente';
                                return (
                                    <div key={f.id} className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 flex flex-col gap-3 shadow-md">

                                        {/* Fila Alta: Folio y Estatus Comercial */}
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-mono text-[10px] text-slate-500 block">FOLIO #{f.id.toString().padStart(6, '0')}</span>
                                                <h3 className="font-bold text-white text-sm mt-0.5 leading-tight">{f.cliente?.nombre}</h3>
                                                <p className="text-slate-400 font-mono text-[10px]">{f.cliente?.ip_asignada}</p>
                                            </div>

                                            {/* Badge de Estado Dinámico */}
                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase border shrink-0 ${f.estado === 'pagada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    f.estado === 'anulada' ? 'bg-slate-800 text-slate-500 border-slate-700' :
                                                        isVencida ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                            'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                }`}>
                                                {f.estado === 'pendiente' && isVencida ? 'VENCIDA' : f.estado}
                                            </span>
                                        </div>

                                        {/* Fila Media: Calendario vs Monto Total */}
                                        <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                                            <div className="space-y-1 overflow-hidden">
                                                <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Vencimiento</span>
                                                <p className="text-slate-300 font-bold flex items-center gap-1"><CalendarDaysIcon className="w-3.5 h-3.5 text-slate-500" /> {f.fecha_vencimiento}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[8px] text-slate-500 uppercase font-black block tracking-wider">Total a Cobrar</span>
                                                <p className="text-base font-black text-white mt-0.5">${f.total}</p>
                                                <p className="text-[8px] text-slate-500 truncate">{f.plan_snapshot}</p>
                                            </div>
                                        </div>

                                        {/* Promesa de Pago Flotante (Si existe) */}
                                        {f.es_promesa_activa && (
                                            <div className="bg-amber-500/5 border border-amber-500/20 px-2.5 py-1.5 rounded-lg text-[10px] text-amber-400 flex items-center gap-1.5">
                                                <ShieldExclamationIcon className="w-4 h-4 text-amber-500 shrink-0" />
                                                <span><strong>Prórroga Activa:</strong> Paga el {f.fecha_promesa_pago}</span>
                                            </div>
                                        )}

                                        {/* Botones de Acción Operativa */}
                                        <div className="flex items-center gap-2 border-t border-slate-800/60 pt-2 mt-0.5">
                                            {f.estado !== 'pagada' && f.estado !== 'anulada' ? (
                                                <button
                                                    onClick={() => { setSelectedFactura(f); setShowPaymentModal(true); }}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg text-xs shadow-md transition-all active:scale-[0.98]"
                                                >
                                                    <BanknotesIcon className="w-4 h-4" /> <span>REGISTRAR COBRO EFECTIVO</span>
                                                </button>
                                            ) : (
                                                <div className="flex-1 text-[10px] text-slate-500 italic flex items-center gap-1">
                                                    <span>{f.estado === 'pagada' ? '✅ Liquidada en sucursal/banco' : '❌ Folio cancelado sin saldo'}</span>
                                                </div>
                                            )}

                                            <button className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-blue-400 active:scale-95 transition-all shrink-0">
                                                <PrinterIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>
            </div>

            {selectedFactura && (
                <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} factura={selectedFactura} onSuccess={fetchFacturas} />
            )}
        </div>
    );
}

// Subcomponente de Resumen Adaptado
const ResumenCard = ({ label, cantidad, total, color }: any) => {
    const colors: any = {
        emerald: "from-emerald-600 to-teal-700 border-emerald-500/30",
        amber: "from-amber-600 to-orange-700 border-amber-500/30",
        rose: "from-rose-600 to-red-700 border-rose-500/30",
        slate: "from-slate-600 to-slate-800 border-slate-700/30"
    };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} p-3.5 rounded-xl border shadow-md shrink-0 min-w-[135px] md:min-w-0 flex-1`}>
            <p className="text-[9px] font-black uppercase text-white/70 tracking-wider">{label} ({cantidad})</p>
            <p className="text-xl font-black text-white mt-0.5">${total.toLocaleString()}</p>
        </div>
    );
}