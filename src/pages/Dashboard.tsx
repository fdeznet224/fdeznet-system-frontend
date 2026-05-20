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
        } catch (error) { console.error(error); if (!data) setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const handlePosSuccess = () => { setIsPosOpen(false); fetchData(); };
    const handleCreateClientSuccess = () => { setIsCreateClientOpen(false); fetchData(); };

    if (loading) return <div className="flex justify-center items-center h-[calc(100vh-6rem)]"><ArrowPathIcon className="w-10 h-10 text-blue-500 animate-spin" /></div>;
    if (!data) return null;

    const totalConectados = (data.metricas.navegando_ok || 0) + (data.metricas.morosos_online || 0);
    const fallasReales = data.metricas.falla_tecnica || 0;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-5 md:gap-6 font-sans text-slate-700 dark:text-slate-200 pb-12">

            {/* =========================================================
                HEADER RESPONSIVO DEL PANEL DE CONTROL (CORREGIDO INLINE)
               ========================================================= */}
            <div className="flex justify-between items-center px-1 md:px-0 flex-none gap-2 pb-1">
                <div>
                    {/* ✅ LIMPIO: Texto puro y balanceado en una sola línea */}
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white tracking-tight whitespace-nowrap">
                        Panel de Control
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 hidden sm:block">Monitoreo en vivo de infraestructura y finanzas.</p>
                </div>

                {/* Botones inline simétricos exactos al resto del CRM */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        onClick={() => setIsCreateClientOpen(true)}
                        className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 px-2.5 py-2 md:px-4 md:py-2.5 rounded-xl font-extrabold shadow-sm active:scale-95 transition text-[10px] md:text-sm tracking-wide uppercase md:normal-case"
                    >
                        <UserPlusIcon className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        <span>Nuevo Cliente</span>
                    </button>

                    <button
                        onClick={() => setIsPosOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-2 md:px-4 md:py-2.5 rounded-xl font-extrabold shadow-md active:scale-95 transition flex items-center justify-center gap-1 text-[10px] md:text-sm tracking-wide uppercase md:normal-case"
                    >
                        <BanknotesIcon className="w-3.5 h-3.5 md:w-5 md:h-5" />
                        <span>Cobrar</span>
                    </button>
                </div>
            </div>

            {/* --- SECCIÓN 1: KPIs FINANCIEROS Y COMERCIALES ADAPTATIVOS --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 flex-none">
                <KpiCard title="CLIENTES TOTALES" value={data.resumen_clientes.total_registrados} icon={UsersIcon} border="border-cyan-500/20 dark:border-cyan-500/30" textColor="text-cyan-600 dark:text-cyan-400" extra={data.resumen_clientes.online_activos} extraLabel="Activos en BD" />
                <KpiCard title="INGRESO HOY" value={`$${data.finanzas.cobrado_hoy.toLocaleString()}`} icon={BanknotesIcon} border="border-emerald-500/20 dark:border-emerald-500/30" textColor="text-emerald-600 dark:text-emerald-400" extra="Corte al momento" isTextExtra />
                <KpiCard title="ACUMULADO MES" value={`$${data.finanzas.cobrado_mes.toLocaleString()}`} icon={CreditCardIcon} border="border-indigo-500/20 dark:border-indigo-500/30" textColor="text-indigo-600 dark:text-indigo-400" extra="Total facturado" isTextExtra />

                {/* Ciclo Facturación Adaptativo */}
                <div className="relative overflow-hidden rounded-2xl p-5 shadow-sm dark:shadow-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-pink-500/40 transition-all duration-300 group">
                    <div className="relative z-10 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">CICLO FACTURACIÓN</h4>
                                <div className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white flex items-baseline gap-1">{data.facturacion?.porcentaje}% <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Recaudado</span></div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 group-hover:scale-105 transition-transform"><ChartPieIcon className="w-5 h-5 text-pink-500" /></div>
                        </div>
                        <div className="mt-4">
                            <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2.5 overflow-hidden mb-2 border border-slate-200 dark:border-slate-800/50 shadow-inner">
                                <div className="bg-gradient-to-r from-pink-600 to-rose-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(244,63,94,0.3)]" style={{ width: `${data.facturacion?.porcentaje}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                                <span className="text-emerald-600 dark:text-emerald-400/80">{data.facturacion?.pagadas} Pagadas</span>
                                <span className="text-rose-500 dark:text-rose-400/80">{data.facturacion?.pendientes} Pendientes</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 2: TÉCNICO Y SERVIDOR ADAPTATIVOS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 flex-none">

                {/* LISTA: RESUMEN DEL SISTEMA */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40">
                        <h3 className="font-black text-slate-700 dark:text-white text-xs sm:text-sm uppercase tracking-widest flex items-center gap-2"><ListBulletIcon className="w-4 h-4 text-indigo-500" /> Resumen del Sistema</h3>
                        <div className="text-[8px] sm:text-[9px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div> EN VIVO</div>
                    </div>
                    <div className="p-2 sm:p-3">
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            <SystemListItem number="1" label="Routers Conectados" value={routersList.length} color="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10" />
                            <SystemListItem number="2" label="Clientes Online (MikroTik)" value={totalConectados} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10" icon={<WifiIcon className="w-4 h-4 text-emerald-500 mr-2.5 shrink-0" />} />
                            <SystemListItem number="3" label="Contratos Activos" value={data.resumen_clientes.online_activos} color="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10" />
                            <SystemListItem number="4" label="Suspendidos por Pago" value={data.resumen_clientes.offline_cortados} color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700" />
                            <SystemListItem number="5" label="Fallas Técnicas (Cortes de Red)" value={fallasReales} color="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10" blink={fallasReales > 0} icon={<ExclamationTriangleIcon className="w-4 h-4 text-rose-500 mr-2.5 shrink-0" />} />
                        </ul>
                    </div>
                </div>

                {/* DATOS DEL SERVIDOR */}
                <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl p-5 sm:p-6 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/[0.02] dark:bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
                    <div className="mb-6 pb-3 border-b border-slate-100 dark:border-slate-800/60 relative z-10">
                        <h3 className="font-black text-slate-700 dark:text-white text-xs sm:text-sm uppercase tracking-widest flex items-center gap-2"><ServerIcon className="w-4 h-4 text-blue-500" /> Rendimiento Servidor</h3>
                    </div>
                    <div className="space-y-5 relative z-10">
                        <ServerMetric label="Procesador (CPU)" value={`${data.servidor.cpu_percent}%`} percent={data.servidor.cpu_percent} color="blue" icon={CpuChipIcon} />
                        <ServerMetric label="Memoria (RAM)" value={`${data.servidor.ram_usada_percent}%`} percent={data.servidor.ram_usada_percent} color="purple" icon={ComputerDesktopIcon} />
                        <ServerMetric label="Almacenamiento" value={`${data.servidor.disco_libre_percent}% Libre`} percent={100 - data.servidor.disco_libre_percent} color="emerald" icon={CircleStackIcon} />
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 3: ÚLTIMOS PAGOS ADAPTATIVOS --- */}
            <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl overflow-hidden flex-1 flex flex-col">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 flex-none">
                    <h3 className="font-black text-slate-700 dark:text-white text-xs sm:text-sm uppercase tracking-widest flex items-center gap-1.5"><CurrencyDollarIcon className="w-4 h-4 text-emerald-500" /> Pagos Recientes</h3>
                    <Link to="/admin/transacciones" className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1.5 rounded-lg active:scale-95 transition">Ver Historial</Link>
                </div>
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-[9px] uppercase font-black tracking-widest border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-10 shadow-sm">
                            <tr><th className="px-6 py-3.5">Cliente</th><th className="px-6 py-3.5 text-right">Monto</th><th className="px-6 py-3.5 text-center">Cobrador</th><th className="px-6 py-3.5 text-right">Hora</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {data.ultimos_pagos.length > 0 ? data.ultimos_pagos.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition group bg-transparent">
                                    <td className="px-6 py-3.5 font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px] sm:max-w-xs group-hover:text-blue-600 dark:group-hover:text-white transition-colors">{p.cliente}</td>
                                    <td className="px-6 py-3.5 text-right"><span className="font-black text-emerald-600 dark:text-emerald-400 text-sm tracking-tight">+${p.monto.toLocaleString()}</span></td>
                                    <td className="px-6 py-3.5 text-center"><span className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-extrabold tracking-wider bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 uppercase">{p.cobrador}</span></td>
                                    <td className="px-6 py-3.5 text-right text-slate-400 dark:text-slate-500 font-mono text-[11px] font-bold">{p.fecha.split(' ')[1]}</td>
                                </tr>
                            )) : <tr><td colSpan={4} className="p-10 text-center text-slate-400 dark:text-slate-500 font-bold italic">No hay pagos registrados el día de hoy.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODALES */}
            <Transition appear show={isPosOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[150]" onClose={() => setIsPosOpen(false)}>
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
                    <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-0 sm:p-4">
                        <Dialog.Panel className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-5xl rounded-none sm:rounded-3xl bg-slate-900 border-0 sm:border border-slate-800 transform transition-all overflow-hidden shadow-2xl">
                            <RegistrarPago onCancel={() => setIsPosOpen(false)} onSuccess={handlePosSuccess} />
                        </Dialog.Panel>
                    </div>
                </Dialog>
            </Transition>

            <CreateClientModal isOpen={isCreateClientOpen} onClose={() => setIsCreateClientOpen(false)} onSuccess={handleCreateClientSuccess} routers={routersList} />
        </div>
    );
}

// ================= SUBCOMPONENTES REFINADOS Y ADAPTATIVOS =================

const KpiCard = ({ title, value, icon: Icon, border, textColor, extra, extraLabel, isTextExtra }: any) => (
    <div className={`relative overflow-hidden rounded-2xl p-5 shadow-sm dark:shadow-xl bg-white dark:bg-slate-900/90 border ${border} hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-300 group`}>
        <div className="relative z-10 flex flex-col justify-between h-full">
            <h4 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">{title}</h4>
            <div className={`text-2xl md:text-3xl font-black tracking-tight ${textColor} drop-shadow-sm`}>{value}</div>
            <div className="mt-2.5 bg-slate-50 dark:bg-slate-950/40 w-fit px-2 py-0.5 rounded border border-slate-100 dark:border-white/5 text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {isTextExtra ? extra : <><span className={textColor}>{extra}</span> {extraLabel}</>}
            </div>
        </div>
        <Icon className={`absolute right-[-10px] bottom-[-10px] w-24 h-24 opacity-[0.03] dark:opacity-5 -rotate-12 group-hover:rotate-0 group-hover:scale-105 transition-all duration-300 ease-out ${textColor}`} />
    </div>
);

const SystemListItem = ({ number, label, value, color, blink, icon }: any) => (
    <li className="flex items-center justify-between px-3 sm:px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group rounded-xl my-0.5">
        <span className={`text-xs font-bold flex items-center ${blink ? 'text-rose-500 font-black' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors'}`}>
            <span className="text-slate-400 dark:text-slate-600 mr-2.5 font-black text-[9px] bg-slate-100 dark:bg-slate-950 w-5 h-5 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 font-mono">{number}</span>
            {icon}
            {label}
        </span>
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider text-center min-w-[2.5rem] ${color} ${blink ? 'animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'shadow-sm'}`}>
            {value}
        </span>
    </li>
);

const ServerMetric = ({ label, value, percent, icon: Icon, color }: any) => {
    const textColors: any = { blue: 'text-blue-500', purple: 'text-purple-500', emerald: 'text-emerald-500' };
    const barColors: any = { blue: 'bg-blue-500', purple: 'bg-purple-500', emerald: 'bg-emerald-500' };
    return (
        <div className="group">
            <div className="flex justify-between mb-1 items-end">
                <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-widest group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                    <Icon className={`w-3.5 h-3.5 ${textColors[color]}`} /> {label}
                </span>
                <span className={`text-xs font-black tracking-wider ${textColors[color]}`}>{value}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
                <div className={`h-full rounded-full transition-all duration-1000 ${barColors[color]} shadow-[0_0_8px_currentColor]`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};