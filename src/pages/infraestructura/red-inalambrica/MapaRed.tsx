import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
    ArrowPathIcon, ArrowTopRightOnSquareIcon, ArrowsRightLeftIcon, CircleStackIcon, MagnifyingGlassMinusIcon,
    MagnifyingGlassPlusIcon, PencilSquareIcon, ServerStackIcon, SignalIcon, Squares2X2Icon, WifiIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

import { abrirEquipoRed } from '@/utils/accesoRemoto';
import type { Arbol, ClienteFibra, ClienteRadio, EquipoRed, OltArbol, RouterArbol } from './tipos';

const ANCHO = 220;
const ALTO = 92;
const SEPARACION_X = 24;
const SEPARACION_Y = 64;
const FILA = 22;
const CABEZA_GRUPO = 34;
const VISIBLES = 12;

/** Un cliente dentro de una lista (bajo su AP o su PON). */
interface Fila {
    id: number;
    contrato: string | null;
    nombre: string;
    responde: boolean | null;
    valor: number | null;
    medida: 'senal' | 'potencia';
}

interface Nodo {
    clave: string;
    tipo: 'equipo' | 'router' | 'olt' | 'grupo';
    titulo: string;
    detalle: string;
    responde: boolean | null;
    senal: number | null;
    clientes: number;
    caidos: number;
    filas: Fila[];
    equipo?: EquipoRed;
    /** Enlace PtP: la otra punta (se dibuja como una sola caja). */
    pareja?: EquipoRed;
    router?: RouterArbol;
    olt?: OltArbol;
    hijos: Nodo[];
}

interface Colocado { nodo: Nodo; x: number; y: number; alto: number }

const sinPunta = (nombre: string) => nombre.replace(/\s*\((salida|llegada|nodo principal|nodo|base|estación|estacion)\)\s*$/i, '').trim();
const ultimo = (ip: string) => `.${ip.split('.').pop()}`;

function ambos(a: boolean | null, b: boolean | null): boolean | null {
    if (a === false || b === false) return false;
    return a == null || b == null ? null : true;
}

const deRadio = (c: ClienteRadio): Fila => ({ id: c.id, contrato: c.contrato, nombre: c.nombre, responde: c.responde, valor: c.senal, medida: 'senal' });
const deFibra = (c: ClienteFibra): Fila => ({ id: c.id, contrato: c.contrato, nombre: c.nombre, responde: c.responde, valor: c.potencia, medida: 'potencia' });

/** Lista de clientes: los que no responden primero, luego los de peor señal o potencia. */
function grupo(clave: string, titulo: string, filas: Fila[]): Nodo {
    const ordenadas = [...filas].sort((a, b) => (a.responde === false ? 0 : 1) - (b.responde === false ? 0 : 1) || (a.valor ?? 0) - (b.valor ?? 0));
    const caidos = filas.filter((f) => f.responde === false).length;
    return {
        clave, tipo: 'grupo', titulo, detalle: '', responde: null, senal: null,
        clientes: filas.length, caidos, filas: ordenadas, hijos: [],
    };
}

function deEquipo(equipo: EquipoRed): Nodo {
    // Un PtP base con su única estación: una sola caja "enlace" con las dos puntas.
    const estacion = equipo.tipo === 'ptp_base' && equipo.hijos.length === 1 && equipo.hijos[0].tipo === 'ptp_estacion' && !equipo.router
        ? equipo.hijos[0] : null;
    const punta = estacion ?? equipo;
    const hijos = punta.hijos.map(deEquipo);
    if (punta.router) hijos.push(deRouter(punta.router));
    const clientes = [...equipo.clientes, ...(estacion ? estacion.clientes : [])];
    if (clientes.length) hijos.push(grupo(`g${equipo.id}`, `Clientes de ${sinPunta(equipo.nombre)}`, clientes.map(deRadio)));
    const latencia = estacion ? (estacion.latencia_ms ?? equipo.latencia_ms) : equipo.latencia_ms;
    const responde = estacion ? ambos(equipo.responde, estacion.responde) : equipo.responde;
    return {
        clave: `e${equipo.id}`,
        tipo: 'equipo',
        titulo: estacion ? sinPunta(equipo.nombre) : equipo.nombre,
        detalle: [
            estacion ? `${ultimo(equipo.ip)} ⇄ ${ultimo(estacion.ip)}` : equipo.ip,
            latencia != null ? `${latencia} ms` : responde === false ? 'no responde' : null,
        ].filter(Boolean).join(' · '),
        responde,
        senal: estacion ? (estacion.senal ?? equipo.senal) : equipo.senal,
        clientes: clientes.length,
        caidos: clientes.filter((c) => c.responde === false).length,
        filas: [],
        equipo,
        pareja: estacion ?? undefined,
        hijos,
    };
}

function deOlt(olt: OltArbol): Nodo {
    const todos = olt.pons.flatMap((p) => p.clientes);
    return {
        clave: `o${olt.id}`,
        tipo: 'olt',
        titulo: `OLT ${olt.nombre}`,
        detalle: `${olt.tecnologia} · ${olt.ip}`,
        responde: null,
        senal: null,
        clientes: todos.length,
        caidos: todos.filter((c) => c.responde === false).length,
        filas: [],
        olt,
        hijos: olt.pons.map((p) => grupo(`o${olt.id}p${p.pon ?? 'x'}`, p.pon != null ? `PON ${p.pon}` : 'Sin lectura de PON', p.clientes.map(deFibra))),
    };
}

function deRouter(router: RouterArbol): Nodo {
    const hijos = [...router.equipos.map(deEquipo), ...(router.olts ?? []).map(deOlt)];
    if (router.clientes_sin_ap.length) hijos.push(grupo(`s${router.id ?? 'x'}`, 'Radio sin AP detectado', router.clientes_sin_ap.map(deRadio)));
    return {
        clave: `r${router.id ?? 'x'}`,
        tipo: 'router',
        titulo: router.nombre,
        detalle: router.ip ? `MikroTik · ${router.ip}` : 'Sin MikroTik',
        responde: router.en_linea,
        senal: null,
        clientes: 0,
        caidos: 0,
        filas: [],
        router,
        hijos,
    };
}

function altoDe(nodo: Nodo, abiertos: Set<string>): number {
    if (nodo.tipo !== 'grupo') return ALTO;
    const visibles = abiertos.has(nodo.clave) ? nodo.filas.length : Math.min(nodo.filas.length, VISIBLES);
    return CABEZA_GRUPO + visibles * FILA + (nodo.filas.length > VISIBLES ? 26 : 6);
}

/** Árbol de arriba hacia abajo: cada hoja ocupa una columna, el padre va centrado sobre sus
 *  hijos y cada nivel mide lo que su caja más alta (las listas de clientes son altas). */
function acomodar(raices: Nodo[], abiertos: Set<string>) {
    const niveles: number[] = [];
    const medir = (nodo: Nodo, nivel: number) => {
        niveles[nivel] = Math.max(niveles[nivel] ?? 0, altoDe(nodo, abiertos));
        nodo.hijos.forEach((h) => medir(h, nivel + 1));
    };
    raices.forEach((r) => medir(r, 0));
    const inicio = niveles.reduce<number[]>((acc, alto, i) => [...acc, i === 0 ? 0 : acc[i - 1] + niveles[i - 1] + SEPARACION_Y], []);

    const colocados: Colocado[] = [];
    const lineas: [Colocado, Colocado][] = [];
    let columna = 0;
    const colocar = (nodo: Nodo, nivel: number): Colocado => {
        const hijos = nodo.hijos.map((h) => colocar(h, nivel + 1));
        let x: number;
        if (hijos.length) {
            x = (hijos[0].x + hijos[hijos.length - 1].x) / 2;
        } else {
            x = columna * (ANCHO + SEPARACION_X);
            columna += 1;
        }
        const propio = { nodo, x, y: inicio[nivel], alto: altoDe(nodo, abiertos) };
        colocados.push(propio);
        hijos.forEach((h) => lineas.push([propio, h]));
        return propio;
    };
    raices.forEach((r) => colocar(r, 0));
    const ultimoNivel = niveles.length - 1;
    return {
        colocados,
        lineas,
        ancho: Math.max(columna, 1) * (ANCHO + SEPARACION_X) - SEPARACION_X,
        alto: ultimoNivel >= 0 ? inicio[ultimoNivel] + niveles[ultimoNivel] : ALTO,
    };
}

const COLOR_LINEA = (responde: boolean | null) => (responde == null ? '#cbd5e1' : responde ? '#10b981' : '#f43f5e');

const ICONOS: Record<string, ComponentType<{ className?: string }>> = {
    router: ServerStackIcon, ap: WifiIcon, ptp_base: ArrowsRightLeftIcon, ptp_estacion: ArrowsRightLeftIcon, switch: Squares2X2Icon, olt: CircleStackIcon,
};

function IconoNodo({ nodo }: { nodo: Nodo }) {
    const clase = `h-5 w-5 shrink-0 ${nodo.tipo === 'router' ? 'text-blue-600' : nodo.tipo === 'olt' ? 'text-violet-600' : 'text-slate-500'}`;
    const tipo = nodo.tipo === 'router' || nodo.tipo === 'olt' ? nodo.tipo : nodo.equipo?.tipo ?? '';
    const Icono = ICONOS[tipo] ?? SignalIcon;
    return <Icono className={clase} />;
}

/** Radio: buena > -65, regular hasta -75. Fibra: buena > -25, regular hasta -27. */
function colorValor(valor: number, medida: 'senal' | 'potencia') {
    const [bueno, regular] = medida === 'senal' ? [-65, -75] : [-25, -27];
    return valor >= bueno ? 'text-emerald-600 dark:text-emerald-400' : valor >= regular ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
}

function Caja({ nodo, seleccionado, onClick }: { nodo: Nodo; seleccionado: boolean; onClick: () => void }) {
    const borde = nodo.responde == null ? 'border-slate-300 dark:border-slate-600' : nodo.responde ? 'border-emerald-400' : 'border-rose-500';
    const fondo = nodo.tipo === 'router' ? 'bg-blue-50 dark:bg-blue-500/10' : nodo.tipo === 'olt' ? 'bg-violet-50 dark:bg-violet-500/10' : 'bg-white dark:bg-slate-900';
    return (
        <button type="button" onClick={onClick} data-testid={`mapa-${nodo.clave}`}
            className={`flex h-full w-full flex-col justify-between rounded-2xl border-2 ${borde} ${fondo} p-2.5 text-left shadow-sm transition hover:shadow-md ${seleccionado ? 'ring-4 ring-blue-500/30' : ''}`}>
            <span className="flex items-center gap-2">
                <IconoNodo nodo={nodo} />
                <span className="line-clamp-2 min-w-0 flex-1 text-[13px] font-bold leading-tight text-slate-900 dark:text-white" title={nodo.titulo}>{nodo.titulo}</span>
            </span>
            <span className="truncate text-[11px] text-slate-500">{nodo.detalle}</span>
            <span className="flex items-center gap-2 text-[11px]">
                {nodo.senal != null && <span className={`font-mono font-semibold ${colorValor(nodo.senal, 'senal')}`}>{nodo.senal} dBm</span>}
                {nodo.equipo?.estaciones != null && <span className="text-slate-500">{nodo.equipo.estaciones} est.</span>}
                {nodo.clientes > 0 && (
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {nodo.clientes} cliente{nodo.clientes === 1 ? '' : 's'}{nodo.caidos ? <span className="text-rose-600"> · {nodo.caidos}✕</span> : null}
                    </span>
                )}
            </span>
        </button>
    );
}

/** Lista de clientes bajo su AP o su PON, con su estado y su señal o potencia. */
function Lista({ nodo, abierta, onAlternar }: { nodo: Nodo; abierta: boolean; onAlternar: () => void }) {
    const filas = abierta ? nodo.filas : nodo.filas.slice(0, VISIBLES);
    return (
        <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-[12px] shadow-sm dark:border-slate-700 dark:bg-slate-900" data-testid={`mapa-${nodo.clave}`}>
            <div className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-2 dark:border-slate-800" style={{ height: CABEZA_GRUPO - 2 }}>
                <span className="min-w-0 flex-1 truncate font-bold text-slate-800 dark:text-slate-100">{nodo.titulo}</span>
                <span className="shrink-0 text-slate-500">{nodo.clientes}{nodo.caidos ? <span className="text-rose-600"> · {nodo.caidos}✕</span> : null}</span>
            </div>
            <ul className="px-2.5">
                {filas.map((f) => (
                    <li key={f.id} className="flex items-center gap-1.5" style={{ height: FILA }}>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${f.responde == null ? 'bg-slate-300' : f.responde ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="w-9 shrink-0 font-mono text-[10px] text-slate-400">{f.contrato}</span>
                        <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200" title={f.nombre}>{f.nombre}</span>
                        {f.valor != null && <span className={`shrink-0 font-mono text-[10px] font-semibold ${colorValor(f.valor, f.medida)}`}>{f.valor}</span>}
                    </li>
                ))}
            </ul>
            {nodo.filas.length > VISIBLES && (
                <button type="button" onClick={onAlternar} className="w-full py-1 text-[11px] font-semibold text-blue-600 hover:underline dark:text-blue-400">
                    {abierta ? 'Ver menos' : `Ver los ${nodo.filas.length}`}
                </button>
            )}
        </div>
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
        ['Clientes', nodo.clientes ? `${nodo.clientes}${nodo.caidos ? ` · ${nodo.caidos} sin responder` : ''}` : null],
        ['Firmware', e.firmware],
    ] : nodo.olt ? [
        ['Tecnología', nodo.olt.tecnologia],
        ['IP', nodo.olt.ip],
        ['PON con clientes', String(nodo.olt.pons.length)],
        ['Clientes', `${nodo.clientes}${nodo.caidos ? ` · ${nodo.caidos} sin conexión` : ''}`],
    ] : [['MikroTik', nodo.router?.ip ?? null], ['Estado', nodo.responde ? 'En línea' : 'Sin respuesta']];
    return (
        <aside className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:top-24 sm:bottom-auto sm:w-96 sm:rounded-3xl dark:bg-slate-900" data-testid="mapa-panel">
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
        </aside>
    );
}

/**
 * Mapa de toda la red: nodo principal arriba y hacia abajo troncal, enlaces,
 * MikroTik de cada zona, sus AP y OLT, y hasta cada cliente (radio bajo su AP,
 * fibra bajo su PON). La línea es verde si el equipo de abajo responde y roja si no.
 */
export default function MapaRed({ arbol, onEditar, onRevisar, revisando }: {
    arbol: Arbol;
    onEditar: (equipo: EquipoRed) => void;
    onRevisar: (equipo: EquipoRed) => void;
    revisando: number | null;
}) {
    const raices = useMemo(() => [...arbol.troncal.map(deEquipo), ...arbol.routers.map(deRouter)], [arbol]);
    const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
    const { colocados, lineas, ancho, alto } = useMemo(() => acomodar(raices, abiertos), [raices, abiertos]);
    const [elegido, setElegido] = useState<string | null>(null);
    const contenedor = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(1);

    const alternar = (clave: string) => setAbiertos((actual) => {
        const nuevo = new Set(actual);
        if (nuevo.has(clave)) nuevo.delete(clave); else nuevo.add(clave);
        return nuevo;
    });

    // Al abrir: que quepa a lo ancho (sin bajar de 55%) y, si no cabe, centrado en el nodo principal.
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
                                const y1 = padre.y + padre.alto;
                                const x2 = hijo.x + ANCHO / 2;
                                const y2 = hijo.y;
                                const medio = y2 - SEPARACION_Y / 2;
                                const responde = hijo.nodo.tipo === 'grupo' ? null : hijo.nodo.responde;
                                return (
                                    <path key={`${padre.nodo.clave}-${hijo.nodo.clave}`} d={`M${x1},${y1} V${medio} H${x2} V${y2}`}
                                        fill="none" stroke={COLOR_LINEA(responde)} strokeWidth={responde === false ? 3 : 2}
                                        strokeDasharray={responde === false ? '6 4' : undefined} />
                                );
                            })}
                        </svg>
                        {colocados.map(({ nodo: n, x, y, alto: altoCaja }) => (
                            <div key={n.clave} style={{ position: 'absolute', left: x, top: y, width: ANCHO, height: altoCaja }}>
                                {n.tipo === 'grupo'
                                    ? <Lista nodo={n} abierta={abiertos.has(n.clave)} onAlternar={() => alternar(n.clave)} />
                                    : <Caja nodo={n} seleccionado={elegido === n.clave} onClick={() => setElegido(n.clave)} />}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {nodo && <Panel nodo={nodo} onCerrar={() => setElegido(null)} onEditar={onEditar} onRevisar={onRevisar} revisando={revisando} />}
        </div>
    );
}
