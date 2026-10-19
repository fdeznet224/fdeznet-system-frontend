import { useState, useEffect, useMemo, useCallback } from 'react';
import { abrirEquipo } from '@/utils/accesoRemoto';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import {
    MagnifyingGlassIcon, WrenchScrewdriverIcon, ArrowPathIcon, FunnelIcon, UserPlusIcon,
    PhoneIcon, MapPinIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';

import { Dialog, DialogPanel } from '@headlessui/react';
import { BOTON_ACCION_PRIMARIO, BOTON_ICONO, BOTON_SECUNDARIO, TARJETA, TEXTO_TONO, type Tono } from '@/components/ui/estilo';
import { EncabezadoPagina, Pildora, Vacio } from '@/components/ui/Pagina';
import ClientToolsModal, { type ToolMode } from './components/ClientToolsModal';
import { CATEGORIAS_FALLA } from '@/utils/categoriasFalla';
import CreateClientModal from './components/CreateClientModal';
import ClientDetailModal from './components/ClientDetailModal';
import { getNativeMapHref } from '@/utils/nativeActions';

interface OnlineStatus { color: string; diag: string; online: boolean; }

interface ClienteUnificado {
    id: number;
    nombre: string;
    cedula: string;
    telefono?: string;
    direccion?: string;
    latitud?: number;
    longitud?: number;
    zona?: string;
    identificador_onu?: string;
    tipo_conexion?: 'fibra' | 'radio';
    antena?: Antena | null;
    servicio: {
        plan_nombre: string;
        precio_plan: number;
        ip_asignada: string;
        router_nombre: string;
        estado_servicio: string;
    };
    finanzas: {
        facturas_pendientes_cant: number;
        total_deuda: number;
        saldo_a_favor: number;
        estado_financiero: 'al_dia' | 'moroso';
    };
}

interface RouterSummary {
    id: number;
    nombre: string;
    tipo_seguridad?: string;
}

interface DashboardClientStatus {
    color: string;
    diagnostico_sistema: string;
    estado_tecnico: string;
}

interface DashboardStatusResponse {
    detalle_clientes?: Record<string, DashboardClientStatus>;
}

type ClientFilter = 'todos' | 'online' | 'offline' | 'potencia_alta' | 'potencia_normal' | 'senal_bajo' | 'suspendidos' | 'activos' | 'morosos' | 'radio' | 'fibra' | 'antena_caida';

/** Última potencia óptica leída de la OLT (se lee cada hora). */
interface Potencia { rx: number; nivel: 'alta' | 'normal'; fecha: string | null }

/** Señal de ahora contra su normal de la semana (Monitoreo › Mapa › Señal). */
interface CambioSenal { actual: number; normal: number; cambio_db: number; nivel: 'estable' | 'bajo' | 'bajo_fuerte' }

/** Último ping a la antena (Ubiquiti) de un cliente por radioenlace. */
interface Antena { ip: string | null; responde: boolean | null; latencia_ms: number | null; perdida: number | null; fecha: string | null }

/** Cómo llega el servicio: 📡 radioenlace o ⚡ fibra óptica. */
function IconoConexion({ tipo }: { tipo?: 'fibra' | 'radio' }) {
    const radio = tipo === 'radio';
    return (
        <span
            role="img"
            title={radio ? 'Radioenlace' : 'Fibra óptica'}
            aria-label={radio ? 'Radioenlace' : 'Fibra óptica'}
            className="shrink-0 select-none text-sm leading-none"
        >
            {radio ? '📡' : '⚡'}
        </span>
    );
}

/** Para radioenlace va en lugar de la potencia de la ONU. */
function AntenaCliente({ antena }: { antena?: Antena | null }) {
    if (!antena) return null;
    const base = 'mt-1 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold';
    if (!antena.ip) return <span className={`${base} bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400`}>Sin IP de antena</span>;
    if (antena.responde == null) return <span className={`${base} bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400`}>Antena sin revisar</span>;
    return (
        <span
            title={`Antena ${antena.ip}${antena.perdida ? ` · ${antena.perdida}% de pérdida` : ''}`}
            className={`${base} ${antena.responde
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'}`}
        >
            {antena.responde ? `Antena responde${antena.latencia_ms != null ? ` · ${antena.latencia_ms} ms` : ''}` : 'Antena no responde'}
        </span>
    );
}

/** "Potencia alta": la señal ya pasó de -27 dBm y la conexión empieza a fallar. */
function PotenciaCliente({ potencia, cambio }: { potencia?: Potencia; cambio?: CambioSenal }) {
    if (!potencia) return null;
    return (
        <>
        <span
            title={potencia.nivel === 'alta' ? 'Potencia alta: peor que -27 dBm' : 'Potencia normal'}
            className={`mt-1 inline-block rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${potencia.nivel === 'alta'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}
        >
            {potencia.rx.toFixed(2)} dBm
        </span>
        {cambio && cambio.nivel !== 'estable' && (
            <span
                title={`Su señal normal es ${cambio.normal.toFixed(2)} dBm; ahora ${cambio.actual.toFixed(2)} dBm`}
                className={`mt-1 ml-1 inline-block rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold ${cambio.nivel === 'bajo_fuerte'
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}
            >
                ▼ {Math.abs(cambio.cambio_db).toFixed(1)} dB
            </span>
        )}
        </>
    );
}

/** Reporte de falla abierto del cliente (orden de reparación sin terminar). */
interface ReporteAbierto { id: number; estado: string; categoria: string; tecnico: string | null }

/** Con reporte abierto se ve su número; con potencia alta (o venido del aviso) y sin reporte, el acceso para levantarlo. */
function ReporteCliente({ reporte, potencia, sugerir, onReportar }: { reporte?: ReporteAbierto; potencia?: Potencia; sugerir?: boolean; onReportar: () => void }) {
    if (reporte) {
        return (
            <span
                title={`${CATEGORIAS_FALLA[reporte.categoria] || reporte.categoria} · ${reporte.estado.replace('_', ' ')}${reporte.tecnico ? ` · ${reporte.tecnico}` : ' · sin técnico'}`}
                className="mt-1 ml-1 inline-block rounded-md bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
            >
                🔧 Reporte #{reporte.id}
            </span>
        );
    }
    if (potencia?.nivel !== 'alta' && !sugerir) return null;
    return (
        <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onReportar(); }}
            className="mt-1 ml-1 inline-block rounded-md border border-orange-200 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700 hover:bg-orange-50 dark:border-orange-500/30 dark:text-orange-300 dark:hover:bg-orange-500/10"
        >
            Reportar falla
        </button>
    );
}

interface ClientModalState {
    show: boolean;
    cliente: ClienteUnificado | null;
    modo?: ToolMode;
}

const mobileStatusFilters: ClientFilter[] = ['todos', 'online', 'offline', 'potencia_alta', 'potencia_normal', 'radio', 'fibra', 'antena_caida', 'suspendidos', 'morosos'];

export default function Clientes() {
    const [clientes, setClientes] = useState<ClienteUnificado[]>([]);
    const [onlineStatus, setOnlineStatus] = useState<Map<string, OnlineStatus>>(new Map());
    const [potencias, setPotencias] = useState<Record<string, Potencia>>({});
    const [cambiosSenal, setCambiosSenal] = useState<Record<string, CambioSenal>>({});
    // null: este usuario no maneja reportes de falla (solo admin y supervisor).
    const [reportes, setReportes] = useState<Record<string, ReporteAbierto> | null>(null);
    const [routers, setRouters] = useState<RouterSummary[]>([]);
    const [loading, setLoading] = useState(true);

    const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false);

    const [busqueda, setBusqueda] = useState('');
    const [filtroRouter, setFiltroRouter] = useState('');
    const [filtroZona, setFiltroZona] = useState(''); // 🔥 NUEVO ESTADO PARA ZONAS
    // 🔥 Agregado 'offline' a las opciones permitidas
    const [filtroEstado, setFiltroEstado] = useState<ClientFilter>('todos');
    // ?revisar=5,12: los clientes del aviso diario de señal (enlace del WhatsApp).
    const [searchParams, setSearchParams] = useSearchParams();
    const idsRevisar = useMemo(() => {
        const valor = searchParams.get('revisar');
        return valor ? new Set(valor.split(',').map((id) => id.trim()).filter(Boolean)) : null;
    }, [searchParams]);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [toolModal, setToolModal] = useState<ClientModalState>({ show: false, cliente: null });
    const [detailModal, setDetailModal] = useState<ClientModalState>({ show: false, cliente: null });

    const fetchData = useCallback(async () => {
        // Los extras (en línea, potencias, señal, reportes) se piden a la vez
        // y llenan la tabla conforme llegan: la lista no los espera.
        void client.get<DashboardStatusResponse>('/dashboard/status-tabla-clientes')
            .then((resOnline) => {
                const detalleClientes = resOnline.data.detalle_clientes;
                if (!detalleClientes) return;
                const mapaEstados = new Map<string, OnlineStatus>();
                Object.entries(detalleClientes).forEach(([clienteId, item]) => {
                    mapaEstados.set(clienteId, {
                        color: item.color,
                        diag: item.diagnostico_sistema,
                        online: item.estado_tecnico === 'ONLINE'
                    });
                });
                setOnlineStatus(mapaEstados);
            })
            .catch((err) => console.warn("Dashboard online no disponible", err));
        void client.get<Record<string, Potencia>>('/ftth/potencias')
            .then((res) => setPotencias(res.data))
            .catch(() => console.warn("Potencias no disponibles"));
        void client.get<{ clientes: Record<string, CambioSenal> }>('/ftth/atenuacion')
            .then((res) => setCambiosSenal(res.data.clientes ?? {}))
            .catch(() => console.warn("Atenuación no disponible"));
        void client.get<Record<string, ReporteAbierto>>('/soporte/abiertas')
            .then((res) => setReportes(res.data))
            .catch(() => console.warn("Reportes de falla no disponibles"));

        try {
            const [resClientes, resRouters] = await Promise.all([
                client.get<ClienteUnificado[]>('/clientes/listado-completo-unificado'),
                client.get<RouterSummary[]>('/network/routers/')
            ]);
            setClientes(resClientes.data);
            setRouters(resRouters.data);
        } catch {
            toast.error("Error al cargar datos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => void fetchData(), 0);
        const intervalData = setInterval(fetchData, 60000);
        return () => {
            window.clearTimeout(initialLoad);
            clearInterval(intervalData);
        };
    }, [fetchData]);

    const clientesFiltrados = useMemo(() => {
        return clientes.filter(c => {
            if (idsRevisar && !idsRevisar.has(c.id.toString())) return false;
            const term = busqueda.toLowerCase();
            const matchTexto =
                c.nombre.toLowerCase().includes(term) ||
                c.servicio.ip_asignada.includes(term) ||
                c.id.toString().includes(term) ||
                (c.cedula && c.cedula.toLowerCase().includes(term)) ||
                (c.zona && c.zona.toLowerCase().includes(term));

            if (!matchTexto) return false;

            // Filtro Router
            if (filtroRouter) {
                const rSelect = routers.find(r => r.id.toString() === filtroRouter);
                if (rSelect && c.servicio.router_nombre !== rSelect.nombre) return false;
            }

            // 🔥 Filtro Zona Lógica
            if (filtroZona && c.zona !== filtroZona) return false;

            // Filtros de Estado
            if (filtroEstado === 'activos') return c.servicio.estado_servicio === 'activo';
            if (filtroEstado === 'suspendidos') return c.servicio.estado_servicio !== 'activo';
            if (filtroEstado === 'morosos') return c.finanzas.estado_financiero === 'moroso';
            if (filtroEstado === 'online') return onlineStatus.get(c.id.toString())?.online === true;
            if (filtroEstado === 'offline') return onlineStatus.get(c.id.toString())?.online === false; // 🔥 Atrapa los errores de conexión
            if (filtroEstado === 'potencia_alta') return potencias[c.id.toString()]?.nivel === 'alta';
            if (filtroEstado === 'potencia_normal') return potencias[c.id.toString()]?.nivel === 'normal';
            if (filtroEstado === 'senal_bajo') return (cambiosSenal[c.id.toString()]?.nivel ?? 'estable') !== 'estable';
            if (filtroEstado === 'radio') return c.tipo_conexion === 'radio';
            if (filtroEstado === 'fibra') return c.tipo_conexion !== 'radio';
            if (filtroEstado === 'antena_caida') return c.tipo_conexion === 'radio' && c.antena?.responde === false;

            return true;
        });
    }, [clientes, idsRevisar, busqueda, filtroRouter, filtroZona, filtroEstado, onlineStatus, potencias, cambiosSenal, routers]);

    // Extraemos las zonas únicas dinámicamente de tus clientes
    const zonasUnicas = Array.from(new Set(clientes.map(c => c.zona).filter((zona): zona is string => Boolean(zona))));
    const resumen = useMemo(() => ({
        total: clientes.length,
        online: clientes.filter(c => onlineStatus.get(c.id.toString())?.online === true).length,
        offline: clientes.filter(c => onlineStatus.get(c.id.toString())?.online === false).length,
        potenciaAlta: clientes.filter(c => potencias[c.id.toString()]?.nivel === 'alta').length,
        potenciaNormal: clientes.filter(c => potencias[c.id.toString()]?.nivel === 'normal').length,
        senalBajo: clientes.filter(c => (cambiosSenal[c.id.toString()]?.nivel ?? 'estable') !== 'estable').length,
        suspendidos: clientes.filter(c => c.servicio.estado_servicio !== 'activo').length,
        morosos: clientes.filter(c => c.finanzas.total_deuda > 0).length,
        radio: clientes.filter(c => c.tipo_conexion === 'radio').length,
        antenaCaida: clientes.filter(c => c.tipo_conexion === 'radio' && c.antena?.responde === false).length,
    }), [clientes, onlineStatus, potencias, cambiosSenal]);

    // Contadores de arriba: tocar uno filtra la lista; tocarlo otra vez la muestra completa.
    const contadores: { filtro: ClientFilter; valor: number; texto: string; tono: Tono }[] = [
        { filtro: 'online', valor: resumen.online, texto: 'Online', tono: 'verde' },
        { filtro: 'offline', valor: resumen.offline, texto: 'Offline', tono: 'neutro' },
        { filtro: 'potencia_alta', valor: resumen.potenciaAlta, texto: 'Potencia alta', tono: 'rojo' },
        { filtro: 'potencia_normal', valor: resumen.potenciaNormal, texto: 'Potencia normal', tono: 'azul' },
        ...(resumen.senalBajo > 0 ? [{ filtro: 'senal_bajo' as ClientFilter, valor: resumen.senalBajo, texto: 'Señal bajó', tono: 'ambar' as Tono }] : []),
        { filtro: 'suspendidos', valor: resumen.suspendidos, texto: 'Suspendidos', tono: 'ambar' },
        ...(resumen.radio > 0 ? [{ filtro: 'radio' as ClientFilter, valor: resumen.radio, texto: 'Radioenlace', tono: 'violeta' as Tono }] : []),
        ...(resumen.antenaCaida > 0 ? [{ filtro: 'antena_caida' as ClientFilter, valor: resumen.antenaCaida, texto: 'Antena no responde', tono: 'rojo' as Tono }] : []),
    ];
    const hayFiltros = Boolean(filtroRouter || filtroZona || filtroEstado !== 'todos');
    const SELECTOR = 'h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';

    return (
        <div className="flex flex-col gap-4">
            <EncabezadoPagina
                titulo="Clientes"
                descripcion={loading ? 'Cargando...' : `${clientesFiltrados.length === clientes.length ? clientes.length : `${clientesFiltrados.length} de ${clientes.length}`} clientes · servicios, conexión y cobranza`}
                acciones={(
                    <button aria-label="Nuevo Cliente" onClick={() => setIsCreateOpen(true)} className={BOTON_ACCION_PRIMARIO}>
                        <UserPlusIcon className="h-5 w-5" /> Nuevo cliente
                    </button>
                )}
            />

            {idsRevisar && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm dark:border-orange-500/30 dark:bg-orange-500/10">
                    <p className="font-semibold text-orange-800 dark:text-orange-300">
                        📉 Clientes del aviso de señal ({idsRevisar.size}). Elige a quién mandar técnico con «Reportar falla».
                    </p>
                    <button type="button" onClick={() => setSearchParams({})} className="shrink-0 rounded-xl border border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-800 dark:border-orange-500/40 dark:text-orange-300">
                        Ver todos
                    </button>
                </div>
            )}

            {/* BÚSQUEDA Y FILTROS */}
            <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="search"
                        aria-label="Buscar en clientes"
                        placeholder="Buscar por nombre, contrato, zona o IP..."
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <div className="hidden gap-2 xl:flex">
                    <select aria-label="Nodo" value={filtroRouter} onChange={(e) => setFiltroRouter(e.target.value)} className={SELECTOR}>
                        <option value="">Todos los Nodos</option>
                        {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                    <select aria-label="Zona" value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)} className={SELECTOR}>
                        <option value="">Todas las Zonas</option>
                        {zonasUnicas.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                    <select aria-label="Estado" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as ClientFilter)} className={SELECTOR}>
                        <option value="todos">Todos los Estados</option>
                        {mobileStatusFilters.filter((est) => est !== 'todos').map((est) => <option key={est} value={est}>{NOMBRE_FILTRO[est]}</option>)}
                    </select>
                </div>
                <button
                    type="button"
                    aria-label="Filtrar clientes"
                    onClick={() => setMostrarFiltrosMovil(true)}
                    className={`relative xl:hidden ${BOTON_ICONO} h-11 w-11`}
                >
                    <FunnelIcon className="h-5 w-5" />
                    {hayFiltros && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />}
                </button>
            </div>

            {/* CONTADORES: en celular se deslizan de lado */}
            <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                {contadores.map((c) => {
                    const activo = filtroEstado === c.filtro;
                    return (
                        <button
                            key={c.filtro}
                            type="button"
                            aria-pressed={activo}
                            aria-label={`${c.valor} ${c.texto}`}
                            title={c.filtro === 'potencia_alta' ? 'Señal peor que -27 dBm en la última lectura' : undefined}
                            onClick={() => setFiltroEstado(activo ? 'todos' : c.filtro)}
                            className={`flex min-w-[7.5rem] shrink-0 snap-start flex-col rounded-2xl border px-3.5 py-2.5 text-left transition sm:min-w-[9rem] ${activo
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:border-blue-400 dark:bg-blue-500/10 dark:ring-blue-400'
                                : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'}`}
                        >
                            <span className={`text-xl font-bold tabular-nums ${TEXTO_TONO[c.tono]}`}>{c.valor}</span>
                            <span className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{c.texto}</span>
                        </button>
                    );
                })}
            </div>

            {/* FILTROS (celular y tableta) */}
            <Dialog open={mostrarFiltrosMovil} onClose={() => setMostrarFiltrosMovil(false)} aria-label="Filtros de clientes" className="fixed inset-0 z-[75] xl:hidden">
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm" aria-hidden="true" />
                <div className="fixed inset-x-0 bottom-0 flex justify-center sm:bottom-4">
                    <DialogPanel className="w-full rounded-t-3xl border border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:max-w-lg sm:rounded-3xl">
                        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Filtrar clientes</h3>
                                <p className="text-xs text-slate-500">Estado, nodo y zona</p>
                            </div>
                            <div className="flex gap-2">
                                {hayFiltros && (
                                    <button type="button" onClick={() => { setFiltroEstado('todos'); setFiltroRouter(''); setFiltroZona(''); }} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500">
                                        Quitar
                                    </button>
                                )}
                                <button type="button" onClick={() => setMostrarFiltrosMovil(false)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white active:scale-95">
                                    Listo
                                </button>
                            </div>
                        </div>
                        <span className="mb-2 block text-xs font-semibold text-slate-500">Estado</span>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {mobileStatusFilters.map((est) => (
                                <button
                                    key={est}
                                    type="button"
                                    onClick={() => setFiltroEstado(est)}
                                    className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-semibold transition ${filtroEstado === est ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
                                >
                                    {est === 'todos' ? `Todos (${clientes.length})` : NOMBRE_FILTRO[est]}
                                </button>
                            ))}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                            <label>
                                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Nodo / MikroTik</span>
                                <select value={filtroRouter} onChange={(e) => setFiltroRouter(e.target.value)} className={`${SELECTOR} w-full`}>
                                    <option value="">Todos los nodos</option>
                                    {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                </select>
                            </label>
                            <label>
                                <span className="mb-1.5 block text-xs font-semibold text-slate-500">Zona</span>
                                <select value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)} className={`${SELECTOR} w-full`}>
                                    <option value="">Todas las zonas</option>
                                    {zonasUnicas.map((z) => <option key={z} value={z}>{z}</option>)}
                                </select>
                            </label>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>

            {/* LISTA */}
            {loading ? (
                <div className={`${TARJETA} flex h-72 items-center justify-center`}>
                    <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-500" />
                </div>
            ) : clientesFiltrados.length === 0 ? (
                <div className={TARJETA}>
                    <Vacio icono={MagnifyingGlassIcon} titulo="Ningún cliente coincide" detalle="Cambia la búsqueda o quita los filtros." />
                </div>
            ) : (
                <>
                    {/* Computadora: tabla */}
                    <div className={`${TARJETA} hidden overflow-hidden md:block`}>
                        <table className="w-full border-collapse text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Cliente</th>
                                    <th className="px-4 py-3 font-semibold">Plan / IP</th>
                                    <th className="px-4 py-3 font-semibold">Conexión</th>
                                    <th className="px-4 py-3 text-center font-semibold">Servicio</th>
                                    <th className="px-4 py-3 text-right font-semibold">Finanzas</th>
                                    <th className="w-14 px-4 py-3"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {clientesFiltrados.map((c) => {
                                    const statusData = onlineStatus.get(c.id.toString());
                                    return (
                                        <tr key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className="group cursor-pointer align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5 font-semibold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400"><IconoConexion tipo={c.tipo_conexion} />{c.nombre}</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200" title="Número de contrato">{c.cedula || 'Sin contrato'}</span>
                                                    <span className="inline-flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5" />{c.zona || 'Sin zona'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    {c.servicio.plan_nombre}
                                                    {Number(c.servicio.precio_plan) > 0 && <span className="ml-1.5 text-slate-400">${Number(c.servicio.precio_plan).toLocaleString('es-MX')}</span>}
                                                </div>
                                                <button type="button" onClick={(event) => { event.stopPropagation(); if (c.servicio.ip_asignada) void abrirEquipo(c.servicio.ip_asignada); }} className="mt-1 font-mono text-xs text-blue-600 underline decoration-dotted underline-offset-2 hover:text-blue-500 dark:text-blue-400">{c.servicio.ip_asignada || 'Sin IP'}</button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <ConexionCliente status={statusData} />
                                                {c.tipo_conexion === 'radio' ? <AntenaCliente antena={c.antena} /> : <PotenciaCliente potencia={potencias[c.id.toString()]} cambio={cambiosSenal[c.id.toString()]} />}
                                                {reportes && <ReporteCliente reporte={reportes[c.id.toString()]} potencia={potencias[c.id.toString()]} sugerir={Boolean(idsRevisar)} onReportar={() => setToolModal({ show: true, cliente: c, modo: 'reportar_falla' })} />}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <EstadoServicio estado={c.servicio.estado_servicio} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <FinanzasCliente finanzas={c.finanzas} />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button aria-label={`Herramientas de ${c.nombre}`} onClick={(e) => { e.stopPropagation(); setToolModal({ show: true, cliente: c }); }} className={`${BOTON_ICONO} h-9 w-9`}>
                                                    <WrenchScrewdriverIcon className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Celular: tarjetas */}
                    <div className="flex flex-col gap-3 md:hidden">
                        {clientesFiltrados.map((c) => {
                            const statusData = onlineStatus.get(c.id.toString());
                            const mapHref = getNativeMapHref({
                                latitude: c.latitud,
                                longitude: c.longitud,
                                address: c.direccion,
                                label: c.nombre,
                            });
                            return (
                                <article key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className={`${TARJETA} p-4 transition active:scale-[0.99]`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h3 className="flex items-center gap-1.5 font-semibold leading-tight text-slate-900 dark:text-white"><IconoConexion tipo={c.tipo_conexion} /><span className="truncate">{c.nombre}</span></h3>
                                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                                                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{c.cedula || 'Sin contrato'}</span>
                                                <span className="inline-flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5" />{c.zona || 'Sin zona'}</span>
                                            </div>
                                        </div>
                                        <EstadoServicio estado={c.servicio.estado_servicio} />
                                    </div>

                                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                                        <div className="min-w-0">
                                            <dt className="text-slate-400">Plan</dt>
                                            <dd className="mt-0.5 truncate font-semibold text-slate-800 dark:text-slate-200">{c.servicio.plan_nombre}</dd>
                                        </div>
                                        <div className="min-w-0 text-right">
                                            <dt className="text-slate-400">IP</dt>
                                            <dd><button type="button" onClick={(event) => { event.stopPropagation(); if (c.servicio.ip_asignada) void abrirEquipo(c.servicio.ip_asignada); }} className="mt-0.5 font-mono font-semibold text-blue-600 underline decoration-dotted underline-offset-2 dark:text-blue-400">{c.servicio.ip_asignada || 'Sin IP'}</button></dd>
                                        </div>
                                        <div className="min-w-0">
                                            <dt className="text-slate-400">Conexión</dt>
                                            <dd className="mt-0.5">
                                                <ConexionCliente status={statusData} />
                                                {c.tipo_conexion === 'radio' ? <AntenaCliente antena={c.antena} /> : <PotenciaCliente potencia={potencias[c.id.toString()]} cambio={cambiosSenal[c.id.toString()]} />}
                                                {reportes && <ReporteCliente reporte={reportes[c.id.toString()]} potencia={potencias[c.id.toString()]} sugerir={Boolean(idsRevisar)} onReportar={() => setToolModal({ show: true, cliente: c, modo: 'reportar_falla' })} />}
                                            </dd>
                                        </div>
                                        <div className="min-w-0 text-right">
                                            <dt className="text-slate-400">Finanzas</dt>
                                            <dd className="mt-0.5"><FinanzasCliente finanzas={c.finanzas} /></dd>
                                        </div>
                                    </dl>

                                    <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                                        <button aria-label={`Herramientas de ${c.nombre}`} onClick={(e) => { e.stopPropagation(); setToolModal({ show: true, cliente: c }); }} className={`${BOTON_SECUNDARIO} h-11`}>
                                            <WrenchScrewdriverIcon className="h-4 w-4 text-blue-500" /> Herramientas
                                        </button>
                                        {c.telefono && (
                                            <a aria-label={`Llamar a ${c.nombre}`} href={`tel:${c.telefono}`} onClick={(e) => e.stopPropagation()} className={`${BOTON_ICONO} h-11 w-11 text-emerald-600 dark:text-emerald-400`}>
                                                <PhoneIcon className="h-5 w-5" />
                                            </a>
                                        )}
                                        {mapHref ? (
                                            <a aria-label={`Abrir ubicación de ${c.nombre}`} href={mapHref} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`${BOTON_ICONO} h-11 w-11 text-blue-600 dark:text-blue-400`}>
                                                <MapPinIcon className="h-5 w-5" />
                                            </a>
                                        ) : (
                                            <button aria-label="Ver detalle" className={`${BOTON_ICONO} h-11 w-11`}>
                                                <ChevronRightIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </>
            )}

            <ClientToolsModal
                isOpen={toolModal.show}
                onClose={() => setToolModal({ show: false, cliente: null })}
                cliente={toolModal.cliente}
                modoInicial={toolModal.modo}
                onActionSuccess={fetchData}
            />
            <ClientDetailModal isOpen={detailModal.show} onClose={() => setDetailModal({ show: false, cliente: null })} cliente={detailModal.cliente} onEditSuccess={fetchData} />
            <CreateClientModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={fetchData} routers={routers} />
        </div>
    );
}

const NOMBRE_FILTRO: Record<ClientFilter, string> = {
    todos: 'Todos',
    online: 'En línea',
    offline: 'Sin conexión',
    potencia_alta: 'Potencia alta',
    potencia_normal: 'Potencia normal',
    senal_bajo: 'Señal bajó',
    suspendidos: 'Suspendidos',
    activos: 'Activos',
    morosos: 'Con deuda',
    radio: 'Radioenlace',
    fibra: 'Fibra óptica',
    antena_caida: 'Antena no responde',
};

function ConexionCliente({ status }: { status?: OnlineStatus }) {
    if (!status) return <span className="text-xs text-slate-400">Revisando…</span>;
    return (
        <div className="min-w-0" title={status.diag}>
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${status.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                <span className={`h-2 w-2 rounded-full ${status.online ? 'animate-pulse bg-emerald-500' : 'bg-rose-500'}`} />
                {status.online ? 'En línea' : 'Sin conexión'}
            </span>
            {!status.online && status.diag && <div className="mt-0.5 max-w-[11rem] truncate text-xs text-slate-400">{status.diag}</div>}
        </div>
    );
}

function EstadoServicio({ estado }: { estado: string }) {
    const texto = estado.replace(/_/g, ' ');
    return <Pildora tono={estado === 'activo' ? 'verde' : 'rojo'} punto>{texto.charAt(0).toUpperCase() + texto.slice(1)}</Pildora>;
}

function FinanzasCliente({ finanzas }: { finanzas: ClienteUnificado['finanzas'] }) {
    const deuda = Number(finanzas.total_deuda) || 0;
    const aFavor = Number(finanzas.saldo_a_favor) || 0;
    if (deuda <= 0) {
        return (
            <div>
                <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Al día</div>
                {aFavor > 0 && <div className="text-xs text-emerald-600/80">A favor ${aFavor.toLocaleString('es-MX')}</div>}
            </div>
        );
    }
    const facturas = finanzas.facturas_pendientes_cant;
    return (
        <div>
            <div className="text-sm font-semibold text-rose-600 dark:text-rose-400">Debe ${deuda.toLocaleString('es-MX')}</div>
            {facturas > 0 && <div className="text-xs text-slate-400">{facturas} factura{facturas === 1 ? '' : 's'}</div>}
        </div>
    );
}
