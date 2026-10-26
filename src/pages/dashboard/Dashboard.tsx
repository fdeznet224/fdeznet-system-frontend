import { useState, useEffect, useCallback, Fragment } from 'react';
import client from '@/api/axios';
import { Dialog, Transition } from '@headlessui/react';
import type { ComponentType, ReactNode } from 'react';
import {
    UsersIcon, CurrencyDollarIcon, ServerIcon, ArrowPathIcon,
    CpuChipIcon, ExclamationTriangleIcon, BanknotesIcon, UserPlusIcon,
    PauseIcon, CircleStackIcon, WifiIcon, ArrowUpRightIcon, DocumentTextIcon,
    WrenchScrewdriverIcon, SignalSlashIcon, DocumentCheckIcon, UserGroupIcon, ChevronRightIcon,
    SignalIcon, BoltSlashIcon, CheckCircleIcon, XCircleIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { CuadroIcono, EncabezadoPagina, FilaLista, Lista } from '@/components/ui/Pagina';
import { BOTON_ACCION_PRIMARIO, BOTON_ACCION_SECUNDARIO, CUADRO_TONO, TARJETA, TEXTO_TONO, TITULO_SECCION, type Tono } from '@/components/ui/estilo';
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
    pendientes?: {
        facturas_no_pagadas: number;
        saldo_no_pagado: number;
        facturas_vencidas: number;
        saldo_vencido: number;
        ordenes_instalacion: number;
        ordenes_reparacion: number;
        routers_conectados: number;
        routers_desconectados: number;
        clientes_activos: number;
    };
}

interface ResumenOlts {
    olts_en_linea: number;
    olts_fuera: number;
    olts_fuera_nombres: string[];
    onu_en_linea: number;
    onu_fuera: number;
    onu_potencia_baja: number;
    clientes_onu_fuera: number[];
    clientes_potencia_baja: number[];
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
    const [olts, setOlts] = useState<ResumenOlts | null>(null);

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

    // Leer las OLT tarda unos segundos: va aparte para no detener Inicio.
    useEffect(() => {
        const leer = () => client.get<ResumenOlts>('/dashboard/olts').then(({ data }) => setOlts(data)).catch(() => undefined);
        void leer();
        const intervalo = setInterval(leer, 60000);
        return () => clearInterval(intervalo);
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

    const hoy = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
    const pesos = (valor: number) => `$${valor.toLocaleString('es-MX')}`;
    const { metricas, resumen_clientes: resumen, finanzas } = data;
    const pendientes = data.pendientes;
    const sinConexion = metricas.clientes_offline_mikrotik || 0;
    const routersCaidos = pendientes?.routers_desconectados ?? 0;

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
            <EncabezadoPagina
                etiqueta={hoy.charAt(0).toUpperCase() + hoy.slice(1)}
                titulo="Inicio"
                acciones={
                    <>
                        <button type="button" onClick={() => setIsPosOpen(true)} aria-label="Cobrar" className={`${BOTON_ACCION_PRIMARIO} flex-1 sm:flex-none`}>
                            <BanknotesIcon className="h-5 w-5" /> Cobrar
                        </button>
                        <button type="button" onClick={() => setIsCreateClientOpen(true)} className={`${BOTON_ACCION_SECUNDARIO} flex-1 sm:flex-none`}>
                            <UserPlusIcon className="h-5 w-5" /> Nuevo cliente
                        </button>
                    </>
                }
            />

            {data.inventario?.bajo && (
                <Link
                    to="/admin/inventario"
                    className="-mt-4 flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20"
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

            {/* Cuatro tarjetas: el número del día arriba y su total abajo. */}
            {/* En el celular van en una fila que se desliza de lado. */}
            <div className="-mx-4 -mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 lg:gap-4 [&::-webkit-scrollbar]:hidden">
                <TarjetaDoble
                    icono={WifiIcon} tono="verde" a="/admin/clientes"
                    titulo="Clientes en línea" valor={metricas.clientes_online_mikrotik || 0} detalle="Conectados al MikroTik"
                    abajo="Total en el sistema" valorAbajo={resumen.total_clientes}
                />
                <TarjetaDoble
                    icono={BanknotesIcon} tono="azul" a="/admin/transacciones"
                    titulo="Cobrado hoy" valor={pesos(finanzas.cobrado_hoy)} detalle={`${finanzas.clientes_cobrados_hoy || 0} clientes`}
                    abajo="Cobrado este mes" valorAbajo={pesos(finanzas.cobrado_mes)}
                />
                <TarjetaDoble
                    icono={DocumentTextIcon} tono="ambar" a="/admin/facturas"
                    titulo="Facturas no pagadas" valor={pendientes?.facturas_no_pagadas ?? 0} detalle={pesos(pendientes?.saldo_no_pagado ?? 0)}
                    abajo="Vencidas" valorAbajo={pendientes?.facturas_vencidas ?? 0} tonoAbajo={pendientes?.facturas_vencidas ? 'rojo' : undefined}
                />
                <TarjetaDoble
                    icono={WrenchScrewdriverIcon} tono="violeta" a="/admin/ordenes"
                    titulo="Órdenes de instalación" valor={pendientes?.ordenes_instalacion ?? 0} detalle="Sin terminar"
                    abajo="Órdenes de reparación" valorAbajo={pendientes?.ordenes_reparacion ?? 0}
                />
            </div>

            <section>
                <h2 className={`${TITULO_SECCION} pb-1.5`}>Resumen del sistema</h2>
                <div className={`${TARJETA} grid grid-cols-1 gap-px overflow-hidden bg-[#ececf0] sm:grid-cols-2 lg:grid-cols-3 dark:bg-slate-800 [&>*]:bg-white dark:[&>*]:bg-slate-900`}>
                    <FilaLista icono={ServerIcon} tono="verde" titulo="Routers activos" detalle="Responden al sistema" valor={pendientes?.routers_conectados ?? 0} a="/admin/routers" />
                    <FilaLista icono={SignalSlashIcon} tono={routersCaidos ? 'rojo' : 'neutro'} titulo="Routers desconectados" detalle={routersCaidos ? 'Sin respuesta: revisar' : 'Todos en línea'} valor={routersCaidos} tonoValor={routersCaidos ? 'rojo' : undefined} a="/admin/routers" />
                    <FilaLista icono={UsersIcon} tono="azul" titulo="Clientes activos" detalle="Con servicio activo" valor={pendientes?.clientes_activos ?? resumen.contratos_activos} a="/admin/clientes" />
                    <FilaLista icono={PauseIcon} tono="ambar" titulo="Clientes suspendidos" detalle="Por falta de pago" valor={metricas.total_suspendidos || resumen.contratos_suspendidos || 0} a="/admin/clientes" />
                    <FilaLista icono={DocumentCheckIcon} tono="violeta" titulo="Contratos activos" detalle={`${resumen.total_servicios_actuales} servicios en total`} valor={resumen.contratos_activos} a="/admin/clientes" />
                    <FilaLista icono={UserGroupIcon} tono={sinConexion ? 'rojo' : 'neutro'} titulo="Clientes offline" detalle={sinConexion ? 'Sin sesión en el MikroTik' : 'Todos conectados'} valor={sinConexion} tonoValor={sinConexion ? 'rojo' : undefined} a="/admin/clientes" />
                </div>
            </section>

            <section>
                <div className="flex items-end justify-between gap-3 px-1 pb-1.5">
                    <h2 className={TITULO_SECCION.replace('px-1 ', '')}>Últimos cobros</h2>
                    <Link to="/admin/transacciones" className="flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400">Historial <ArrowUpRightIcon className="h-3.5 w-3.5" /></Link>
                </div>
                <div className={`${TARJETA} overflow-hidden`}>
                    {data.ultimos_pagos.length === 0 ? (
                        <FilaLista icono={CurrencyDollarIcon} tono="neutro" titulo="No hay cobros registrados." />
                    ) : (
                        <>
                            <div className="hidden grid-cols-[1fr_1fr_90px_70px_110px] gap-3 border-b border-[#ececf0] px-4 py-2.5 text-[12px] font-semibold uppercase text-[#5b6170] dark:border-slate-800 dark:text-slate-400 sm:grid">
                                <span>Cliente</span><span>Cobró</span><span>Fecha</span><span>Hora</span><span className="text-right">Monto</span>
                            </div>
                            <ul className="divide-y divide-[#ececf0] dark:divide-slate-800">
                                {data.ultimos_pagos.map((p, i) => {
                                    const [fecha, hora = ''] = p.fecha.split(' ');
                                    return (
                                        <li key={i} className="flex items-center gap-3 px-3.5 py-2.5 sm:grid sm:grid-cols-[1fr_1fr_90px_70px_110px] sm:px-4">
                                            <CuadroIcono icono={CurrencyDollarIcon} tono="verde" className="sm:hidden" />
                                            <span className="min-w-0 flex-1 sm:contents">
                                                <span className="block truncate text-[15px] font-semibold text-slate-900 dark:text-white">{p.cliente}</span>
                                                <span className="block truncate text-[13px] text-[#5b6170] dark:text-slate-400 sm:hidden">{p.cobrador} · {fecha} {hora}</span>
                                                <span className="hidden truncate text-[14px] text-slate-700 dark:text-slate-300 sm:block">{p.cobrador}</span>
                                                <span className="hidden text-[14px] tabular-nums text-[#5b6170] dark:text-slate-400 sm:block">{fecha}</span>
                                                <span className="hidden text-[14px] tabular-nums text-[#5b6170] dark:text-slate-400 sm:block">{hora}</span>
                                            </span>
                                            <span className="shrink-0 text-right text-[15px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400">+{pesos(p.monto)}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
                <MonitoreoOlt olts={olts} />

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

/** Tarjeta de Inicio: número principal arriba y, separado por una línea, su total. */
function TarjetaDoble({ icono, tono, titulo, valor, detalle, abajo, valorAbajo, tonoAbajo, a }: {
    icono: ComponentType<{ className?: string }>;
    tono: Tono;
    titulo: string;
    valor: ReactNode;
    detalle?: string;
    abajo: string;
    valorAbajo: ReactNode;
    tonoAbajo?: Tono;
    a: string;
}) {
    return (
        <Link to={a} className={`${TARJETA} group relative flex w-[72%] shrink-0 snap-start flex-col overflow-hidden p-4 sm:w-auto transition hover:shadow-md active:scale-[0.99]`}>
            <span className={`absolute inset-x-0 top-0 h-1 ${CUADRO_TONO[tono]}`} aria-hidden="true" />
            <span className="flex items-center gap-2.5">
                <CuadroIcono icono={icono} tono={tono} />
                <span className="min-w-0 flex-1 text-[13px] font-semibold leading-tight text-[#5b6170] dark:text-slate-400">{titulo}</span>
                <ChevronRightIcon className="hidden h-4 w-4 shrink-0 text-[#a1a1aa] sm:block" aria-hidden="true" />
            </span>
            <span className={`mt-3 block truncate text-[26px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[30px] ${TEXTO_TONO[tono]}`}>{valor}</span>
            {detalle && <span className="mt-1 block truncate text-[12px] text-[#5b6170] dark:text-slate-400">{detalle}</span>}
            <span className="mt-3 flex items-center justify-between gap-2 border-t border-[#ececf0] pt-2.5 dark:border-slate-800">
                <span className="min-w-0 truncate text-[12px] font-medium text-[#5b6170] dark:text-slate-400 sm:text-[13px]">{abajo}</span>
                <span className={`shrink-0 text-[15px] font-bold tabular-nums ${tonoAbajo ? TEXTO_TONO[tonoAbajo] : 'text-slate-900 dark:text-white'}`}>{valorAbajo}</span>
            </span>
        </Link>
    );
}

/** OLT y ONU de los clientes; cada renglón lleva a esos clientes en Clientes. */
function MonitoreoOlt({ olts }: { olts: ResumenOlts | null }) {
    const leyendo = olts === null;
    const cifra = (valor?: number) => (leyendo ? '…' : valor ?? 0);
    const aClientes = (ids?: number[]) => (ids && ids.length ? `/admin/clientes?revisar=${ids.join(',')}` : undefined);
    const caidas = olts?.olts_fuera ?? 0;
    const onuFuera = olts?.onu_fuera ?? 0;
    const baja = olts?.onu_potencia_baja ?? 0;
    return (
        <Lista titulo="Monitoreo OLT" pie={leyendo ? 'Leyendo las OLT…' : 'Se actualiza cada minuto.'}>
            <FilaLista icono={SignalIcon} tono="verde" titulo="OLT en línea" detalle="Responden al sistema" valor={cifra(olts?.olts_en_linea)} a="/admin/radar" />
            <FilaLista
                icono={SignalSlashIcon} tono={caidas ? 'rojo' : 'neutro'} titulo="OLT fuera de línea"
                detalle={caidas ? olts?.olts_fuera_nombres.join(', ') : 'Todas responden'}
                valor={cifra(olts?.olts_fuera)} tonoValor={caidas ? 'rojo' : undefined} a="/admin/radar"
            />
            <FilaLista icono={CheckCircleIcon} tono="verde" titulo="ONU en línea" detalle="De clientes" valor={cifra(olts?.onu_en_linea)} />
            <FilaLista
                icono={XCircleIcon} tono={onuFuera ? 'rojo' : 'neutro'} titulo="ONU fuera de línea" detalle={onuFuera ? 'Ver esos clientes' : 'Ninguna'}
                valor={cifra(olts?.onu_fuera)} tonoValor={onuFuera ? 'rojo' : undefined} a={aClientes(olts?.clientes_onu_fuera)}
            />
            <FilaLista
                icono={BoltSlashIcon} tono={baja ? 'ambar' : 'neutro'} titulo="ONU con potencia baja" detalle="Peor que -27 dBm"
                valor={cifra(olts?.onu_potencia_baja)} tonoValor={baja ? 'ambar' : undefined} a={aClientes(olts?.clientes_potencia_baja)}
            />
        </Lista>
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
