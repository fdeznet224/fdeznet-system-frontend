import { useState, useEffect, useCallback, Fragment } from 'react';
import client from '@/api/axios';
import { Dialog, Transition } from '@headlessui/react';
import {
    UsersIcon, CurrencyDollarIcon, ServerIcon, ArrowPathIcon,
    CreditCardIcon, CpuChipIcon, ExclamationTriangleIcon,
    BanknotesIcon, UserPlusIcon,
    WifiIcon, ChartPieIcon, ArrowUpRightIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { BOTON_ACCION_PRIMARIO, BOTON_ACCION_SECUNDARIO } from '@/components/ui/estilo';
import { EncabezadoPagina, Metrica, Seccion, TituloGrupo, Vacio } from '@/components/ui/Pagina';
import RegistrarPago from '@/pages/finanzas/components/RegistrarPago';
import CreateClientModal from '@/pages/clientes/components/CreateClientModal';

interface DashboardData {
    inventario?: { disponibles: number; minimo: number; bajo: boolean };
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

    if (loading) return <div className="flex h-[60vh] items-center justify-center"><ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" /></div>;
    if (!data) return null;

    const totalConectados = data.metricas.clientes_online_mikrotik || 0;
    const totalSinSesion = data.metricas.clientes_offline_mikrotik || 0;
    const totalSuspendidos = data.metricas.total_suspendidos || data.resumen_clientes.contratos_suspendidos || 0;
    const porcentajeRecaudado = data.facturacion?.porcentaje ?? 0;
    const usuario = (() => { try { return (JSON.parse(localStorage.getItem('user') || '{}') as { usuario?: string }).usuario || ''; } catch { return ''; } })();
    const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const pesos = (valor: number) => `$${valor.toLocaleString('es-MX')}`;

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <EncabezadoPagina
                etiqueta={hoy.charAt(0).toUpperCase() + hoy.slice(1)}
                titulo={usuario ? `Hola, ${usuario}` : 'Inicio'}
                descripcion="Panel de Control: red, clientes y cobranza en un vistazo."
                acciones={(
                    <>
                        <button type="button" onClick={() => setIsCreateClientOpen(true)} className={BOTON_ACCION_SECUNDARIO}>
                            <UserPlusIcon className="h-5 w-5" /> Nuevo cliente
                        </button>
                        <button type="button" onClick={() => setIsPosOpen(true)} aria-label="Cobrar" className={BOTON_ACCION_PRIMARIO}>
                            <BanknotesIcon className="h-5 w-5" /> Cobrar
                        </button>
                    </>
                )}
            />

            {data.inventario?.bajo && (
                <Link
                    to="/admin/inventario"
                    className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                >
                    <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
                    <span className="min-w-0">
                        <span className="block font-semibold">
                            {data.inventario.disponibles === 0
                                ? 'No quedan ONU en bodega'
                                : `Quedan ${data.inventario.disponibles} ONU en bodega`}
                        </span>
                        <span className="block text-xs">El mínimo es {data.inventario.minimo}. Ingresa equipo antes de la próxima instalación.</span>
                    </span>
                </Link>
            )}

            {/* RED: lo primero que se revisa en la mañana */}
            <div>
                <TituloGrupo>Resumen de Red</TituloGrupo>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Metrica etiqueta="En línea" valor={totalConectados} detalle="Sesión activa en MikroTik" tono="verde" icono={WifiIcon} />
                    <Metrica etiqueta="Servicios Offline / sin sesión" valor={totalSinSesion} detalle={totalSinSesion ? 'Revisar en Clientes' : 'Todo conectado'} tono={totalSinSesion ? 'rojo' : 'neutro'} icono={ExclamationTriangleIcon} />
                    <Metrica etiqueta="Suspendidos" valor={totalSuspendidos} detalle="Por falta de pago" tono="ambar" icono={UsersIcon} />
                    <Metrica etiqueta="Routers" valor={routersList.length} detalle="MikroTik registrados" icono={ServerIcon} />
                </div>
            </div>

            {/* DINERO */}
            <div>
                <TituloGrupo>Cobranza</TituloGrupo>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Metrica etiqueta="Clientes actuales" valor={data.resumen_clientes.total_clientes} detalle={`${data.resumen_clientes.total_servicios_actuales} servicios`} tono="azul" icono={UsersIcon} />
                    <Metrica etiqueta="Ingreso hoy" valor={pesos(data.finanzas.cobrado_hoy)} detalle={`${data.finanzas.clientes_cobrados_hoy || 0} clientes`} tono="verde" icono={BanknotesIcon} />
                    <Metrica etiqueta="Cobrado en el mes" valor={pesos(data.finanzas.cobrado_mes)} detalle={`${data.finanzas.clientes_cobrados_mes || 0} clientes`} icono={CreditCardIcon} />
                    <Metrica etiqueta="Recaudación del ciclo" valor={`${porcentajeRecaudado}%`} icono={ChartPieIcon} tono="violeta">
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <span className="block h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${Math.min(100, porcentajeRecaudado)}%` }} />
                        </span>
                        <span className="mt-1.5 flex justify-between text-xs text-slate-500">
                            <span>{data.facturacion?.pagadas ?? 0} pagadas</span>
                            <span>{data.facturacion?.pendientes ?? 0} pendientes</span>
                        </span>
                    </Metrica>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* ÚLTIMOS PAGOS */}
                <Seccion
                    className="lg:col-span-2"
                    titulo="Últimos pagos"
                    accion={<Link to="/admin/transacciones" className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Historial <ArrowUpRightIcon className="h-3.5 w-3.5" /></Link>}
                >
                    {data.ultimos_pagos.length === 0 ? (
                        <Vacio icono={CurrencyDollarIcon} titulo="No hay pagos registrados hoy." />
                    ) : (
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.ultimos_pagos.map((p, i) => (
                                <li key={i} className="flex items-center gap-3 px-4 py-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                        <CurrencyDollarIcon className="h-5 w-5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{p.cliente}</span>
                                        <span className="block truncate text-xs text-slate-500">{p.cobrador} · {p.fecha.split(' ')[1]}</span>
                                    </span>
                                    <span className="shrink-0 text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">+{pesos(p.monto)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Seccion>

                {/* SERVIDOR */}
                <Seccion titulo={<span className="flex items-center gap-2"><CpuChipIcon className="h-4 w-4 text-slate-400" />Servidor</span>}>
                    <div className="space-y-4 p-4">
                        <ServerMetric label="CPU" value={`${data.servidor.cpu_percent}%`} percent={data.servidor.cpu_percent} color="blue" />
                        <ServerMetric label="Memoria" value={`${data.servidor.ram_usada_percent}%`} percent={data.servidor.ram_usada_percent} color="purple" />
                        <ServerMetric label="Disco" value={`${data.servidor.disco_libre_percent}% libre`} percent={100 - data.servidor.disco_libre_percent} color="emerald" />
                    </div>
                </Seccion>
            </div>

            {/* ================= MODALES ================= */}
            <Transition appear show={isPosOpen} as={Fragment}>
                <Dialog as="div" className="relative z-[150]" onClose={() => setIsPosOpen(false)}>
                    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" />
                    <div className="fixed inset-0 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4">
                        <Dialog.Panel className="h-[96dvh] w-full transform overflow-hidden rounded-t-3xl border-0 border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-950 sm:h-auto sm:max-h-[90vh] sm:max-w-5xl sm:rounded-3xl sm:border">
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

const ServerMetric = ({ label, value, percent, color }: ServerMetricProps) => {
    const textColors: Record<ServerMetricColor, string> = { blue: 'text-blue-500', purple: 'text-purple-500', emerald: 'text-emerald-500' };
    const bgColors: Record<ServerMetricColor, string> = { blue: 'bg-blue-500', purple: 'bg-purple-500', emerald: 'bg-emerald-500' };
    
    return (
        <div className="group">
            <div className="flex justify-between mb-1.5 items-end">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
                <span className={`text-xs font-semibold tabular-nums ${textColors[color]}`}>{value}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full transition-all duration-700 ${bgColors[color]}`} style={{ width: `${percent}%` }}></div>
            </div>
        </div>
    );
};
