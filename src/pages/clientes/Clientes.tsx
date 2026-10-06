import { useState, useEffect, useMemo, useCallback } from 'react';
import client from '@/api/axios';
import { toast } from 'react-hot-toast';
import {
    MagnifyingGlassIcon, WrenchScrewdriverIcon, ArrowPathIcon, FunnelIcon, UserPlusIcon,
    PhoneIcon, MapPinIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';

import ClientToolsModal from './components/ClientToolsModal';
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

type ClientFilter = 'todos' | 'online' | 'offline' | 'potencia_alta' | 'potencia_normal' | 'suspendidos' | 'activos' | 'morosos';

/** Última potencia óptica leída de la OLT (se lee cada hora). */
interface Potencia { rx: number; nivel: 'alta' | 'normal'; fecha: string | null }

/** "Potencia alta": la señal ya pasó de -27 dBm y la conexión empieza a fallar. */
function PotenciaCliente({ potencia }: { potencia?: Potencia }) {
    if (!potencia) return null;
    return (
        <span
            title={potencia.nivel === 'alta' ? 'Potencia alta: peor que -27 dBm' : 'Potencia normal'}
            className={`mt-1 inline-block rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black ${potencia.nivel === 'alta'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}
        >
            {potencia.rx.toFixed(2)} dBm
        </span>
    );
}

interface ClientModalState {
    show: boolean;
    cliente: ClienteUnificado | null;
}

const mobileStatusFilters: ClientFilter[] = ['todos', 'online', 'offline', 'potencia_alta', 'potencia_normal', 'suspendidos', 'morosos'];

export default function Clientes() {
    const [clientes, setClientes] = useState<ClienteUnificado[]>([]);
    const [onlineStatus, setOnlineStatus] = useState<Map<string, OnlineStatus>>(new Map());
    const [potencias, setPotencias] = useState<Record<string, Potencia>>({});
    const [routers, setRouters] = useState<RouterSummary[]>([]);
    const [noLeidos, setNoLeidos] = useState<Record<string, { count: number }>>({});
    const [loading, setLoading] = useState(true);

    const [mostrarBusquedaMovil, setMostrarBusquedaMovil] = useState(false);
    const [mostrarFiltrosMovil, setMostrarFiltrosMovil] = useState(false);

    const [busqueda, setBusqueda] = useState('');
    const [filtroRouter, setFiltroRouter] = useState('');
    const [filtroZona, setFiltroZona] = useState(''); // 🔥 NUEVO ESTADO PARA ZONAS
    // 🔥 Agregado 'offline' a las opciones permitidas
    const [filtroEstado, setFiltroEstado] = useState<ClientFilter>('todos');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [toolModal, setToolModal] = useState<ClientModalState>({ show: false, cliente: null });
    const [detailModal, setDetailModal] = useState<ClientModalState>({ show: false, cliente: null });
    const abrirIpHttp = (ip: string) => {
        const destino = `http://${ip.trim().replace(/^https?:\/\//i, '')}`;
        window.open(destino, '_blank', 'noopener,noreferrer');
    };

    const fetchData = useCallback(async () => {
        try {
            const [resClientes, resRouters] = await Promise.all([
                client.get<ClienteUnificado[]>('/clientes/listado-completo-unificado'),
                client.get<RouterSummary[]>('/network/routers/')
            ]);
            setClientes(resClientes.data);
            setRouters(resRouters.data);

            try {
                const resOnline = await client.get<DashboardStatusResponse>('/dashboard/status-tabla-clientes');
                const detalleClientes = resOnline.data.detalle_clientes;

                if (detalleClientes) {
                    const mapaEstados = new Map<string, OnlineStatus>();
                    Object.entries(detalleClientes).forEach(([clienteId, item]) => {
                        mapaEstados.set(clienteId, {
                            color: item.color,
                            diag: item.diagnostico_sistema,
                            online: item.estado_tecnico === 'ONLINE'
                        });
                    });
                    setOnlineStatus(mapaEstados);
                }
            } catch (err) { console.warn("Dashboard online no disponible", err); }

            try {
                const resPotencias = await client.get<Record<string, Potencia>>('/ftth/potencias');
                setPotencias(resPotencias.data);
            } catch { console.warn("Potencias no disponibles"); }

            try {
                const resMsg = await client.get<Record<string, { count: number }>>('/whatsapp/no-leidos');
                setNoLeidos(resMsg.data);
            } catch { console.warn("Chat no disponible"); }

            setLoading(false);
        } catch {
            toast.error("Error al cargar datos");
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

            return true;
        });
    }, [clientes, busqueda, filtroRouter, filtroZona, filtroEstado, onlineStatus, potencias, routers]);

    // Extraemos las zonas únicas dinámicamente de tus clientes
    const zonasUnicas = Array.from(new Set(clientes.map(c => c.zona).filter((zona): zona is string => Boolean(zona))));
    const resumen = useMemo(() => ({
        total: clientes.length,
        online: clientes.filter(c => onlineStatus.get(c.id.toString())?.online === true).length,
        offline: clientes.filter(c => onlineStatus.get(c.id.toString())?.online === false).length,
        potenciaAlta: clientes.filter(c => potencias[c.id.toString()]?.nivel === 'alta').length,
        potenciaNormal: clientes.filter(c => potencias[c.id.toString()]?.nivel === 'normal').length,
        suspendidos: clientes.filter(c => c.servicio.estado_servicio !== 'activo').length,
        morosos: clientes.filter(c => c.finanzas.total_deuda > 0).length,
    }), [clientes, onlineStatus, potencias]);

    // Contadores de arriba: tocar uno filtra la lista; tocarlo otra vez la muestra completa.
    const contadores: { filtro: ClientFilter; valor: number; texto: string; color: string; activo: string }[] = [
        { filtro: 'online', valor: resumen.online, texto: 'Online', color: 'text-emerald-600 dark:text-emerald-400', activo: 'border-emerald-500 bg-emerald-500/10' },
        { filtro: 'offline', valor: resumen.offline, texto: 'Offline', color: 'text-slate-700 dark:text-slate-200', activo: 'border-slate-500 bg-slate-500/10' },
        { filtro: 'potencia_alta', valor: resumen.potenciaAlta, texto: 'Potencia alta', color: 'text-rose-600 dark:text-rose-400', activo: 'border-rose-500 bg-rose-500/10' },
        { filtro: 'potencia_normal', valor: resumen.potenciaNormal, texto: 'Potencia normal', color: 'text-sky-600 dark:text-sky-400', activo: 'border-sky-500 bg-sky-500/10' },
        { filtro: 'suspendidos', valor: resumen.suspendidos, texto: 'Suspendidos', color: 'text-amber-600 dark:text-amber-400', activo: 'border-amber-500 bg-amber-500/10' },
    ];

    return (
        <div className="flex min-h-0 flex-col gap-4 font-sans text-slate-700 dark:text-slate-200 lg:h-[calc(100vh-9rem)] lg:gap-6">

            {/* =========================================================
                HEADER Y ACCIONES DE FILTRADO COMPACTO
               ========================================================= */}
            <div className="flex-none space-y-3">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="mb-1 hidden text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 sm:block">Directorio</p>
                        <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            Gestión de Clientes
                            <span className="text-xs bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold sm:inline hidden">
                                {clientesFiltrados.length}
                            </span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">Servicios, conectividad y cobranza</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            aria-label="Buscar en clientes"
                            onClick={() => { setMostrarBusquedaMovil(!mostrarBusquedaMovil); setMostrarFiltrosMovil(false); }}
                            className={`xl:hidden p-2 rounded-xl border transition-all ${mostrarBusquedaMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                        >
                            <MagnifyingGlassIcon className="w-4 h-4" />
                        </button>

                        <button
                            aria-label="Filtrar clientes"
                            onClick={() => { setMostrarFiltrosMovil(!mostrarFiltrosMovil); setMostrarBusquedaMovil(false); }}
                            className={`xl:hidden p-2 rounded-xl border transition-all flex items-center gap-1 ${mostrarFiltrosMovil ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'}`}
                        >
                            <FunnelIcon className="w-4 h-4" />
                            {(filtroRouter || filtroZona || filtroEstado !== 'todos') && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            )}
                        </button>

                        <button aria-label="Nuevo Cliente" onClick={() => setIsCreateOpen(true)} className="flex min-h-11 items-center gap-2 rounded-2xl bg-blue-600 px-3 text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 active:scale-95 md:px-4">
                            <UserPlusIcon className="w-5 h-5" /> <span className="hidden text-sm font-black sm:inline">Nuevo cliente</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {contadores.map((c) => (
                        <button
                            key={c.filtro}
                            type="button"
                            aria-pressed={filtroEstado === c.filtro}
                            title={c.filtro === 'potencia_alta' ? 'Señal peor que -27 dBm en la última lectura' : undefined}
                            onClick={() => setFiltroEstado(filtroEstado === c.filtro ? 'todos' : c.filtro)}
                            className={`rounded-2xl border p-3 text-left transition-colors ${filtroEstado === c.filtro ? c.activo : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}
                        >
                            <span className={`block text-lg font-black md:text-2xl ${c.color}`}>{c.valor}</span>
                            <span className="block text-[9px] font-black uppercase leading-tight tracking-wider text-slate-400 md:text-[10px]">{c.texto}</span>
                        </button>
                    ))}
                </div>

                {/* 🖥️ FILTROS ESCRITORIO */}
                <div className="hidden xl:flex gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-md dark:shadow-lg overflow-x-auto">
                    <div className="relative min-w-[250px] flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input
                            type="text" placeholder="Buscar por nombre, contrato, zona o IP..."
                            className="w-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-blue-500 outline-none text-sm font-medium transition-colors"
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-3 shrink-0">
                        <select value={filtroRouter} onChange={(e) => setFiltroRouter(e.target.value)} className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm font-bold cursor-pointer">
                            <option value="">Todos los Nodos</option>
                            {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                        </select>

                        {/* 🔥 SELECT DE ZONAS ESCRITORIO 🔥 */}
                        <select value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)} className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm font-bold cursor-pointer">
                            <option value="">Todas las Zonas</option>
                            {zonasUnicas.map((z) => <option key={z} value={z}>{z}</option>)}
                        </select>

                        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as ClientFilter)} className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 outline-none font-black text-sm cursor-pointer">
                            <option value="todos">Todos los Estados</option>
                            <option value="online">🟢 Online</option>
                            <option value="offline">🔴 Offline</option>
                            <option value="potencia_alta">📉 Potencia alta</option>
                            <option value="potencia_normal">📶 Potencia normal</option>
                            <option value="suspendidos">⛔ Suspendidos</option>
                            <option value="morosos">💰 Con Deuda</option>
                        </select>
                    </div>
                </div>

                {/* 📱 DESPLEGABLE MÓVIL A (Búsqueda) */}
                {mostrarBusquedaMovil && (
                    <div className="xl:hidden relative bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-md">
                        <MagnifyingGlassIcon className="absolute left-5 top-4 w-4 h-4 text-slate-400" />
                        <input
                            type="text" placeholder="Nombre, contrato, zona o IP..." autoFocus
                            className="w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-200 pl-10 pr-10 py-2 rounded-lg border border-slate-200 dark:border-slate-800 focus:border-blue-500 outline-none text-xs font-medium"
                            value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                        />
                        {busqueda && (
                            <button onClick={() => setBusqueda('')} className="absolute right-5 top-3.5 text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold">Limpiar</button>
                        )}
                    </div>
                )}

                {/* 📱 DESPLEGABLE MÓVIL B (Filtros) */}
                {mostrarFiltrosMovil && (
                    <div className="fixed inset-0 z-[75] flex items-end bg-slate-950/55 backdrop-blur-sm xl:hidden" onClick={() => setMostrarFiltrosMovil(false)}>
                        <div role="dialog" aria-modal="true" aria-label="Filtros de clientes" onClick={(event) => event.stopPropagation()} className="w-full animate-in rounded-t-[2rem] border border-slate-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl slide-in-from-bottom-8 dark:border-slate-800 dark:bg-slate-900 sm:mx-auto sm:mb-4 sm:max-w-lg sm:rounded-[2rem]">
                            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
                            <div className="mb-5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Filtrar clientes</h3>
                                    <p className="text-xs text-slate-500">Estado, nodo y zona</p>
                                </div>
                                <button type="button" onClick={() => setMostrarFiltrosMovil(false)} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white active:scale-95">
                                    Listo
                                </button>
                            </div>

                            <div>
                                <span className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Estado técnico</span>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {mobileStatusFilters.map((est) => (
                                        <button
                                            key={est} onClick={() => setFiltroEstado(est)}
                                            className={`min-h-11 rounded-xl border px-3 py-2 text-xs font-black transition-all ${filtroEstado === est ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'}`}
                                        >
                                            {est === 'todos' && `Todos (${clientes.length})`}
                                            {est === 'online' && 'En línea'}
                                            {est === 'offline' && 'Sin conexión'}
                                            {est === 'potencia_alta' && 'Potencia alta'}
                                            {est === 'potencia_normal' && 'Potencia normal'}
                                            {est === 'suspendidos' && 'Suspendidos'}
                                            {est === 'morosos' && 'Con deuda'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                                <label>
                                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Nodo / MikroTik</span>
                                    <select
                                        value={filtroRouter} onChange={(e) => setFiltroRouter(e.target.value)}
                                        className="app-field truncate py-2 text-xs font-extrabold"
                                    >
                                        <option value="">Todos los nodos</option>
                                        {routers.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                                    </select>
                                </label>
                                <label>
                                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Zona</span>
                                    <select
                                        value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)}
                                        className="app-field truncate py-2 text-xs font-extrabold"
                                    >
                                        <option value="">Todas las zonas</option>
                                        {zonasUnicas.map((z) => <option key={z} value={z}>{z}</option>)}
                                    </select>
                                </label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================================
                ZONA DE DATOS PRINCIPALES
               ========================================================= */}
            <div className="app-card flex min-h-[28rem] flex-1 flex-col overflow-hidden transition-colors duration-300">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1 custom-scrollbar">

                        {/* 🖥️ VISTA ESCRITORIO: filas de dos líneas */}
                        <table className="hidden w-full border-collapse text-left text-xs md:table">
                            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 font-black uppercase tracking-wider text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                                <tr>
                                    <th className="px-5 py-3">Cliente</th>
                                    <th className="px-5 py-3">Plan / IP</th>
                                    <th className="px-5 py-3">Conexión</th>
                                    <th className="px-5 py-3 text-center">Servicio</th>
                                    <th className="px-5 py-3 text-right">Finanzas</th>
                                    <th className="w-16 px-5 py-3 text-center"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {clientesFiltrados.map((c) => {
                                    const statusData = onlineStatus.get(c.id.toString());
                                    const unreadCount = noLeidos[c.id]?.count || 0;
                                    return (
                                        <tr key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className="group cursor-pointer bg-transparent align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                            <td className="px-5 py-3">
                                                <div className="text-sm font-black text-slate-800 transition-colors group-hover:text-blue-500 dark:text-white">{c.nombre}</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-200" title="Número de contrato">{c.cedula || 'Sin contrato'}</span>
                                                    <span className="inline-flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5" />{c.zona || 'Sin zona'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                                                    {c.servicio.plan_nombre}
                                                    {Number(c.servicio.precio_plan) > 0 && <span className="ml-1.5 font-bold text-slate-400">${Number(c.servicio.precio_plan).toLocaleString('es-MX')}</span>}
                                                </div>
                                                <button type="button" onClick={(event) => { event.stopPropagation(); if (c.servicio.ip_asignada) abrirIpHttp(c.servicio.ip_asignada); }} className="mt-1 font-mono text-[11px] font-bold text-slate-500 underline decoration-dotted underline-offset-2 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400">{c.servicio.ip_asignada || 'Sin IP'}</button>
                                            </td>
                                            <td className="px-5 py-3">
                                                <ConexionCliente status={statusData} />
                                                <PotenciaCliente potencia={potencias[c.id.toString()]} />
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <EstadoServicio estado={c.servicio.estado_servicio} />
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <FinanzasCliente finanzas={c.finanzas} />
                                            </td>
                                            <td className="px-5 py-3 text-center">
                                                <button aria-label={`Herramientas de ${c.nombre}`} onClick={(e) => { e.stopPropagation(); setToolModal({ show: true, cliente: c }); }} className="relative rounded-xl border border-slate-200 bg-slate-100 p-1.5 text-slate-400 transition hover:text-slate-900 active:scale-90 dark:border-slate-700 dark:bg-slate-800 dark:hover:text-white">
                                                    <WrenchScrewdriverIcon className="h-4 w-4" />
                                                    {unreadCount > 0 && (
                                                        <span className="absolute -right-1 -top-1 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-800">
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* 📱 VISTA MÓVIL */}
                        <div className="flex flex-col gap-3 p-1 pb-4 md:hidden">
                            {clientesFiltrados.map((c) => {
                                const statusData = onlineStatus.get(c.id.toString());
                                const unreadCount = noLeidos[c.id]?.count || 0;
                                const mapHref = getNativeMapHref({
                                    latitude: c.latitud,
                                    longitude: c.longitud,
                                    address: c.direccion,
                                    label: c.nombre,
                                });
                                return (
                                    <article key={c.id} onClick={() => setDetailModal({ show: true, cliente: c })} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm transition-all active:scale-[0.985] dark:border-slate-800 dark:bg-slate-900">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-black leading-tight text-slate-800 dark:text-white">{c.nombre}</h3>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-200">{c.cedula || 'Sin contrato'}</span>
                                                    <span className="inline-flex items-center gap-1"><MapPinIcon className="h-3.5 w-3.5" />{c.zona || 'Sin zona'}</span>
                                                </div>
                                            </div>
                                            <EstadoServicio estado={c.servicio.estado_servicio} />
                                        </div>

                                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-[11px] dark:border-slate-800 dark:bg-slate-950/50">
                                            <div className="min-w-0">
                                                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Plan</span>
                                                <p className="mt-0.5 truncate font-extrabold text-blue-600 dark:text-blue-400">{c.servicio.plan_nombre}</p>
                                            </div>
                                            <div className="min-w-0 text-right">
                                                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">IP</span>
                                                <button type="button" onClick={(event) => { event.stopPropagation(); if (c.servicio.ip_asignada) abrirIpHttp(c.servicio.ip_asignada); }} className="mt-0.5 font-mono font-bold text-slate-600 underline decoration-dotted underline-offset-2 dark:text-slate-300">{c.servicio.ip_asignada || 'Sin IP'}</button>
                                            </div>
                                            <div className="min-w-0">
                                                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Conexión</span>
                                                <div className="mt-0.5"><ConexionCliente status={statusData} /></div>
                                                <PotenciaCliente potencia={potencias[c.id.toString()]} />
                                            </div>
                                            <div className="min-w-0 text-right">
                                                <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Finanzas</span>
                                                <div className="mt-0.5"><FinanzasCliente finanzas={c.finanzas} /></div>
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2">
                                            <button aria-label={`Herramientas de ${c.nombre}`} onClick={(e) => { e.stopPropagation(); setToolModal({ show: true, cliente: c }); }} className="relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 shadow-sm active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                <WrenchScrewdriverIcon className="h-4 w-4 text-blue-500" /> Herramientas
                                                {unreadCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] text-white">{unreadCount}</span>}
                                            </button>
                                            {c.telefono && (
                                                <a aria-label={`Llamar a ${c.nombre}`} href={`tel:${c.telefono}`} onClick={(e) => e.stopPropagation()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 active:scale-95 dark:text-emerald-400">
                                                    <PhoneIcon className="h-5 w-5" />
                                                </a>
                                            )}
                                            {mapHref ? (
                                                <a aria-label={`Abrir ubicación de ${c.nombre}`} href={mapHref} onClick={(e) => e.stopPropagation()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 active:scale-95 dark:text-blue-400">
                                                    <MapPinIcon className="h-5 w-5" />
                                                </a>
                                            ) : (
                                                <button aria-label="Ver detalle" className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800">
                                                    <ChevronRightIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* =========================================================
                MODALES MODULARES
               ========================================================= */}
            <ClientToolsModal
                isOpen={toolModal.show}
                onClose={() => setToolModal({ show: false, cliente: null })}
                cliente={toolModal.cliente}
                unreadCount={toolModal.cliente ? noLeidos[toolModal.cliente.id]?.count : 0}
                onActionSuccess={fetchData}
            />
            <ClientDetailModal isOpen={detailModal.show} onClose={() => setDetailModal({ show: false, cliente: null })} cliente={detailModal.cliente} onEditSuccess={fetchData} />
            <CreateClientModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSuccess={fetchData} routers={routers} />
        </div>
    );
}

function ConexionCliente({ status }: { status?: OnlineStatus }) {
    if (!status) return <span className="text-[11px] font-bold text-slate-400">Revisando…</span>;
    return (
        <div className="min-w-0" title={status.diag}>
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-black ${status.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                <span className={`h-2 w-2 rounded-full ${status.online ? 'animate-pulse bg-emerald-500' : 'bg-rose-500'}`} />
                {status.online ? 'En línea' : 'Sin conexión'}
            </span>
            {!status.online && status.diag && <div className="mt-0.5 max-w-[11rem] truncate text-[10px] font-medium text-slate-400">{status.diag}</div>}
        </div>
    );
}

function EstadoServicio({ estado }: { estado: string }) {
    const activo = estado === 'activo';
    return (
        <span className={`inline-block shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-black uppercase ${activo ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' : 'border-rose-500/20 bg-rose-500/5 text-rose-500'}`}>
            {estado.replace(/_/g, ' ')}
        </span>
    );
}

function FinanzasCliente({ finanzas }: { finanzas: ClienteUnificado['finanzas'] }) {
    const deuda = Number(finanzas.total_deuda) || 0;
    const aFavor = Number(finanzas.saldo_a_favor) || 0;
    if (deuda <= 0) {
        return (
            <div>
                <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">Al día</div>
                {aFavor > 0 && <div className="text-[10px] font-bold text-emerald-600/80">A favor ${aFavor.toLocaleString('es-MX')}</div>}
            </div>
        );
    }
    const facturas = finanzas.facturas_pendientes_cant;
    return (
        <div>
            <div className="text-sm font-black text-rose-500">Debe ${deuda.toLocaleString('es-MX')}</div>
            {facturas > 0 && <div className="text-[10px] font-bold text-slate-400">{facturas} factura{facturas === 1 ? '' : 's'}</div>}
        </div>
    );
}
