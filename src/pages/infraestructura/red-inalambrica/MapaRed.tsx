import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import {
    ArrowPathIcon, ArrowTopRightOnSquareIcon, ArrowsRightLeftIcon, BoltIcon, ChevronDownIcon, ChevronRightIcon, CircleStackIcon,
    MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, MinusIcon, PencilSquareIcon, PlusIcon, ServerStackIcon, SignalIcon,
    Squares2X2Icon, WifiIcon, XMarkIcon,
} from '@heroicons/react/24/outline';

import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';

import client from '@/api/axios';
import { abrirAntena, abrirEquipo, abrirEquipoRed } from '@/utils/accesoRemoto';
import { apiErrorMessage } from '@/utils/apiError';
import type { Arbol, ClienteFibra, ClienteRadio, EquipoRed, OltArbol, RouterArbol } from './tipos';

const ANCHO = 220;
const ALTO = 92;
const SEPARACION_X = 24;
const SEPARACION_Y = 64;
const FILA = 22;
const CABEZA_GRUPO = 34;
const BOTON_NODO = 22;

/** El flujo que baja por las líneas: la señal llega hasta ahí. */
const ESTILO_FLUJO = `
.mapa-flujo { stroke-dasharray: 7 7; animation: mapa-flujo 0.9s linear infinite; }
@keyframes mapa-flujo { to { stroke-dashoffset: -14; } }
.mapa-tronco { background-image: repeating-linear-gradient(to bottom, currentColor 0 6px, transparent 6px 12px); background-size: 2px 12px; animation: mapa-tronco 0.9s linear infinite; }
@keyframes mapa-tronco { to { background-position-y: 12px; } }
@media (prefers-reduced-motion: reduce) { .mapa-flujo, .mapa-tronco { animation: none; } }
`;

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
    router?: RouterArbol;
    olt?: OltArbol;
    hijos: Nodo[];
}

interface Colocado {
    nodo: Nodo;
    x: number;
    y: number;
    alto: number;
    /** La señal llega hasta aquí (ningún equipo de arriba está caído). */
    llega: boolean;
    /** Tiene cosas colgando aunque estén cerradas. */
    cerrado: boolean;
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

/** Cada equipo es su propia caja (también las dos puntas de un PtP), para ver cuál falla. */
function deEquipo(equipo: EquipoRed): Nodo {
    const hijos = equipo.hijos.map(deEquipo);
    hijos.push(...(equipo.olts ?? []).map(deOlt));
    if (equipo.router) hijos.push(deRouter(equipo.router));
    if (equipo.clientes.length) hijos.push(grupo(`g${equipo.id}`, `Clientes de ${equipo.nombre}`, equipo.clientes.map(deRadio)));
    return {
        clave: `e${equipo.id}`,
        tipo: 'equipo',
        titulo: equipo.nombre,
        detalle: [equipo.ip, equipo.latencia_ms != null ? `${equipo.latencia_ms} ms` : equipo.responde === false ? 'no responde' : null].filter(Boolean).join(' · '),
        responde: equipo.responde,
        senal: equipo.senal,
        clientes: equipo.clientes.length,
        caidos: equipo.clientes.filter((c) => c.responde === false).length,
        filas: [],
        equipo,
        hijos,
    };
}

function deOlt(olt: OltArbol): Nodo {
    const todos = olt.pons.flatMap((p) => p.clientes);
    return {
        clave: `o${olt.id}`,
        tipo: 'olt',
        titulo: `OLT ${olt.nombre}`,
        detalle: [olt.tecnologia, olt.ip, olt.latencia_ms != null ? `${olt.latencia_ms} ms` : olt.responde === false ? 'no responde' : null].filter(Boolean).join(' · '),
        responde: olt.responde ?? null,
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

function altoDe(nodo: Nodo, cerrados: Set<string>): number {
    if (nodo.tipo !== 'grupo') return ALTO;
    return cerrados.has(nodo.clave) ? CABEZA_GRUPO : CABEZA_GRUPO + nodo.filas.length * FILA + 6;
}

/** Árbol de arriba hacia abajo: cada hoja ocupa una columna, el padre va centrado sobre sus
 *  hijos y cada nivel mide lo que su caja más alta (las listas de clientes son altas). */
function acomodar(raices: Nodo[], cerrados: Set<string>) {
    const niveles: number[] = [];
    const visibles = (nodo: Nodo) => (nodo.tipo !== 'grupo' && cerrados.has(nodo.clave) ? [] : nodo.hijos);
    const medir = (nodo: Nodo, nivel: number) => {
        niveles[nivel] = Math.max(niveles[nivel] ?? 0, altoDe(nodo, cerrados) + (nodo.hijos.length && nodo.tipo !== 'grupo' ? BOTON_NODO : 0));
        visibles(nodo).forEach((h) => medir(h, nivel + 1));
    };
    raices.forEach((r) => medir(r, 0));
    const inicio = niveles.reduce<number[]>((acc, alto, i) => [...acc, i === 0 ? 0 : acc[i - 1] + niveles[i - 1] + SEPARACION_Y], []);

    const colocados: Colocado[] = [];
    const lineas: [Colocado, Colocado][] = [];
    let columna = 0;
    const colocar = (nodo: Nodo, nivel: number, llegaArriba: boolean): Colocado => {
        const llega = llegaArriba && (nodo.tipo === 'grupo' || nodo.responde !== false);
        const hijos = visibles(nodo).map((h) => colocar(h, nivel + 1, llega));
        let x: number;
        if (hijos.length) {
            x = (hijos[0].x + hijos[hijos.length - 1].x) / 2;
        } else {
            x = columna * (ANCHO + SEPARACION_X);
            columna += 1;
        }
        const propio = {
            nodo, x, y: inicio[nivel], alto: altoDe(nodo, cerrados), llega,
            cerrado: nodo.tipo !== 'grupo' && nodo.hijos.length > 0 && cerrados.has(nodo.clave),
        };
        colocados.push(propio);
        hijos.forEach((h) => lineas.push([propio, h]));
        return propio;
    };
    raices.forEach((r) => colocar(r, 0, true));
    const ultimoNivel = niveles.length - 1;
    return {
        colocados,
        lineas,
        ancho: Math.max(columna, 1) * (ANCHO + SEPARACION_X) - SEPARACION_X,
        alto: ultimoNivel >= 0 ? inicio[ultimoNivel] + niveles[ultimoNivel] : ALTO,
    };
}

/** Hijo caído: rojo. Arriba hay algo caído: gris sin flujo. Si no: verde con la señal bajando. */
function estiloLinea(llegaPadre: boolean, hijo: Colocado) {
    if (!llegaPadre) return { color: '#cbd5e1', flujo: false, roto: false };
    if (hijo.nodo.tipo !== 'grupo' && hijo.nodo.responde === false) return { color: '#f43f5e', flujo: false, roto: true };
    return { color: hijo.nodo.responde == null && hijo.nodo.tipo !== 'grupo' ? '#94a3b8' : '#10b981', flujo: true, roto: false };
}

/** Cada tipo con su ícono, su color y su nombre corto, para distinguirlos de un vistazo. */
const TIPOS_VISTA: Record<string, { icono: ComponentType<{ className?: string }>; color: string; etiqueta: string }> = {
    router: { icono: ServerStackIcon, color: 'bg-blue-600 text-white', etiqueta: 'MikroTik' },
    ap: { icono: WifiIcon, color: 'bg-sky-500 text-white', etiqueta: 'AP' },
    ptp: { icono: ArrowsRightLeftIcon, color: 'bg-amber-500 text-white', etiqueta: 'Enlace PtP' },
    olt: { icono: CircleStackIcon, color: 'bg-violet-600 text-white', etiqueta: 'OLT' },
    switch: { icono: Squares2X2Icon, color: 'bg-slate-600 text-white', etiqueta: 'Switch' },
    otro: { icono: SignalIcon, color: 'bg-slate-500 text-white', etiqueta: 'Equipo' },
};

function tipoVista(nodo: Nodo) {
    if (nodo.tipo === 'router' || nodo.equipo?.tipo === 'router') return TIPOS_VISTA.router;
    if (nodo.tipo === 'olt') return TIPOS_VISTA.olt;
    const tipo = nodo.equipo?.tipo ?? '';
    if (tipo.startsWith('ptp')) return TIPOS_VISTA.ptp;
    return TIPOS_VISTA[tipo] ?? TIPOS_VISTA.otro;
}

function IconoNodo({ nodo }: { nodo: Nodo }) {
    const vista = tipoVista(nodo);
    const Icono = vista.icono;
    return (
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${vista.color}`}>
            <Icono className="h-4 w-4" />
        </span>
    );
}

/** Cliente de radio (antena CPE) o de fibra (ONU). */
function IconoCliente({ medida, className = 'h-3.5 w-3.5' }: { medida: 'senal' | 'potencia'; className?: string }) {
    return medida === 'senal'
        ? <SignalIcon className={`${className} shrink-0 text-sky-500`} aria-label="Radio" />
        : <BoltIcon className={`${className} shrink-0 text-amber-500`} aria-label="Fibra" />;
}

/** Radio: buena > -65, regular hasta -75. Fibra: buena > -25, regular hasta -27. */
function colorValor(valor: number, medida: 'senal' | 'potencia') {
    const [bueno, regular] = medida === 'senal' ? [-65, -75] : [-25, -27];
    return valor >= bueno ? 'text-emerald-600 dark:text-emerald-400' : valor >= regular ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
}

function Caja({ nodo, seleccionado, llega, onClick }: { nodo: Nodo; seleccionado: boolean; llega: boolean; onClick: () => void }) {
    const borde = nodo.responde == null ? 'border-slate-300 dark:border-slate-600' : nodo.responde ? 'border-emerald-400' : 'border-rose-500';
    const fondo = nodo.tipo === 'router' ? 'bg-blue-50 dark:bg-blue-500/10' : nodo.tipo === 'olt' ? 'bg-violet-50 dark:bg-violet-500/10' : 'bg-white dark:bg-slate-900';
    return (
        <button type="button" onClick={onClick} data-testid={`mapa-${nodo.clave}`}
            className={`flex h-full w-full flex-col justify-between rounded-2xl border-2 ${borde} ${fondo} p-2.5 text-left shadow-sm transition hover:shadow-md ${seleccionado ? 'ring-4 ring-blue-500/30' : ''} ${llega || nodo.responde === false ? '' : 'opacity-50 grayscale'}`}>
            <span className="flex items-center gap-2">
                <IconoNodo nodo={nodo} />
                <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-bold uppercase tracking-wide text-slate-400">{tipoVista(nodo).etiqueta}{nodo.equipo?.tipo === 'ptp_base' ? ' · base' : nodo.equipo?.tipo === 'ptp_estacion' ? ' · estación' : ''}{nodo.equipo?.marca === 'mimosa' ? ' · Mimosa' : ''}</span>
                    <span className="line-clamp-2 text-[13px] font-bold leading-tight text-slate-900 dark:text-white" title={nodo.titulo}>{nodo.titulo}</span>
                </span>
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

/** Lista de clientes bajo su AP o su PON: una ramita por cliente con la señal bajando
 *  si está conectado (roja si se desconectó). Se cierra a solo el título. */
function Lista({ nodo, cerrada, llega, onAlternar, onCliente }: { nodo: Nodo; cerrada: boolean; llega: boolean; onAlternar: () => void; onCliente: (fila: Fila) => void }) {
    return (
        <div className={`h-full overflow-hidden rounded-2xl border border-slate-200 bg-white text-[12px] shadow-sm dark:border-slate-700 dark:bg-slate-900 ${llega ? '' : 'opacity-60'}`} data-testid={`mapa-${nodo.clave}`}>
            <button type="button" onClick={onAlternar} aria-expanded={!cerrada} aria-label={`${cerrada ? 'Abrir' : 'Cerrar'} ${nodo.titulo}`}
                className="flex w-full items-center gap-1.5 border-b border-slate-100 px-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60" style={{ height: CABEZA_GRUPO - 2 }}>
                {cerrada ? <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" /> : <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                {nodo.filas[0] && <IconoCliente medida={nodo.filas[0].medida} className="h-4 w-4" />}
                <span className="min-w-0 flex-1 truncate font-bold text-slate-800 dark:text-slate-100">{nodo.titulo}</span>
                <span className="shrink-0 text-slate-500">{nodo.clientes}{nodo.caidos ? <span className="text-rose-600"> · {nodo.caidos}✕</span> : null}</span>
            </button>
            {!cerrada && (
                <ul className="relative pl-5 pr-2">
                    {/* Tronco: la señal baja por la lista. */}
                    <span className={`absolute bottom-3 left-2 top-0 w-0.5 ${llega ? 'mapa-tronco text-emerald-500' : 'bg-slate-300'}`} />
                    {nodo.filas.map((f) => {
                        const conectado = llega && f.responde !== false;
                        return (
                            <li key={f.id} className="relative flex cursor-pointer items-center gap-1.5 rounded hover:bg-blue-50 dark:hover:bg-slate-800" style={{ height: FILA }}
                                onClick={() => onCliente(f)} data-testid={`mapa-cliente-${f.id}`}>
                                <span className={`absolute -left-3 top-1/2 h-0.5 w-2.5 ${!llega ? 'bg-slate-300' : f.responde === false ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                <span className={`h-2 w-2 shrink-0 rounded-full ${f.responde == null ? 'bg-slate-300' : f.responde ? 'bg-emerald-500' : 'bg-rose-500'} ${conectado && f.responde ? 'animate-pulse' : ''}`} />
                                <IconoCliente medida={f.medida} className="h-3 w-3" />
                                <span className="w-9 shrink-0 font-mono text-[10px] text-slate-400">{f.contrato}</span>
                                <span className={`min-w-0 flex-1 truncate ${f.responde === false ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`} title={f.nombre}>{f.nombre}</span>
                                {f.valor != null && <span className={`shrink-0 font-mono text-[10px] font-semibold ${colorValor(f.valor, f.medida)}`}>{f.valor}</span>}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

interface FichaCliente {
    id: number; nombre: string; cedula: string | null; telefono: string | null; direccion: string | null;
    ip_asignada: string | null; suggested_user: string | null; identificador_onu: string | null; router_nombre: string;
    estado: string; is_online: boolean; olt_nombre: string | null; nap_nombre: string | null; puerto_nap: number | null;
    plan_nombre: string; velocidad_bajada: number; velocidad_subida: number; precio_plan: number | string;
    total_deuda: number | string; facturas_pendientes: number; saldo_a_favor: number | string;
    cuenta?: { explicacion?: string } | null;
}

const megas = (kbps: number) => (kbps >= 1024 ? `${Math.round(kbps / 1024)} Mb` : `${kbps} Kb`);
const pesos = (valor: number | string) => Number(valor || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

/** Al tocar un cliente en el mapa: sus datos (plan, cuenta, red) sin salir de la topología. */
function PanelCliente({ fila, onCerrar }: { fila: Fila; onCerrar: () => void }) {
    const [ficha, setFicha] = useState<FichaCliente | null>(null);
    const [error, setError] = useState(false);
    useEffect(() => {
        let vigente = true;
        client.get<FichaCliente>(`/clientes/${encodeURIComponent(fila.contrato || String(fila.id))}/portal`)
            .then(({ data }) => { if (vigente) setFicha(data); })
            .catch(() => { if (vigente) setError(true); });
        return () => { vigente = false; };
    }, [fila]);
    const radio = fila.medida === 'senal';
    const filas: [string, string | null][] = ficha ? [
        ['Estado', `${ficha.estado}${ficha.is_online ? ' · conectado' : ' · sin conexión'}`],
        ['Plan', `${ficha.plan_nombre} · ${megas(ficha.velocidad_bajada)}/${megas(ficha.velocidad_subida)} · ${pesos(ficha.precio_plan)}`],
        ['Debe', Number(ficha.total_deuda) > 0 ? `${pesos(ficha.total_deuda)} (${ficha.facturas_pendientes} factura${ficha.facturas_pendientes === 1 ? '' : 's'})` : 'Al corriente'],
        ['Saldo a favor', Number(ficha.saldo_a_favor) > 0 ? pesos(ficha.saldo_a_favor) : null],
        [radio ? 'Señal (vista por el AP)' : 'Potencia', fila.valor != null ? `${fila.valor} dBm` : null],
        ['Teléfono', ficha.telefono],
        ['Dirección', ficha.direccion],
        ['IP', ficha.ip_asignada],
        ['PPPoE', ficha.suggested_user],
        ['MikroTik', ficha.router_nombre],
        ['OLT', radio ? null : ficha.olt_nombre],
        ['Caja NAP', ficha.nap_nombre ? `${ficha.nap_nombre}${ficha.puerto_nap ? ` · puerto ${ficha.puerto_nap}` : ''}` : null],
        [radio ? 'Antena' : 'ONU', ficha.identificador_onu],
    ] : [];
    return (
        <aside className="fixed inset-x-0 bottom-0 z-[60] max-h-[75vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:top-24 sm:bottom-auto sm:w-96 sm:rounded-3xl dark:bg-slate-900" data-testid="mapa-panel-cliente">
            <div className="mb-3 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 font-mono text-xs text-slate-500"><IconoCliente medida={fila.medida} /> {radio ? 'Radio' : 'Fibra'} · {fila.contrato}</p>
                    <h3 className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{fila.nombre}</h3>
                    {ficha?.cuenta?.explicacion && <p className="mt-1 text-xs text-slate-500">{ficha.cuenta.explicacion}</p>}
                </div>
                <button type="button" onClick={onCerrar} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700"><XMarkIcon className="h-5 w-5" /></button>
            </div>
            {error ? <p className="text-sm text-rose-600">No se pudieron cargar sus datos.</p> : !ficha ? <p className="text-sm text-slate-500">Cargando…</p> : (
                <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                    {filas.filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 py-1.5"><dt className="shrink-0 text-slate-500">{k}</dt><dd className="text-right font-medium text-slate-800 dark:text-slate-100">{v}</dd></div>
                    ))}
                </dl>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to={`/admin/clientes?revisar=${fila.id}`} className="flex items-center justify-center rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white">Ver ficha completa</Link>
                {radio ? (
                    <button type="button" onClick={() => void abrirAntena(fila.id)} className="rounded-xl bg-slate-100 py-2.5 text-xs font-bold dark:bg-slate-800">Abrir antena</button>
                ) : ficha?.ip_asignada ? (
                    <button type="button" onClick={() => void abrirEquipo(ficha.ip_asignada!)} className="rounded-xl bg-slate-100 py-2.5 text-xs font-bold dark:bg-slate-800">Abrir su equipo</button>
                ) : null}
                {ficha?.telefono && <a href={`tel:${ficha.telefono}`} className="flex items-center justify-center rounded-xl bg-slate-100 py-2.5 text-xs font-bold dark:bg-slate-800">Llamar</a>}
            </div>
        </aside>
    );
}

/** De qué equipo cuelga un MikroTik o una OLT en la topología. */
function CuelgaDe({ nodo, equipos, onCambio }: { nodo: Nodo; equipos: EquipoRed[]; onCambio: () => void }) {
    const esRouter = nodo.tipo === 'router';
    const id = esRouter ? nodo.router?.id : nodo.olt?.id;
    const actual = esRouter
        ? equipos.find((e) => e.router_hijo_id === id)?.id ?? null
        : nodo.olt?.equipo_padre_id ?? null;
    const [valor, setValor] = useState(actual ? String(actual) : '');
    const [guardando, setGuardando] = useState(false);
    // Un MikroTik no puede colgar de lo que está dentro de él.
    const opciones = esRouter ? equipos.filter((e) => e.troncal || e.router_id !== id) : equipos;
    if (id == null) return null;
    const guardar = async () => {
        setGuardando(true);
        try {
            await client.put(`/red-inalambrica/${esRouter ? 'routers' : 'olts'}/${id}/padre`, { equipo_id: valor ? Number(valor) : null });
            toast.success('Topología actualizada');
            onCambio();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo cambiar'));
        } finally {
            setGuardando(false);
        }
    };
    return (
        <div className="mt-3 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/60" data-testid="mapa-cuelga-de">
            <label className="block text-xs font-semibold text-slate-500">Cuelga de
                <select value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900">
                    <option value="">{esRouter ? 'Nada (arriba, suelto)' : 'Directo de su MikroTik'}</option>
                    {opciones.map((e) => <option key={e.id} value={e.id}>{e.nombre} · {e.tipo_nombre}</option>)}
                </select>
            </label>
            <button type="button" onClick={() => void guardar()} disabled={guardando || valor === (actual ? String(actual) : '')}
                className="mt-2 w-full rounded-lg bg-blue-600 py-1.5 text-xs font-bold text-white disabled:opacity-40">
                {guardando ? 'Guardando…' : 'Guardar'}
            </button>
        </div>
    );
}

function Panel({ nodo, onCerrar, onEditar, onRevisar, revisando, equipos, onCambio }: {
    nodo: Nodo;
    onCerrar: () => void;
    onEditar: (equipo: EquipoRed) => void;
    onRevisar: (equipo: EquipoRed) => void;
    revisando: number | null;
    equipos: EquipoRed[];
    onCambio: () => void;
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
        ['Ping', nodo.responde == null ? 'Sin datos' : nodo.responde ? (nodo.olt.latencia_ms != null ? `${nodo.olt.latencia_ms} ms` : 'En línea') : 'No responde'],
        ['Tecnología', nodo.olt.tecnologia],
        ['IP', nodo.olt.ip],
        ['PON con clientes', String(nodo.olt.pons.length)],
        ['Clientes', `${nodo.clientes}${nodo.caidos ? ` · ${nodo.caidos} sin conexión` : ''}`],
    ] : [['MikroTik', nodo.router?.ip ?? null], ['Estado', nodo.responde ? 'En línea' : 'Sin respuesta']];
    return (
        <aside className="fixed inset-x-0 bottom-0 z-[60] max-h-[70vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:top-24 sm:bottom-auto sm:w-96 sm:rounded-3xl dark:bg-slate-900" data-testid="mapa-panel">
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
            {(nodo.tipo === 'router' || nodo.tipo === 'olt') && <CuelgaDe key={nodo.clave} nodo={nodo} equipos={equipos} onCambio={onCambio} />}
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

/** Al abrir cabe a lo ancho (se lee); "Ver todo" mete también lo alto. */
function vistaQueCabe(caja: HTMLDivElement | null, ancho: number, alto: number, completo = false) {
    if (!caja) return { x: 0, y: 0, z: 1 };
    const aLoAncho = (caja.clientWidth - 32) / ancho;
    const z = Math.min(1, Math.max(completo ? 0.15 : 0.4, completo ? Math.min(aLoAncho, (caja.clientHeight - 32) / alto) : aLoAncho));
    return { z, x: (caja.clientWidth - ancho * z) / 2, y: 16 };
}

/**
 * Mapa de toda la red: nodo principal arriba y hacia abajo troncal, enlaces,
 * MikroTik de cada zona, sus AP y OLT, y hasta cada cliente (radio bajo su AP,
 * fibra bajo su PON). La línea es verde si el equipo de abajo responde y roja si no.
 */
export default function MapaRed({ arbol, equipos, enfoque, onEditar, onRevisar, onCambio, revisando }: {
    arbol: Arbol;
    equipos: EquipoRed[];
    enfoque?: { clave: string; vez: number } | null;
    onEditar: (equipo: EquipoRed) => void;
    onRevisar: (equipo: EquipoRed) => void;
    onCambio: () => void;
    revisando: number | null;
}) {
    const raices = useMemo(() => [...arbol.troncal.map(deEquipo), ...arbol.routers.map(deRouter)], [arbol]);
    const [cerrados, setCerrados] = useState<Set<string>>(new Set());
    const { colocados, lineas, ancho, alto } = useMemo(() => acomodar(raices, cerrados), [raices, cerrados]);
    const [elegido, setElegido] = useState<string | null>(null);
    const [clienteElegido, setClienteElegido] = useState<Fila | null>(null);
    const contenedor = useRef<HTMLDivElement>(null);
    // Vista libre como un mapa: arrastrar para mover, rueda o dos dedos para acercar.
    const [vista, setVista] = useState({ x: 0, y: 0, z: 1 });
    const punteros = useRef(new Map<number, { x: number; y: number }>());
    const gesto = useRef<{ x: number; y: number; distancia: number; movido: boolean }>({ x: 0, y: 0, distancia: 0, movido: false });

    const alternar = (clave: string) => setCerrados((actual) => {
        const nuevo = new Set(actual);
        if (nuevo.has(clave)) nuevo.delete(clave); else nuevo.add(clave);
        return nuevo;
    });
    const todasLasListas = useMemo(() => {
        const claves: string[] = [];
        const recorrer = (n: Nodo) => { if (n.tipo === 'grupo') claves.push(n.clave); n.hijos.forEach(recorrer); };
        raices.forEach(recorrer);
        return claves;
    }, [raices]);

    /** Acercar o alejar dejando quieto el punto (px, py) de la pantalla. */
    const acercar = (factor: number, px?: number, py?: number) => setVista((v) => {
        const caja = contenedor.current;
        const cx = px ?? (caja ? caja.clientWidth / 2 : 0);
        const cy = py ?? (caja ? caja.clientHeight / 2 : 0);
        const z = Math.min(2, Math.max(0.15, v.z * factor));
        return { z, x: cx - (cx - v.x) * (z / v.z), y: cy - (cy - v.y) * (z / v.z) };
    });

    /** Todo el mapa a la vista, centrado. */
    const ajustar = () => setVista(vistaQueCabe(contenedor.current, ancho, alto, true));

    // Al abrir, el mapa completo a la vista (después se mueve libre; no se reacomoda solo).
    const ajustado = useRef(false);
    useEffect(() => {
        if (ajustado.current) return undefined;
        const espera = window.setTimeout(() => {
            setVista(vistaQueCabe(contenedor.current, ancho, alto));
            ajustado.current = true;
        }, 0);
        return () => window.clearTimeout(espera);
    }, [ancho, alto]);

    // Llevar la vista a un equipo (aviso de falla): se abre todo, se centra y se abre su panel.
    const colocadosRef = useRef(colocados);
    useEffect(() => { colocadosRef.current = colocados; }, [colocados]);
    useEffect(() => {
        if (!enfoque) return undefined;
        const abrir = window.setTimeout(() => setCerrados(new Set()), 0);
        const centrar = window.setTimeout(() => {
            const destino = colocadosRef.current.find((c) => c.nodo.clave === enfoque.clave);
            const caja = contenedor.current;
            if (!destino || !caja) return;
            const z = 0.9;
            setVista({ z, x: caja.clientWidth / 2 - (destino.x + ANCHO / 2) * z, y: caja.clientHeight / 3 - destino.y * z });
            setElegido(destino.nodo.clave);
        }, 60);
        return () => { window.clearTimeout(abrir); window.clearTimeout(centrar); };
    }, [enfoque]);

    // La rueda del mouse acerca y aleja (sin mover la página).
    useEffect(() => {
        const caja = contenedor.current;
        if (!caja) return undefined;
        const rueda = (evento: WheelEvent) => {
            evento.preventDefault();
            const borde = caja.getBoundingClientRect();
            acercar(Math.exp(-evento.deltaY * 0.0015), evento.clientX - borde.left, evento.clientY - borde.top);
        };
        caja.addEventListener('wheel', rueda, { passive: false });
        return () => caja.removeEventListener('wheel', rueda);
    }, []);

    const alPresionar = (evento: React.PointerEvent) => {
        punteros.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
        const lista = [...punteros.current.values()];
        gesto.current = {
            x: evento.clientX, y: evento.clientY, movido: false,
            distancia: lista.length === 2 ? Math.hypot(lista[0].x - lista[1].x, lista[0].y - lista[1].y) : 0,
        };
    };
    const alMover = (evento: React.PointerEvent) => {
        if (!punteros.current.has(evento.pointerId)) return;
        punteros.current.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
        const lista = [...punteros.current.values()];
        if (lista.length === 2) {
            // Dos dedos: pellizcar para acercar o alejar.
            const distancia = Math.hypot(lista[0].x - lista[1].x, lista[0].y - lista[1].y);
            const borde = contenedor.current!.getBoundingClientRect();
            if (gesto.current.distancia) acercar(distancia / gesto.current.distancia, (lista[0].x + lista[1].x) / 2 - borde.left, (lista[0].y + lista[1].y) / 2 - borde.top);
            gesto.current.distancia = distancia;
            gesto.current.movido = true;
            return;
        }
        const dx = evento.clientX - gesto.current.x;
        const dy = evento.clientY - gesto.current.y;
        if (!gesto.current.movido && Math.hypot(dx, dy) < 5) return;
        if (!gesto.current.movido) contenedor.current?.setPointerCapture(evento.pointerId);
        gesto.current = { ...gesto.current, x: evento.clientX, y: evento.clientY, movido: true };
        setVista((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
    };
    const alSoltar = (evento: React.PointerEvent) => {
        punteros.current.delete(evento.pointerId);
        if (punteros.current.size === 1) {
            const [resto] = [...punteros.current.values()];
            gesto.current = { ...gesto.current, x: resto.x, y: resto.y, distancia: 0 };
        }
    };

    const nodo = colocados.find((c) => c.nodo.clave === elegido)?.nodo ?? null;
    return (
        <div className="relative">
            <style>{ESTILO_FLUJO}</style>
            <div className="absolute right-2 top-2 z-10 flex flex-wrap justify-end gap-1">
                <button type="button" onClick={() => setCerrados(new Set())} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold shadow ring-1 ring-black/5 dark:bg-slate-800">Abrir todo</button>
                <button type="button" onClick={() => setCerrados(new Set(todasLasListas))} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold shadow ring-1 ring-black/5 dark:bg-slate-800">Cerrar clientes</button>
                <button type="button" onClick={ajustar} className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold shadow ring-1 ring-black/5 dark:bg-slate-800">Ver todo</button>
                <button type="button" aria-label="Alejar" onClick={() => acercar(1 / 1.25)} className="rounded-lg bg-white p-1.5 shadow ring-1 ring-black/5 dark:bg-slate-800"><MagnifyingGlassMinusIcon className="h-5 w-5" /></button>
                <button type="button" aria-label="Acercar" onClick={() => acercar(1.25)} className="rounded-lg bg-white p-1.5 shadow ring-1 ring-black/5 dark:bg-slate-800"><MagnifyingGlassPlusIcon className="h-5 w-5" /></button>
            </div>
            <div className="pointer-events-none absolute bottom-2 left-3 right-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] text-slate-600 shadow-sm dark:bg-slate-900/90 dark:text-slate-300" data-testid="mapa-leyenda">
                {[TIPOS_VISTA.router, TIPOS_VISTA.ptp, TIPOS_VISTA.ap, TIPOS_VISTA.olt].map((t) => {
                    const Icono = t.icono;
                    return <span key={t.etiqueta} className="flex items-center gap-1"><span className={`flex h-4 w-4 items-center justify-center rounded ${t.color}`}><Icono className="h-3 w-3" /></span>{t.etiqueta}</span>;
                })}
                <span className="flex items-center gap-1"><IconoCliente medida="senal" /> Cliente radio (CPE)</span>
                <span className="flex items-center gap-1"><IconoCliente medida="potencia" /> Cliente fibra</span>
                <span className="ml-auto hidden text-slate-400 sm:inline">Arrastra para moverte · rueda o dos dedos para acercar</span>
            </div>
            <div
                ref={contenedor}
                data-testid="mapa-red"
                className="relative h-[75vh] min-h-[420px] cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-black/[0.04] active:cursor-grabbing dark:bg-slate-950/40"
                onPointerDown={alPresionar}
                onPointerMove={alMover}
                onPointerUp={alSoltar}
                onPointerCancel={alSoltar}
                onClickCapture={(evento) => {
                    // Un arrastre no cuenta como clic en la caja donde terminó.
                    if (gesto.current.movido) { evento.stopPropagation(); evento.preventDefault(); gesto.current.movido = false; }
                }}
            >
                <div style={{ width: ancho, height: alto, transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.z})`, transformOrigin: '0 0', position: 'absolute', left: 0, top: 0 }}>
                        <svg width={ancho} height={alto} className="absolute inset-0" aria-hidden="true">
                            {lineas.map(([padre, hijo]) => {
                                const x1 = padre.x + ANCHO / 2;
                                const y1 = padre.y + padre.alto + BOTON_NODO;
                                const x2 = hijo.x + ANCHO / 2;
                                const y2 = hijo.y;
                                const medio = y2 - SEPARACION_Y / 2;
                                const linea = estiloLinea(padre.llega, hijo);
                                const d = `M${x1},${y1} V${medio} H${x2} V${y2}`;
                                return (
                                    <g key={`${padre.nodo.clave}-${hijo.nodo.clave}`}>
                                        <path d={d} fill="none" stroke={linea.color} strokeOpacity={linea.flujo ? 0.35 : 1} strokeWidth={linea.roto ? 3 : 2}
                                            strokeDasharray={linea.roto ? '6 4' : undefined} />
                                        {linea.flujo && <path d={d} fill="none" stroke={linea.color} strokeWidth={2.5} className="mapa-flujo" />}
                                    </g>
                                );
                            })}
                        </svg>
                        {colocados.map(({ nodo: n, x, y, alto: altoCaja, llega, cerrado }) => (
                            <div key={n.clave} style={{ position: 'absolute', left: x, top: y, width: ANCHO, height: altoCaja }}>
                                {n.tipo === 'grupo'
                                    ? <Lista nodo={n} cerrada={cerrados.has(n.clave)} llega={llega} onAlternar={() => alternar(n.clave)} onCliente={(f) => { setElegido(null); setClienteElegido(f); }} />
                                    : <Caja nodo={n} seleccionado={elegido === n.clave} llega={llega} onClick={() => { setClienteElegido(null); setElegido(n.clave); }} />}
                                {n.tipo !== 'grupo' && n.hijos.length > 0 && (
                                    <button type="button" onClick={() => alternar(n.clave)} aria-label={`${cerrado ? 'Abrir' : 'Cerrar'} lo que cuelga de ${n.titulo}`}
                                        data-testid={`mapa-alternar-${n.clave}`}
                                        className="absolute left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 shadow ring-1 ring-black/10 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-300"
                                        style={{ top: altoCaja + 2 }}>
                                        {cerrado ? <><PlusIcon className="h-3 w-3" />{n.hijos.length}</> : <MinusIcon className="h-3 w-3" />}
                                    </button>
                                )}
                            </div>
                        ))}
                </div>
            </div>
            {clienteElegido && <PanelCliente key={clienteElegido.id} fila={clienteElegido} onCerrar={() => setClienteElegido(null)} />}
            {nodo && <Panel nodo={nodo} onCerrar={() => setElegido(null)} onEditar={onEditar} onRevisar={onRevisar} revisando={revisando} equipos={equipos} onCambio={onCambio} />}
        </div>
    );
}
