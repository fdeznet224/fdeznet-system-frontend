import { useState, useEffect, Fragment } from 'react';
import client from '../api/axios';
import { Dialog, Transition } from '@headlessui/react';
import { 
    UsersIcon, CurrencyDollarIcon, ServerIcon, ArrowPathIcon,
    CreditCardIcon, CpuChipIcon, ExclamationTriangleIcon,
    BanknotesIcon, UserPlusIcon, ListBulletIcon, ComputerDesktopIcon, CircleStackIcon,
    WifiIcon, ChartPieIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import RegistrarPago from '../components/facturacion/RegistrarPago';
import CreateClientModal from '../components/modals/CreateClientModal';

interface DashboardData {
    resumen_clientes: { total_registrados: number; online_activos: number; offline_cortados: number; retirados: number; };
    metricas: { total_clientes: number; navegando_ok: number; falla_tecnica: number; morosos_online: number; morosos_offline: number; };
    finanzas: { cobrado_hoy: number; cobrado_mes: number; moneda: string; };
    ultimos_pagos: Array<{ cliente: string; monto: number; cobrador: string; fecha: string; }>;
    servidor: { cpu_percent: number; ram_total_gb: number; ram_usada_percent: number; disco_libre_percent: number; };
    facturacion?: { total: number; pagadas: number; pendientes: number; porcentaje: number; };
}

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPosOpen, setIsPosOpen] = useState(false);
    const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
    const [routersList, setRoutersList] = useState<any[]>([]);

    const fetchData = async () => {
        try {
            const [resHome, resDetalle, resFacturas, resRouters] = await Promise.all([
                client.get('/dashboard/home'),
                client.get('/dashboard/clientes-online-detalle'),
                client.get('/finanzas/listado-completo?estado=cualquiera'),
                client.get('/network/routers/')
            ]);

            setRoutersList(resRouters.data);

            const facturas = resFacturas.data.items || [];
            const totalF = facturas.length;
            const pagadasF = facturas.filter((f: any) => f.estado === 'pagada').length;
            const pendientesF = facturas.filter((f: any) => f.estado === 'pendiente').length;
            const percent = totalF > 0 ? Math.round((pagadasF / totalF) * 100) : 0;

            setData({ 
                ...resHome.data, 
                metricas: resDetalle.data.metricas,
                facturacion: { total: totalF, pagadas: pagadasF, pendientes: pendientesF, porcentaje: percent }
            });
            setLoading(false);
        } catch (error) { console.error(error); if(!data) setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); 
        return () => clearInterval(interval);
    }, []);

    const handlePosSuccess = () => { setIsPosOpen(false); fetchData(); };
    const handleCreateClientSuccess = () => { setIsCreateClientOpen(false); fetchData(); };

    if (loading) return <div className="flex justify-center items-center h-[calc(100vh-6rem)]"><ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin"/></div>;
    if (!data) return null;

    // --- CÁLCULOS TÉCNICOS ---
    const totalConectados = (data.metricas.navegando_ok || 0) + (data.metricas.morosos_online || 0);
    const fallasReales = data.metricas.falla_tecnica || 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10 font-sans">
            
            {/* HEADER PREMIUM */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 pb-2">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-sm">Panel de Control</h2>
                    <div className="flex items-center gap-3 mt-2 bg-slate-800/80 w-fit px-3 py-1.5 rounded-full border border-slate-700/50 backdrop-blur-md shadow-sm">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-slate-300 text-[10px] sm:text-xs font-bold uppercase tracking-wide">Sistema Operativo Conectado</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                    <button onClick={() => setIsCreateClientOpen(true)} className="flex-1 md:flex-none group relative px-4 md:px-6 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white shadow-lg hover:bg-slate-700 hover:border-slate-600 transition-all active:scale-95">
                        <div className="relative flex justify-center items-center gap-2 font-bold text-xs md:text-sm tracking-wide text-slate-300 group-hover:text-white"><UserPlusIcon className="w-5 h-5"/> <span className="hidden sm:inline">NUEVO CLIENTE</span></div>
                    </button>
                    <button onClick={() => setIsPosOpen(true)} className="flex-1 md:flex-none group relative px-4 md:px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all active:scale-95 border border-emerald-400/30">
                        <div className="relative flex justify-center items-center gap-2 font-bold text-xs md:text-sm tracking-wide"><BanknotesIcon className="w-5 h-5"/> <span className="hidden sm:inline">COBRAR</span></div>
                    </button>
                </div>
            </div>

            {/* --- SECCIÓN 1: KPIs FINANCIEROS Y COMERCIALES --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                
                <KpiCard title="CLIENTES TOTALES" value={data.resumen_clientes.total_registrados} icon={UsersIcon} gradient="from-slate-800 to-slate-900" border="border-cyan-500/30" textColor="text-cyan-400" extra={<span className="text-[10px] md:text-xs font-bold opacity-80 text-slate-400">{data.resumen_clientes.online_activos} Activos en BD</span>} />
                <KpiCard title="INGRESO HOY" value={`$${data.finanzas.cobrado_hoy.toLocaleString()}`} icon={BanknotesIcon} gradient="from-slate-800 to-slate-900" border="border-emerald-500/30" textColor="text-emerald-400" extra={<span className="text-[10px] md:text-xs font-bold opacity-80 text-slate-400">Corte al momento</span>} />
                <KpiCard title="ACUMULADO MES" value={`$${data.finanzas.cobrado_mes.toLocaleString()}`} icon={CreditCardIcon} gradient="from-slate-800 to-slate-900" border="border-indigo-500/30" textColor="text-indigo-400" extra={<span className="text-[10px] md:text-xs font-bold opacity-80 text-slate-400">Total facturado</span>} />

                {/* Ciclo Facturación */}
                <div className="relative overflow-hidden rounded-3xl p-5 shadow-xl bg-slate-800/80 border border-slate-700 backdrop-blur-md hover:border-pink-500/40 transition-all duration-300 group">
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">CICLO FACTURACIÓN</h4>
                                <div className="text-3xl font-black text-white flex items-baseline gap-1">{data.facturacion?.porcentaje}% <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Recaudado</span></div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 group-hover:scale-110 transition-transform"><ChartPieIcon className="w-6 h-6 text-pink-500"/></div>
                        </div>
                        <div className="mt-5">
                            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden mb-2.5 border border-slate-700/50 shadow-inner">
                                <div className="bg-gradient-to-r from-pink-600 to-rose-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(244,63,94,0.6)]" style={{ width: `${data.facturacion?.porcentaje}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <span className="text-emerald-400/80">{data.facturacion?.pagadas} Pagadas</span><span className="text-rose-400/80">{data.facturacion?.pendientes} Pendientes</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 2: TÉCNICO Y SERVIDOR --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LISTA: RESUMEN DEL SISTEMA */}
                <div className="lg:col-span-2 bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/40">
                        <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-widest flex items-center gap-2"><ListBulletIcon className="w-5 h-5 text-indigo-400"/> Resumen del Sistema</h3>
                        <div className="text-[10px] font-black tracking-widest uppercase text-slate-500 flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div> EN VIVO</div>
                    </div>
                    <div className="p-2 sm:p-4">
                        <ul className="divide-y divide-slate-700/50">
                            <SystemListItem number="1" label="Routers Conectados" value={routersList.length} color="bg-indigo-500 text-white" />
                            <SystemListItem number="2" label="Clientes Online (MikroTik)" value={totalConectados} color="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" icon={<WifiIcon className="w-4 h-4 text-emerald-400 mr-3"/>}/>
                            <SystemListItem number="3" label="Contratos Activos (Pagados)" value={data.resumen_clientes.online_activos} color="bg-blue-500/10 text-blue-400 border border-blue-500/20" />
                            <SystemListItem number="4" label="Suspendidos por Pago" value={data.resumen_clientes.offline_cortados} color="bg-slate-700 text-slate-300" />
                            <SystemListItem number="5" label="Fallas Técnicas (Activo sin Red)" value={fallasReales} color="bg-rose-500/10 text-rose-400 border border-rose-500/20" blink={fallasReales > 0} icon={<ExclamationTriangleIcon className="w-4 h-4 text-rose-400 mr-3"/>}/>
                        </ul>
                    </div>
                </div>

                {/* DATOS DEL SERVIDOR */}
                <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl p-6 sm:p-8 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="mb-8 pb-4 border-b border-slate-700/50 relative z-10">
                        <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-widest flex items-center gap-2"><ServerIcon className="w-5 h-5 text-blue-400"/> Rendimiento Servidor</h3>
                    </div>
                    <div className="space-y-7 relative z-10">
                        <ServerMetric label="Procesador (CPU)" value={`${data.servidor.cpu_percent}%`} percent={data.servidor.cpu_percent} color="blue" icon={CpuChipIcon}/>
                        <ServerMetric label="Memoria (RAM)" value={`${data.servidor.ram_usada_percent}%`} percent={data.servidor.ram_usada_percent} color="purple" icon={ComputerDesktopIcon}/>
                        <ServerMetric label="Almacenamiento" value={`${data.servidor.disco_libre_percent}% Libre`} percent={100 - data.servidor.disco_libre_percent} color="emerald" icon={CircleStackIcon}/>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 3: ÚLTIMOS PAGOS --- */}
            <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/40">
                    <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-widest flex items-center gap-2"><CurrencyDollarIcon className="w-5 h-5 text-emerald-400"/> Pagos Recientes</h3>
                    <Link to="/admin/transacciones" className="text-xs font-black uppercase tracking-widest text-blue-500 hover:text-blue-400 transition bg-blue-500/10 px-3 py-1.5 rounded-lg">Ver Historial</Link>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-950/50 text-slate-500 text-[10px] uppercase font-black tracking-widest border-b border-slate-800">
                            <tr><th className="px-6 py-4">Cliente</th><th className="px-6 py-4 text-right">Monto</th><th className="px-6 py-4 text-center">Cobrador</th><th className="px-6 py-4 text-right">Hora</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {data.ultimos_pagos.length > 0 ? data.ultimos_pagos.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-700/30 transition-colors group">
                                    <td className="px-6 py-4 font-bold text-slate-200 truncate max-w-[150px] sm:max-w-xs group-hover:text-white transition-colors">{p.cliente}</td>
                                    <td className="px-6 py-4 text-right"><span className="font-black text-emerald-400 text-base shadow-emerald-500/10">+${p.monto.toLocaleString()}</span></td>
                                    <td className="px-6 py-4 text-center"><span className="inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black tracking-widest bg-slate-900 text-slate-400 border border-slate-700 uppercase">{p.cobrador}</span></td>
                                    <td className="px-6 py-4 text-right text-slate-500 text-xs font-mono">{p.fecha.split(' ')[1]}</td>
                                </tr>
                            )) : <tr><td colSpan={4} className="p-10 text-center text-slate-500 font-medium italic">No hay pagos registrados el día de hoy.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALES */}
            <Transition appear show={isPosOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsPosOpen(false)}>
                    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm transition-opacity" />
                    <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-0 sm:p-4">
                        <Dialog.Panel className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl rounded-none sm:rounded-3xl bg-slate-900 shadow-2xl border-0 sm:border border-slate-700 transform transition-all overflow-hidden">
                            <RegistrarPago onCancel={() => setIsPosOpen(false)} onSuccess={handlePosSuccess} />
                        </Dialog.Panel>
                    </div>
                </Dialog>
            </Transition>

            <CreateClientModal isOpen={isCreateClientOpen} onClose={() => setIsCreateClientOpen(false)} onSuccess={handleCreateClientSuccess} routers={routersList} />
        </div>
    );
}

// --- SUBCOMPONENTES REFINADOS ---

const KpiCard = ({ title, value, icon: Icon, gradient, border, textColor, extra }: any) => (
    <div className={`relative overflow-hidden rounded-3xl p-5 md:p-6 shadow-xl bg-gradient-to-br ${gradient} border ${border} hover:border-slate-500/50 transition-all duration-300 hover:-translate-y-1 group backdrop-blur-sm`}>
        <div className="relative z-10 flex flex-col justify-between h-full">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{title}</h4>
            <div className={`text-3xl md:text-4xl font-black tracking-tight ${textColor} drop-shadow-sm`}>{value}</div>
            <div className="mt-3 bg-slate-950/30 w-fit px-2 py-1 rounded-md border border-white/5">{extra}</div>
        </div>
        <Icon className={`absolute right-[-15px] bottom-[-15px] w-28 h-28 opacity-5 -rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-500 ease-out ${textColor}`} />
    </div>
);

const SystemListItem = ({ number, label, value, color, blink, icon }: any) => (
    <li className="flex items-center justify-between px-4 sm:px-6 py-4 hover:bg-slate-700/30 transition-colors group rounded-xl mx-2 my-1">
        <span className={`text-xs sm:text-sm font-bold flex items-center ${blink ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-200 transition-colors'}`}>
            <span className="text-slate-600 mr-3 sm:mr-4 font-black text-[10px] bg-slate-900 w-5 h-5 flex items-center justify-center rounded-md border border-slate-800">{number}</span> 
            {icon}
            {label}
        </span>
        <span className={`px-3 py-1 rounded-lg text-xs font-black tracking-wider text-center min-w-[3rem] ${color} ${blink ? 'animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'shadow-sm'}`}>
            {value}
        </span>
    </li>
);

const ServerMetric = ({ label, value, percent, icon: Icon, color }: any) => (
    <div className="group">
        <div className="flex justify-between mb-2 items-end">
            <span className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-widest group-hover:text-slate-300 transition-colors"><Icon className={`w-4 h-4 text-${color}-400`}/> {label}</span>
            <span className={`text-xs font-black tracking-wider text-${color}-400`}>{value}</span>
        </div>
        <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800 shadow-inner">
            <div className={`h-full rounded-full transition-all duration-1000 bg-${color}-500 shadow-[0_0_12px_currentColor]`} style={{ width: `${percent}%` }}></div>
        </div>
    </div>
);