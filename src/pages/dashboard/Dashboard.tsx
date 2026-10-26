import { useState, useEffect, useCallback, Fragment } from 'react';
import client from '@/api/axios';
import { Dialog, Transition } from '@headlessui/react';
import {
    UsersIcon, CurrencyDollarIcon, ServerIcon, ArrowPathIcon,
    CreditCardIcon, CpuChipIcon, ExclamationTriangleIcon,
    BanknotesIcon, UserPlusIcon, PauseIcon, CircleStackIcon,
    WifiIcon, ArrowUpRightIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { EncabezadoPagina, FilaLista, Lista } from '@/components/ui/Pagina';
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
    const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const pesos = (valor: number) => `$${valor.toLocaleString('es-MX')}`;

    const facturacion = data.facturacion;

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
            <EncabezadoPagina etiqueta={hoy.charAt(0).toUpperCase() + hoy.slice(1)} titulo="Inicio" />

            {data.inventario?.bajo && (
                <Link
                    to="/admin/inventario"
                    className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20"
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

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                <div className="flex flex-col gap-5">
                    {/* COBRANZA DEL CICLO: lo primero que se ve, con los dos botones de todos los días */}
                    <section className="flex flex-col gap-3 rounded-[20px] bg-blue-700 p-5 text-white">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold">Cobranza del ciclo</h2>
                            {facturacion && (
                                <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
                                    {facturacion.pendientes} pendientes
                                </span>
                            )}
                        </div>
                        <p className="text-[40px] font-extrabold leading-none tracking-tight tabular-nums">{porcentajeRecaudado}%</p>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
                            <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${Math.min(100, porcentajeRecaudado)}%` }} />
                        </div>
                        <p className="text-[13px] text-blue-100">{facturacion?.pagadas ?? 0} pagadas de {facturacion?.total ?? 0} facturas</p>
                        <div className="mt-1 grid grid-cols-2 gap-2.5">
                            <button type="button" onClick={() => setIsPosOpen(true)} aria-label="Cobrar" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-slate-900 transition active:scale-[0.98]">
                                <BanknotesIcon className="h-5 w-5" /> Cobrar
                            </button>
                            <button type="button" onClick={() => setIsCreateClientOpen(true)} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/20 text-sm font-bold text-white transition active:scale-[0.98]">
                                <UserPlusIcon className="h-5 w-5" /> Nuevo cliente
                            </button>
                        </div>
                    </section>

                    <Lista titulo="Red">
                        <FilaLista icono={WifiIcon} tono="verde" titulo="En línea" detalle="Con sesión en el MikroTik" valor={totalConectados} a="/admin/clientes" />
                        <FilaLista icono={ExclamationTriangleIcon} tono={totalSinSesion ? 'rojo' : 'neutro'} titulo="Sin conexión" detalle={totalSinSesion ? 'Activos sin sesión: revisar' : 'Todos conectados'} valor={totalSinSesion} tonoValor={totalSinSesion ? 'rojo' : undefined} a="/admin/clientes" />
                        <FilaLista icono={PauseIcon} tono="ambar" titulo="Suspendidos" detalle="Por falta de pago" valor={totalSuspendidos} a="/admin/clientes" />
                        <FilaLista icono={ServerIcon} tono="neutro" titulo="Routers" detalle="MikroTik registrados" valor={routersList.length} a="/admin/routers" />
                    </Lista>
                </div>

                <div className="flex flex-col gap-5">
                    <Lista titulo="Cobranza">
                        <FilaLista icono={BanknotesIcon} tono="verde" titulo="Cobrado hoy" detalle={`${data.finanzas.clientes_cobrados_hoy || 0} clientes`} valor={pesos(data.finanzas.cobrado_hoy)} />
                        <FilaLista icono={CreditCardIcon} tono="azul" titulo="Cobrado en el mes" detalle={`${data.finanzas.clientes_cobrados_mes || 0} clientes`} valor={pesos(data.finanzas.cobrado_mes)} a="/admin/transacciones" />
                        <FilaLista icono={UsersIcon} tono="violeta" titulo="Clientes actuales" detalle={`${data.resumen_clientes.total_servicios_actuales} servicios`} valor={data.resumen_clientes.total_clientes} a="/admin/clientes" />
                    </Lista>

                    <Lista
                        titulo="Últimos pagos"
                        accion={<Link to="/admin/transacciones" className="flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Historial <ArrowUpRightIcon className="h-3.5 w-3.5" /></Link>}
                    >
                        {data.ultimos_pagos.length === 0 ? (
                            <FilaLista icono={CurrencyDollarIcon} tono="neutro" titulo="No hay pagos registrados hoy." />
                        ) : data.ultimos_pagos.map((p, i) => (
                            <FilaLista
                                key={i}
                                icono={CurrencyDollarIcon}
                                tono="verde"
                                titulo={p.cliente}
                                detalle={`${p.cobrador} · ${p.fecha.split(' ')[1] ?? ''}`}
                                valor={`+${pesos(p.monto)}`}
                                tonoValor="verde"
                            />
                        ))}
                    </Lista>

                    <Lista titulo="Servidor">
                        <FilaLista icono={CpuChipIcon} tono="azul" titulo="Procesador" valor={`${data.servidor.cpu_percent}%`}>
                            <Barra porcentaje={data.servidor.cpu_percent} />
                        </FilaLista>
                        <FilaLista icono={CircleStackIcon} tono="violeta" titulo="Memoria" valor={`${data.servidor.ram_usada_percent}%`}>
                            <Barra porcentaje={data.servidor.ram_usada_percent} />
                        </FilaLista>
                        <FilaLista icono={ServerIcon} tono="verde" titulo="Disco libre" valor={`${data.servidor.disco_libre_percent}%`}>
                            <Barra porcentaje={100 - data.servidor.disco_libre_percent} />
                        </FilaLista>
                    </Lista>
                </div>
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

/** Uso del servidor: barra fina debajo del renglón. */
function Barra({ porcentaje }: { porcentaje: number }) {
    const alto = porcentaje >= 85;
    return (
        <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-[#ececf0] dark:bg-slate-800">
            <span className={`block h-full rounded-full transition-all duration-700 ${alto ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }} />
        </span>
    );
}
