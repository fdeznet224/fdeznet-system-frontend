import {
    useState, useEffect, useCallback, Fragment,
    type ComponentType, type ReactNode
} from 'react';
import client from '@/api/axios';
import { Dialog, Transition } from '@headlessui/react';
import {
    UsersIcon, CurrencyDollarIcon, ServerIcon, ArrowPathIcon,
    CreditCardIcon, CpuChipIcon, ExclamationTriangleIcon,
    BanknotesIcon, UserPlusIcon, ListBulletIcon,
    WifiIcon, ChartPieIcon, ArrowUpRightIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import RegistrarPago from '@/pages/finanzas/components/RegistrarPago';
import CreateClientModal from '@/pages/clientes/components/CreateClientModal';

interface DashboardData {
    resumen_clientes: {
        total_clientes: number;
        total_registrados: number;
        contratos_activos: number;
        contratos_suspendidos: number;
        total_servicios_actuales: number;
        pendientes_instalacion: number;
        retirados: number;
        online_activos: number;
        offline_cortados: number;
    };
    metricas: {
        total_clientes: number;
        total_clientes_directorio: number;
        total_servicios: number;
        clientes_online_mikrotik: number;
        clientes_offline_mikrotik: number;
        total_suspendidos: number;
        navegando_ok: number;
        falla_tecnica: number;
        morosos_online: number;
        morosos_offline: number;
    };
    finanzas: {
        cobrado_hoy: number;
        cobrado_mes: number;
        clientes_cobrados_hoy: number;
        clientes_cobrados_mes: number;
        moneda: string;
    };
    ultimos_pagos: Array<{ cliente: string; monto: number; cobrador: string; fecha: string; }>;
    servidor: { cpu_percent: number; ram_total_gb: number; ram_usada_percent: number; disco_libre_percent: number; };
    facturacion?: {
        total: number;
        pagadas: number;
        pendientes: number;
        porcentaje: number;
        clientes_actuales: number;
        clientes_facturados: number;
        servicios_actuales: number;
        servicios_facturados: number;
        servicios_sin_factura: number;
        clientes_cobrados: number;
        clientes_con_saldo_pendiente: number;
        saldo_pendiente: number;
    };
}

interface RouterSummary {
    id: number;
    nombre: string;
    tipo_seguridad?: string;
}

interface DashboardDetailResponse {
    metricas: DashboardData['metricas'];
}

interface KpiCardProps {
    title: string;
    value: ReactNode;
    icon: ComponentType<{ className?: string }>;
    color: string;
    bg: string;
    border: string;
    extra: ReactNode;
    extraLabel?: string;
    isTextExtra?: boolean;
}

interface SystemListItemProps {
    label: string;
    value: ReactNode;
    color: string;
    bg: string;
    blink?: boolean;
    icon: ComponentType<{ className?: string }>;
}

type ServerMetricColor = 'blue' | 'purple' | 'emerald';

interface ServerMetricProps {
    label: string;
    value: string;
    percent: number;
    color: ServerMetricColor;
}

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPosOpen, setIsPosOpen] = useState(false);
    const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);
    const [routersList, setRoutersList] = useState<RouterSummary[]>([]);

    const fetchData = useCallback(async () => {
        try {
            const [resHome, resDetalle, resRouters] = await Promise.all([
                client.get<DashboardData>('/dashboard/home'),
                client.get<DashboardDetailResponse>('/dashboard/clientes-online-detalle'),
                client.get<RouterSummary[]>('/network/routers/')
            ]);

            setRoutersList(resRouters.data);

            setData({
                ...resHome.data,
                metricas: resDetalle.data.metricas,
            });
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => void fetchData(), 0);
        const interval = setInterval(fetchData, 10000);
        return () => {
            window.clearTimeout(initialLoad);
            clearInterval(interval);
        };
    }, [fetchData]);

    const handlePosSuccess = () => { setIsPosOpen(false); fetchData(); };
    const handleCreateClientSuccess = () => { setIsCreateClientOpen(false); fetchData(); };

    if (loading) return <div className="flex justify-center items-center h-[calc(100vh-6rem)]"><ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin" /></div>;
    if (!data) return null;

    const totalConectados = data.metricas.clientes_online_mikrotik || 0;
    const totalSinSesion = data.metricas.clientes_offline_mikrotik || 0;
    const totalSuspendidos = data.metricas.total_suspendidos || data.resumen_clientes.contratos_suspendidos || 0;

    return (
        <div className="mx-auto flex h-full max-w-7xl flex-col gap-4 pb-4 font-sans text-slate-700 transition-colors duration-300 dark:text-slate-200 md:gap-6">

            {/* ================= HEADER TIPO INVENTARIO (BENTO) ================= */}
            <div className="app-card flex flex-none shrink-0 items-center justify-between gap-4 p-4 transition-colors">
                <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Operación en vivo</p>
                    <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white leading-tight tracking-tight">Panel de Control</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-0.5 hidden sm:block">Red, clientes y cobranza en un solo vistazo</p>
                </div>

                <div className="flex gap-2 items-center">
                    <button
                        onClick={() => setIsCreateClientOpen(true)}
                        className="p-3 sm:px-5 sm:py-3 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl sm:rounded-[1rem] font-black active:scale-95 transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700/50"
                    >
                        <UserPlusIcon className="w-5 h-5" /> 
                        <span className="hidden sm:inline text-xs tracking-widest uppercase">Nuevo Cliente</span>
                    </button>

                    <button
                        onClick={() => setIsPosOpen(true)}
                        aria-label="Cobrar"
                        className="p-3 sm:px-5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl sm:rounded-[1rem] font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <BanknotesIcon className="w-5 h-5" /> 
                        <span className="hidden sm:inline text-xs tracking-widest uppercase">Cobrar</span>
                    </button>
                </div>
            </div>

            {/* ================= CARRUSEL MÓVIL / GRID PC (KPIs FINANCIEROS) ================= */}
            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:pb-0 scrollbar-none flex-none shrink-0 snap-x">
                <KpiCard title="Clientes actuales" value={data.resumen_clientes.total_clientes} icon={UsersIcon} color="text-blue-600 dark:text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" extra={data.resumen_clientes.total_servicios_actuales} extraLabel="Servicios" />
                <KpiCard title="Ingreso Hoy" value={`$${data.finanzas.cobrado_hoy.toLocaleString()}`} icon={BanknotesIcon} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" extra={`${data.finanzas.clientes_cobrados_hoy || 0} clientes`} isTextExtra />
                <KpiCard title="Cobrado en el mes" value={`$${data.finanzas.cobrado_mes.toLocaleString()}`} icon={CreditCardIcon} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-500/10" border="border-indigo-500/20" extra={`${data.finanzas.clientes_cobrados_mes || 0} clientes`} isTextExtra />

                {/* KPI ESPECIAL: Ciclo Facturación */}
                <div className="relative overflow-hidden rounded-[1.25rem] p-4 shadow-sm bg-white dark:bg-[#12141a] border border-slate-200 dark:border-slate-800/80 shrink-0 min-w-[200px] snap-start flex-1 flex flex-col justify-between group transition-colors">
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recaudación</p>
                        <div className="p-1.5 rounded-xl border bg-pink-500/10 border-pink-500/20 group-hover:scale-110 transition-transform"><ChartPieIcon className="w-4 h-4 text-pink-500" /></div>
                    </div>
                    
                    <div className="text-2xl font-black text-slate-800 dark:text-white flex items-baseline gap-1">
                        {data.facturacion?.porcentaje}%
                    </div>
                    
                    <div className="mt-3 w-full">
                        <div className="w-full bg-slate-100 dark:bg-slate-900/80 rounded-full h-1.5 overflow-hidden mb-1.5 border border-slate-200/50 dark:border-slate-800 shadow-inner">
                            <div className="bg-gradient-to-r from-pink-500 to-rose-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(244,63,94,0.4)]" style={{ width: `${data.facturacion?.porcentaje}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                            <span className="text-emerald-500/90">{data.facturacion?.pagadas} Pag.</span>
                            <span className="text-rose-500/90">{data.facturacion?.pendientes} Pend.</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= ESTADO TÉCNICO Y SISTEMA ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5 flex-none">
                
                {/* Resumen del Sistema (Estilo App Settings) */}
                <div className="lg:col-span-2 bg-white dark:bg-[#12141a] rounded-[1.5rem] border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col transition-colors">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center bg-transparent">
                        <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2">
                            <ListBulletIcon className="w-5 h-5 text-indigo-500" /> Resumen de Red
                        </h3>
                        <div className="text-[9px] font-black tracking-widest uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> LIVE
                        </div>
                    </div>
                    <div className="p-3 space-y-1">
                        <SystemListItem label="Routers Conectados" value={routersList.length} color="text-indigo-600 dark:text-indigo-400" bg="bg-indigo-50 dark:bg-indigo-500/10" icon={ServerIcon} />
                        <SystemListItem label="Servicios Online (MikroTik)" value={totalConectados} color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-500/10" icon={WifiIcon} />
                        <SystemListItem label="Servicios Offline / sin sesión" value={totalSinSesion} color="text-rose-600 dark:text-rose-400" bg="bg-rose-50 dark:bg-rose-500/10" icon={ExclamationTriangleIcon} blink={totalSinSesion > 0} />
                        <SystemListItem label="Servicios Suspendidos" value={totalSuspendidos} color="text-amber-600 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-500/10" icon={UsersIcon} />
                    </div>
                </div>

                {/* Rendimiento Servidor (Widget) */}
                <div className="bg-white dark:bg-[#12141a] rounded-[1.5rem] border border-slate-200 dark:border-slate-800/80 shadow-sm p-5 sm:p-6 flex flex-col justify-center relative overflow-hidden transition-colors">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div className="mb-5 pb-3 border-b border-slate-100 dark:border-slate-800/50 relative z-10">
                        <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2">
                            <CpuChipIcon className="w-5 h-5 text-blue-500" /> Servidor Principal
                        </h3>
                    </div>
                    <div className="space-y-4 relative z-10">
                        <ServerMetric label="CPU" value={`${data.servidor.cpu_percent}%`} percent={data.servidor.cpu_percent} color="blue" />
                        <ServerMetric label="RAM" value={`${data.servidor.ram_usada_percent}%`} percent={data.servidor.ram_usada_percent} color="purple" />
                        <ServerMetric label="Disco" value={`${data.servidor.disco_libre_percent}% Libre`} percent={100 - data.servidor.disco_libre_percent} color="emerald" />
                    </div>
                </div>
            </div>

            {/* ================= TABLA/TARJETAS DE PAGOS RECIENTES ================= */}
            <div className="bg-white dark:bg-[#12141a] rounded-[1.5rem] border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden flex-1 flex flex-col transition-colors min-h-[300px]">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center flex-none">
                    <h3 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-widest flex items-center gap-2">
                        <CurrencyDollarIcon className="w-5 h-5 text-emerald-500" /> Últimos Pagos
                    </h3>
                    <Link to="/admin/transacciones" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 px-3 py-1.5 rounded-lg active:scale-95 transition-all flex items-center gap-1">
                        Historial <ArrowUpRightIcon className="w-3 h-3" />
                    </Link>
                </div>
                
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    
                    {/* VISTA ESCRITORIO (Tabla Limpia) */}
                    <table className="w-full text-left text-xs whitespace-nowrap hidden sm:table">
                        <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 text-[9px] uppercase font-black tracking-widest sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                            <tr><th className="px-6 py-4">Cliente</th><th className="px-6 py-4 text-right">Monto Recibido</th><th className="px-6 py-4 text-center">Cobrador</th><th className="px-6 py-4 text-right">Hora</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {data.ultimos_pagos.length > 0 ? data.ultimos_pagos.map((p, i) => (
                                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group bg-transparent">
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{p.cliente}</td>
                                    <td className="px-6 py-4 text-right"><span className="font-black text-emerald-600 dark:text-emerald-400 text-sm tracking-tight">+${p.monto.toLocaleString()}</span></td>
                                    <td className="px-6 py-4 text-center"><span className="inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-extrabold tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase">{p.cobrador}</span></td>
                                    <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500 font-mono text-[11px] font-bold">{p.fecha.split(' ')[1]}</td>
                                </tr>
                            )) : <tr><td colSpan={4} className="p-10 text-center text-slate-400 font-bold">No hay pagos registrados hoy.</td></tr>}
                        </tbody>
                    </table>

                    {/* VISTA MÓVIL (Tarjetas de Transacción) */}
                    <div className="sm:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800/40">
                        {data.ultimos_pagos.length > 0 ? data.ultimos_pagos.map((p, i) => (
                            <div key={i} className="p-4 flex items-center justify-between bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                                        <CurrencyDollarIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{p.cliente}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{p.cobrador} • {p.fecha.split(' ')[1]}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 pl-3">
                                    <p className="font-black text-emerald-600 dark:text-emerald-400 text-base tracking-tight">+${p.monto.toLocaleString()}</p>
                                </div>
                            </div>
                        )) : <div className="p-10 text-center text-slate-400 font-bold text-sm">Sin movimientos hoy.</div>}
                    </div>

                </div>
            </div>

            {/* ================= MODALES ================= */}
            <Transition appear show={isPosOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[150]" onClose={() => setIsPosOpen(false)}>
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" />
                    <div className="fixed inset-0 overflow-y-auto flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <Dialog.Panel className="w-full h-[96dvh] sm:h-auto sm:max-h-[90vh] sm:max-w-5xl rounded-t-[2rem] sm:rounded-[2rem] bg-white dark:bg-[#0a0c10] border-0 sm:border border-slate-200 dark:border-slate-800 transform transition-all overflow-hidden shadow-2xl">
                            <RegistrarPago onCancel={() => setIsPosOpen(false)} onSuccess={handlePosSuccess} />
                        </Dialog.Panel>
                    </div>
                </Dialog>
            </Transition>

            <CreateClientModal isOpen={isCreateClientOpen} onClose={() => setIsCreateClientOpen(false)} onSuccess={handleCreateClientSuccess} routers={routersList} />
        </div>
    );
}

// ================= SUBCOMPONENTES REFINADOS =================

const KpiCard = ({ title, value, icon: Icon, color, bg, border, extra, extraLabel, isTextExtra }: KpiCardProps) => (
    <div className={`p-4 rounded-[1.25rem] border transition-all shrink-0 min-w-[150px] snap-start flex-1 flex flex-col justify-between border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#12141a] shadow-sm relative overflow-hidden group`}>
        <div className="flex justify-between items-start mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">{title}</p>
            <div className={`p-1.5 rounded-xl border ${bg} ${border} relative z-10`}><Icon className={`w-4 h-4 ${color}`} /></div>
        </div>
        <div className="relative z-10">
            <p className={`text-2xl font-black text-slate-800 dark:text-white`}>{value}</p>
            <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                {isTextExtra ? extra : <><span className={color}>{extra}</span> {extraLabel}</>}
            </div>
        </div>
        {/* Fondo decorativo sutil */}
        <Icon className={`absolute -right-4 -bottom-4 w-20 h-20 opacity-5 dark:opacity-[0.03] -rotate-12 group-hover:scale-110 transition-transform duration-500 ${color}`} />
    </div>
);

const SystemListItem = ({ label, value, color, bg, blink, icon: Icon }: SystemListItemProps) => (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${bg} ${color} ${blink ? 'animate-pulse' : ''}`}>
                <Icon className="w-4 h-4" />
            </div>
            <span className={`text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors`}>
                {label}
            </span>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest min-w-[2.5rem] text-center border ${blink ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}>
            {value}
        </span>
    </div>
);

const ServerMetric = ({ label, value, percent, color }: ServerMetricProps) => {
    const textColors: Record<ServerMetricColor, string> = { blue: 'text-blue-500', purple: 'text-purple-500', emerald: 'text-emerald-500' };
    const bgColors: Record<ServerMetricColor, string> = { blue: 'bg-blue-500', purple: 'bg-purple-500', emerald: 'bg-emerald-500' };
    
    return (
        <div className="group">
            <div className="flex justify-between mb-1.5 items-end">
                <span className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest">{label}</span>
                <span className={`text-xs font-black tracking-wider ${textColors[color]}`}>{value}</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-900/80 rounded-full h-1.5 overflow-hidden border border-slate-200/50 dark:border-slate-800 shadow-inner">
                <div className={`h-full rounded-full transition-all duration-1000 ${bgColors[color]} shadow-[0_0_8px_currentColor]`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};
