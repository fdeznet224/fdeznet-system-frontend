import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
    ArrowPathIcon, ArrowTopRightOnSquareIcon, ArrowsRightLeftIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon,
    PencilSquareIcon, ServerStackIcon, SignalIcon, Squares2X2Icon, WifiIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

import { abrirEquipoRed } from '@/utils/accesoRemoto';
import type { Arbol, ClienteRadio, EquipoRed, RouterArbol } from './tipos';

const ANCHO = 210;
const ALTO = 92;
const SEPARACION_X = 28;
const SEPARACION_Y = 70;

interface Nodo {
    clave: string;
    tipo: 'equipo' | 'router';
    titulo: string;
    detalle: string;
    responde: boolean | null;
    senal: number | null;
    clientes: ClienteRadio[];
    equipo?: EquipoRed;
    /** Enlace PtP: la otra punta (se dibuja como una sola caja). */
    pareja?: EquipoRed;
    router?: RouterArbol;
    hijos: Nodo[];
}

interface Colocado { nodo: Nodo; x: number; y: number }

const sinPunta = (nombre: string) => nombre.replace(/\s*\((salida|llegada|nodo principal|nodo|base|estación|estacion)\)\s*$/i, '').trim();
const ultimo = (ip: string) => `.${ip.split('.').pop()}`;

function ambos(a: boolean | null, b: boolean | null): boolean | null {
    if (a === false || b === false) return false;
    return a == null || b == null ? null : true;
}

function deEquipo(equipo: EquipoRed): Nodo {
    // Un PtP base con su única estación: una sola caja "enlace" con las dos puntas.
    const estacion = equipo.tipo === 'ptp_base' && equipo.hijos.length === 1 && equipo.hijos[0].tipo === 'ptp_estacion' && !equipo.router
        ? equipo.hijos[0] : null;
    if (estacion) {
        const hijos = estacion.hijos.map(deEquipo);
        if (estacion.router) hijos.push(deRouter(estacion.router));
        const latencia = estacion.latencia_ms ?? equipo.latencia_ms;
        return {
            clave: `e${equipo.id}`,
            tipo: 'equipo',
            titulo: sinPunta(equipo.nombre),
            detalle: [`${ultimo(equipo.ip)} ⇄ ${ultimo(estacion.ip)}`, latencia != null ? `${latencia} ms` : null].filter(Boolean).join(' · '),
            responde: ambos(equipo.responde, estacion.responde),
            senal: estacion.senal ?? equipo.senal,
            clientes: [...equipo.clientes, ...estacion.clientes],
            equipo,
            pareja: estacion,
            hijos,
        };
    }
    const hijos = equipo.hijos.map(deEquipo);
    if (equipo.router) hijos.push(deRouter(equipo.router));
    return {
        clave: `e${equipo.id}`,
        tipo: 'equipo',
        titulo: equipo.nombre,
        detalle: [equipo.ip, equipo.latencia_ms != null ? `${equipo.latencia_ms} ms` : equipo.responde === false ? 'no responde' : null].filter(Boolean).join(' · '),
        responde: equipo.responde,
        senal: equipo.senal,
        clientes: equipo.clientes,
        equipo,
        hijos,
    };
}

function deRouter(router: RouterArbol): Nodo {
    return {
        clave: `r${router.id ?? 'x'}`,
        tipo: 'router',
        titulo: router.nombre,
        detalle: router.ip ? `MikroTik · ${router.ip}` : 'Sin MikroTik',
        responde: router.en_linea,
        senal: null,
        clientes: router.clientes_sin_ap,
        router,
        hijos: router.equipos.map(deEquipo),
    };
}

/** Árbol de arriba hacia abajo: cada hoja ocupa una columna y el padre va centrado sobre sus hijos. */
function acomodar(raices: Nodo[]): { colocados: Colocado[]; lineas: [Colocado, Colocado][]; ancho: number; alto: number } {
    const colocados: Colocado[] = [];
    const lineas: [Colocado, Colocado][] = [];
    let columna = 0;
    let profundidad = 0;
    const colocar = (nodo: Nodo, nivel: number): Colocado => {
        profundidad = Math.max(profundidad, nivel);
        let x: number;
        const hijos = nodo.hijos.map((h) => colocar(h, nivel + 1));
        if (hijos.length) {
            x = (hijos[0].x + hijos[hijos.length - 1].x) / 2;
        } else {
            x = columna * (ANCHO + SEPARACION_X);
            columna += 1;
        }
        const propio = { nodo, x, y: nivel * (ALTO + SEPARACION_Y) };
        colocados.push(propio);
        hijos.forEach((h) => lineas.push([propio, h]));
        return propio;
    };
    raices.forEach((r) => colocar(r, 0));
    return {
        colocados,
        lineas,
        ancho: Math.max(columna, 1) * (ANCHO + SEPARACION_X) - SEPARACION_X,
        alto: (profundidad + 1) * (ALTO + SEPARACION_Y) - SEPARACION_Y,
    };
}

const COLOR_LINEA = (responde: boolean | null) => (responde == null ? '#cbd5e1' : responde ? '#10b981' : '#f43f5e');

const ICONOS: Record<string, ComponentType<{ className?: string }>> = {
    router: ServerStackIcon, ap: WifiIcon, ptp_base: ArrowsRightLeftIcon, ptp_estacion: ArrowsRightLeftIcon, switch: Squares2X2Icon,
};

function IconoNodo({ nodo }: { nodo: Nodo }) {
    const clase = `h-5 w-5 shrink-0 ${nodo.tipo === 'router' ? 'text-blue-600' : 'text-slate-500'}`;
    const tipo = nodo.tipo === 'router' ? 'router' : nodo.equipo?.tipo ?? '';
    const Icono = ICONOS[tipo] ?? SignalIcon;
    return <Icono className={clase} />;
}

function colorSenal(valor: number) {
    return valor >= -65 ? 'text-emerald-600 dark:text-emerald-400' : valor >= -75 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
}

function Caja({ nodo, seleccionado, onClick }: { nodo: Nodo; seleccionado: boolean; onClick: () => void }) {
    const borde = nodo.responde == null ? 'border-slate-300 dark:border-slate-600' : nodo.responde ? 'border-emerald-400' : 'border-rose-500';
    const fondo = nodo.tipo === 'router' ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-white dark:bg-slate-900';
    const caidos = nodo.clientes.filter((c) => c.responde === false).length;
    return (
        <button type="button" onClick={onClick} data-testid={`mapa-${nodo.clave}`}
            className={`flex h-full w-full flex-col justify-between rounded-2xl border-2 ${borde} ${fondo} p-2.5 text-left shadow-sm transition hover:shadow-md ${seleccionado ? 'ring-4 ring-blue-500/30' : ''}`}>
            <span className="flex items-center gap-2">
                <IconoNodo nodo={nodo} />
                <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-bold leading-tight text-slate-900 dark:text-white" title={nodo.titulo}>{nodo.titulo}</span>
            </span>
            <span className="truncate text-[11px] text-slate-500">{nodo.detalle}</span>
            <span className="flex items-center gap-2 text-[11px]">
                {nodo.senal != null && <span className={`font-mono font-semibold ${colorSenal(nodo.senal)}`}>{nodo.senal} dBm</span>}
                {nodo.equipo?.estaciones != null && <span className="text-slate-500">{nodo.equipo.estaciones} est.</span>}
                {nodo.clientes.length > 0 && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {nodo.clientes.length} cliente{nodo.clientes.length === 1 ? '' : 's'}{caidos ? <span className="text-rose-600"> · {caidos}✕</span> : null}
                    </span>
                )}
            </span>
        </button>
    );
}

function Panel({ nodo, onCerrar, onEditar, onRevisar, revisando }: {
    nodo: Nodo;
    onCerrar: () => void;
    onEditar: (equipo: EquipoRed) => void;
    onRevisar: (equipo: EquipoRed) => void;
    revisando: number | null;
}) {
    const e = nodo.equipo;
    const filas: [string, string | null][] = e ? [
        ['Tipo', `${e.tipo_nombre}${e.modelo ? ` · ${e.modelo}` : ''}`],
        ['IP', e.ip],
        ['Ping', e.responde == null ? 'Sin revisar' : e.responde ? `${e.latencia_ms} ms${e.perdida ? ` · ${e.perdida}% pérdida` : ''}` : 'No responde'],
        ['Frecuencia', e.frecuencia ? `${e.frecuencia}${e.ancho_canal ? ` · ${e.ancho_canal} MHz` : ''}` : null],
        ['SSID', e.ssid],
        ['Ruido', e.ruido != null ? `${e.ruido} dBm` : null],
        ['CCQ', e.ccq != null ? `${e.ccq}%` : null],
        ['Capacidad', e.capacidad_tx != null ? `${Math.round(e.capacidad_tx / 1000)} / ${e.capacidad_rx != null ? Math.round(e.capacidad_rx / 1000) : '-'} Mbps` : null],
        ['Estaciones', e.estaciones != null ? String(e.estaciones) : null],
        ['Firmware', e.firmware],
    ] : [['MikroTik', nodo.router?.ip ?? null], ['Estado', nodo.responde ? 'En línea' : 'Sin respuesta']];
    return (
        <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:top-24 sm:bottom-4 sm:w-96 sm:rounded-3xl dark:bg-slate-900" data-testid="mapa-panel">
            <div className="mb-3 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-bold text-slate-900 dark:text-white">{nodo.titulo}</h3>
                    {e?.airos_error && <p className="text-xs text-amber-600">{e.airos_error}</p>}
                </div>
                <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {filas.filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-800 dark:text-slate-100">{v}</dd></div>
                ))}
            </dl>
            {nodo.pareja && (
                <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-sm dark:bg-slate-800/60" data-testid="mapa-pareja">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{nodo.pareja.nombre}</p>
                    <p className="text-xs text-slate-500">
                        {nodo.pareja.ip} · {nodo.pareja.responde == null ? 'sin revisar' : nodo.pareja.responde ? `${nodo.pareja.latencia_ms} ms` : 'no responde'}
                        {nodo.pareja.senal != null ? ` · ${nodo.pareja.senal} dBm` : ''}
                    </p>
                    <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => onRevisar(nodo.pareja!)} className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-black/5 dark:bg-slate-900">Revisar</button>
                        <button type="button" onClick={() => void abrirEquipoRed(nodo.pareja!.id)} className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-black/5 dark:bg-slate-900">Abrir</button>
                        <button type="button" onClick={() => onEditar(nodo.pareja!)} className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold ring-1 ring-black/5 dark:bg-slate-900">Editar</button>
                    </div>
                </div>
            )}
            {e && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => onRevisar(e)} disabled={revisando === e.id} className="flex flex-col items-center gap-1 rounded-xl bg-slate-100 py-2 text-xs font-semibold dark:bg-slate-800">
                        <ArrowPathIcon className={`h-5 w-5 ${revisando === e.id ? 'animate-spin' : ''}`} /> Revisar
                    </button>
                    <button type="button" onClick={() => void abrirEquipoRed(e.id)} className="flex flex-col items-center gap-1 rounded-xl bg-slate-100 py-2 text-xs font-semibold dark:bg-slate-800">
                        <ArrowTopRightOnSquareIcon className="h-5 w-5" /> Abrir
                    </button>
                    <button type="button" onClick={() => onEditar(e)} className="flex flex-col items-center gap-1 rounded-xl bg-slate-100 py-2 text-xs font-semibold dark:bg-slate-800">
                        <PencilSquareIcon className="h-5 w-5" /> Editar
                    </button>
                </div>
            )}
            {nodo.clientes.length > 0 && (
                <>
                    <p className="mt-4 mb-1 text-xs font-semibold uppercase text-slate-500">{nodo.tipo === 'router' ? 'Clientes de radio sin AP detectado' : 'Clientes conectados'}</p>
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {[...nodo.clientes].sort((a, b) => (a.senal ?? 0) - (b.senal ?? 0)).map((c) => (
                            <li key={c.id} className="flex items-center gap-2 py-1.5 text-sm">
                                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${c.responde == null ? 'bg-slate-300' : c.responde ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                <span className="font-mono text-xs text-slate-500">{c.contrato}</span>
                                <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                                {c.senal != null && <span className={`font-mono text-xs font-semibold ${colorSenal(c.senal)}`}>{c.senal} dBm</span>}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </aside>
    );
}

/**
 * Mapa de la red como diagrama: nodo principal arriba y hacia abajo troncal,
 * enlaces, MikroTik de cada zona y sus AP. La línea es verde si el equipo de
 * abajo responde y roja si no. Al tocar una caja se ve su detalle y sus clientes.
 */
export default function MapaRed({ arbol, onEditar, onRevisar, revisando }: {
    arbol: Arbol;
    onEditar: (equipo: EquipoRed) => void;
    onRevisar: (equipo: EquipoRed) => void;
    revisando: number | null;
}) {
    const raices = useMemo(() => [...arbol.troncal.map(deEquipo), ...arbol.routers.map(deRouter)], [arbol]);
    const { colocados, lineas, ancho, alto } = useMemo(() => acomodar(raices), [raices]);
    const [elegido, setElegido] = useState<string | null>(null);
    const contenedor = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);

    // Al abrir: que quepa a lo ancho (sin bajar de 55% para que se lea).
    // Si no cabe (celular), arranca centrado en el nodo principal.
    const raizX = colocados.find((c) => c.y === 0)?.x ?? 0;
    useEffect(() => {
        let centrar = 0;
        const ajustar = window.setTimeout(() => {
            const caja = contenedor.current;
            const visible = caja?.clientWidth ?? ancho;
            const nuevo = Math.min(1, Math.max(0.55, (visible - 24) / ancho));
            setZoom(nuevo);
            centrar = window.requestAnimationFrame(() => {
                if (caja && caja.scrollWidth > caja.clientWidth) caja.scrollLeft = (raizX + ANCHO / 2) * nuevo - caja.clientWidth / 2 + 12;
            });
        }, 0);
        return () => { window.clearTimeout(ajustar); window.cancelAnimationFrame(centrar); };
    }, [ancho, raizX]);

    const nodo = colocados.find((c) => c.nodo.clave === elegido)?.nodo ?? null;
    return (
        <div className="relative">
            <div className="absolute right-2 top-2 z-10 flex gap-1">
                <button type="button" aria-label="Alejar" onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))} className="rounded-lg bg-white p-1.5 shadow ring-1 ring-black/5 dark:bg-slate-800"><MagnifyingGlassMinusIcon className="h-5 w-5" /></button>
                <button type="button" aria-label="Acercar" onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))} className="rounded-lg bg-white p-1.5 shadow ring-1 ring-black/5 dark:bg-slate-800"><MagnifyingGlassPlusIcon className="h-5 w-5" /></button>
            </div>
            <div ref={contenedor} className="overflow-x-auto rounded-2xl bg-slate-50 p-3 ring-1 ring-black/[0.04] dark:bg-slate-950/40" data-testid="mapa-red">
                <div style={{ width: ancho * zoom, height: alto * zoom }} className="mx-auto">
                    <div style={{ width: ancho, height: alto, transform: `scale(${zoom})`, transformOrigin: 'top left', position: 'relative' }}>
                        <svg width={ancho} height={alto} className="absolute inset-0" aria-hidden="true">
                            {lineas.map(([padre, hijo]) => {
                                const x1 = padre.x + ANCHO / 2;
                                const y1 = padre.y + ALTO;
                                const x2 = hijo.x + ANCHO / 2;
                                const y2 = hijo.y;
                                const medio = y1 + SEPARACION_Y / 2;
                                return (
                                    <path key={`${padre.nodo.clave}-${hijo.nodo.clave}`} d={`M${x1},${y1} V${medio} H${x2} V${y2}`}
                                        fill="none" stroke={COLOR_LINEA(hijo.nodo.responde)} strokeWidth={hijo.nodo.responde === false ? 3 : 2}
                                        strokeDasharray={hijo.nodo.responde === false ? '6 4' : undefined} />
                                );
                            })}
                        </svg>
                        {colocados.map(({ nodo: n, x, y }) => (
                            <div key={n.clave} style={{ position: 'absolute', left: x, top: y, width: ANCHO, height: ALTO }}>
                                <Caja nodo={n} seleccionado={elegido === n.clave} onClick={() => setElegido(n.clave)} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {nodo && <Panel nodo={nodo} onCerrar={() => setElegido(null)} onEditar={onEditar} onRevisar={onRevisar} revisando={revisando} />}
        </div>
    );
}
