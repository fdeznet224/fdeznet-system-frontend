import { useState, useEffect } from 'react';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import { 
    MagnifyingGlassIcon, PrinterIcon, ArrowPathIcon, 
    BanknotesIcon, PlayIcon, ShieldExclamationIcon, ClockIcon 
} from '@heroicons/react/24/outline';
import PaymentModal from '../../components/modals/PaymentModal';

export default function Facturas() {
    const [facturas, setFacturas] = useState<any[]>([]);
    const [resumen, setResumen] = useState<any>(null);
    const [routers, setRouters] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
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
        } catch { 
            toast.error("Error cargando facturas"); 
        } finally { 
            setLoading(false); 
        }
    };
    
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex justify-between items-center">
                 <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <BanknotesIcon className="w-7 h-7 text-blue-500" />
                        Gestión Financiera
                    </h2>
                    <p className="text-slate-400 text-sm">Control de facturación y cobranza centralizada</p>
                 </div>
                 <button onClick={() => {/* ... tu lógica masiva ... */}} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg active:scale-95 transition">
                    <PlayIcon className="w-5 h-5" /> Generar Emisión
                </button>
            </div>

            {/* FILTROS ACTUALIZADOS */}
            <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 grid grid-cols-1 md:grid-cols-6 gap-4 items-end shadow-xl">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Tipo Fecha</label>
                    <select className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2" value={filtros.tipoFecha} onChange={e => setFiltros({...filtros, tipoFecha: e.target.value})}>
                        <option value="emision">Fecha Emisión</option>
                        <option value="vencimiento">Fecha Vencimiento</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Desde</label>
                    <input type="date" className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2" value={filtros.inicio} onChange={e => setFiltros({...filtros, inicio: e.target.value})}/>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Hasta</label>
                    <input type="date" className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2" value={filtros.fin} onChange={e => setFiltros({...filtros, fin: e.target.value})}/>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block">Nodo / Router</label>
                    <select className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2" value={filtros.routerId} onChange={e => setFiltros({...filtros, routerId: e.target.value})}>
                        <option value="">-- Todos --</option>
                        {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5 block text-amber-500">Filtrar Estado</label>
                    <select className="bg-slate-900 border border-slate-700 rounded-lg w-full text-xs text-white p-2 font-bold" value={filtros.estado} onChange={e => setFiltros({...filtros, estado: e.target.value})}>
                        <option value="cualquiera">Todos los estados</option>
                        <option value="pagada">✅ Pagadas</option>
                        <option value="pendiente">⏳ Pendientes</option>
                        <option value="promesa">🤝 Promesas de Pago</option> {/* 👈 NUEVA OPCIÓN */}
                        <option value="anulada">❌ Anuladas</option>
                    </select>
                </div>
                <button onClick={fetchFacturas} className="w-full bg-blue-600 hover:bg-blue-500 text-white h-[38px] rounded-xl flex items-center justify-center gap-2 font-bold transition shadow-lg shadow-blue-900/20">
                    {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin"/> : <MagnifyingGlassIcon className="w-5 h-5" />}
                    <span>Filtrar</span>
                </button>
            </div>

            {/* TABLA CON INDICADOR DE PROMESA */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-400 border-collapse">
                        <thead className="bg-slate-900/80 text-slate-300 uppercase font-bold border-b border-slate-700">
                            <tr>
                                <th className="p-4">Folio</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Vencimiento / Prórroga</th>
                                <th className="p-4">Total</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {facturas.map(f => {
                                const isVencida = new Date(f.fecha_vencimiento) < new Date() && f.estado === 'pendiente';
                                return (
                                    <tr key={f.id} className="hover:bg-slate-700/30 transition group">
                                        <td className="p-4 font-mono text-slate-500 group-hover:text-blue-400">#{f.id.toString().padStart(6, '0')}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-white text-sm">{f.cliente?.nombre}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">{f.cliente?.ip_asignada}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5"/> {f.fecha_vencimiento}</span>
                                                {/* INDICADOR DE PROMESA ACTIVA */}
                                                {f.es_promesa_activa && (
                                                    <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 text-[9px] font-black flex items-center gap-1 w-fit">
                                                        <ShieldExclamationIcon className="w-3 h-3"/> PROMESA: {f.fecha_promesa_pago}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-black text-white">${f.total}</div>
                                            <div className="text-[9px] text-slate-500 truncate max-w-[120px]">{f.plan_snapshot}</div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] uppercase font-black border ${
                                                f.estado === 'pagada' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
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
                </div>
            </div>

            {/* RESUMEN FINANCIERO */}
            {resumen && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <ResumenCard label="Pagado" cantidad={resumen.pagadas_cant} total={resumen.pagadas_total} color="emerald" />
                    <ResumenCard label="Pendiente" cantidad={resumen.pendientes_cant} total={resumen.pendientes_total} color="amber" />
                    <ResumenCard label="Vencido" cantidad={resumen.vencidas_cant} total={resumen.vencidas_total} color="rose" />
                    <ResumenCard label="Anulado" cantidad={resumen.anuladas_cant} total={resumen.anuladas_total} color="slate" />
                </div>
            )}

            {selectedFactura && (
                <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} factura={selectedFactura} onSuccess={fetchFacturas} />
            )}
        </div>
    );
}

// Subcomponente de Resumen
const ResumenCard = ({ label, cantidad, total, color }: any) => {
    const colors: any = {
        emerald: "from-emerald-600 to-teal-700 border-emerald-500/30",
        amber: "from-amber-600 to-orange-700 border-amber-500/30",
        rose: "from-rose-600 to-red-700 border-rose-500/30",
        slate: "from-slate-600 to-slate-800 border-slate-700/30"
    };
    return (
        <div className={`bg-gradient-to-br ${colors[color]} p-4 rounded-2xl border shadow-lg`}>
            <p className="text-[10px] font-bold uppercase text-white/70 tracking-widest">{label} ({cantidad})</p>
            <p className="text-2xl font-black text-white mt-1">${total.toLocaleString()}</p>
        </div>
    );
}