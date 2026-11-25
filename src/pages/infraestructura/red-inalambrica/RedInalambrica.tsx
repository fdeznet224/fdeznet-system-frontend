import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    ArrowPathIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon, ChevronRightIcon, PencilSquareIcon, PlusIcon, ServerStackIcon,
    SignalIcon, WifiIcon,
} from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { EncabezadoPagina, Metrica, Vacio } from '@/components/ui/Pagina';
import { BOTON_ACCION_PRIMARIO, TARJETA } from '@/components/ui/estilo';
import { abrirEquipoRed } from '@/utils/accesoRemoto';
import { apiErrorMessage } from '@/utils/apiError';
import EquipoRedModal from './EquipoRedModal';
import type { Arbol, ClienteRadio, EquipoRed, RouterArbol } from './tipos';

/** Verde si responde, rojo si no, gris si todavía no se revisa. */
function Punto({ responde }: { responde: boolean | null }) {
    const color = responde == null ? 'bg-slate-300 dark:bg-slate-600' : responde ? 'bg-emerald-500' : 'bg-rose-500';
    return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`} aria-label={responde == null ? 'Sin revisar' : responde ? 'Responde' : 'No responde'} />;
}

/** Señal en dBm con color: buena > -65, regular hasta -75, mala abajo. */
function Senal({ valor }: { valor: number | null }) {
    if (valor == null) return null;
    const color = valor >= -65 ? 'text-emerald-600 dark:text-emerald-400' : valor >= -75 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
    return <span className={`font-mono text-xs font-semibold ${color}`}>{valor} dBm</span>;
}

function contarClientes(equipo: EquipoRed): number {
    const delRouter = equipo.router
        ? equipo.router.clientes_sin_ap.length + equipo.router.equipos.reduce((n, e) => n + contarClientes(e), 0)
        : 0;
    return equipo.clientes.length + delRouter + equipo.hijos.reduce((n, h) => n + contarClientes(h), 0);
}

/** Todos los equipos, incluidos los de los MikroTik que cuelgan de la troncal. */
function todos(equipos: EquipoRed[]): EquipoRed[] {
    return equipos.flatMap((e) => [e, ...todos(e.hijos), ...(e.router ? todos(e.router.equipos) : [])]);
}

/** Todos los MikroTik con sus clientes sin AP, también los colgados de la troncal. */
function todosRouters(arbol: Arbol): RouterArbol[] {
    const colgados = todos(arbol.troncal).flatMap((e) => (e.router ? [e.router] : []));
    return [...arbol.routers, ...colgados];
}

function FilaCliente({ cliente }: { cliente: ClienteRadio }) {
    return (
        <li className="flex items-center gap-2 py-1.5 pl-2 text-sm">
            <Punto responde={cliente.responde} />
            <span className="font-mono text-xs text-slate-500">{cliente.contrato}</span>
            <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{cliente.nombre}</span>
            {cliente.estado === 'suspendido' && <span className="text-[11px] font-semibold text-amber-600">suspendido</span>}
            <Senal valor={cliente.senal} />
            {cliente.latencia_ms != null && <span className="w-14 text-right font-mono text-[11px] text-slate-400">{cliente.latencia_ms} ms</span>}
        </li>
    );
}

function NodoEquipo({ equipo, nivel, onEditar, onRevisar, revisando }: {
    equipo: EquipoRed;
    nivel: number;
    onEditar: (equipo: EquipoRed) => void;
    onRevisar: (equipo: EquipoRed) => void;
    revisando: number | null;
}) {
    const [abierto, setAbierto] = useState(nivel < 6);
    const clientes = contarClientes(equipo);
    const tieneDentro = equipo.hijos.length > 0 || equipo.clientes.length > 0 || Boolean(equipo.router);
    return (
        <li data-testid={`equipo-${equipo.id}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-2 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                {/* Flecha, punto y nombre juntos; en celular la señal y los botones bajan. */}
                <div className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:basis-auto">
                <button type="button" onClick={() => setAbierto((a) => !a)} disabled={!tieneDentro} aria-label={abierto ? 'Cerrar' : 'Abrir'}
                    className="flex h-6 w-6 items-center justify-center text-slate-400 disabled:opacity-0">
                    {abierto ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                </button>
                <Punto responde={equipo.responde} />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                        {equipo.nombre} <span className="text-xs font-normal text-slate-500">· {equipo.tipo_nombre}{equipo.modelo ? ` · ${equipo.modelo}` : ''}</span>
                    </p>
                    <p className="truncate text-xs text-slate-500">
                        {[
                            equipo.ip,
                            equipo.latencia_ms != null ? `${equipo.latencia_ms} ms` : equipo.responde === false ? 'no responde' : null,
                            equipo.perdida ? `${equipo.perdida}% pérdida` : null,
                            equipo.frecuencia,
                            equipo.ancho_canal ? `${equipo.ancho_canal} MHz` : null,
                            equipo.ccq != null ? `CCQ ${equipo.ccq}%` : null,
                            equipo.capacidad_tx != null ? `capacidad ${Math.round(equipo.capacidad_tx / 1000)}/${equipo.capacidad_rx != null ? Math.round(equipo.capacidad_rx / 1000) : '-'} Mbps` : null,
                            equipo.estaciones != null ? `${equipo.estaciones} estaciones` : null,
                            clientes ? `${clientes} cliente${clientes === 1 ? '' : 's'}` : null,
                        ].filter(Boolean).join(' · ')}
                    </p>
                    {equipo.airos_error && <p className="text-xs text-amber-600">{equipo.airos_error}</p>}
                </div>
                </div>
                <span className="ml-8 sm:ml-0"><Senal valor={equipo.senal} /></span>
                <div className="ml-auto flex gap-1 sm:ml-0">
                    <button type="button" aria-label={`Revisar ${equipo.nombre}`} onClick={() => onRevisar(equipo)} disabled={revisando === equipo.id}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                        <ArrowPathIcon className={`h-4 w-4 ${revisando === equipo.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button type="button" aria-label={`Abrir ${equipo.nombre}`} onClick={() => void abrirEquipoRed(equipo.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800">
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Editar ${equipo.nombre}`} onClick={() => onEditar(equipo)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                        <PencilSquareIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
            {abierto && tieneDentro && (
                <ul className="ml-2 border-l border-slate-200 pl-2 sm:ml-5 sm:pl-3 dark:border-slate-700">
                    {equipo.hijos.map((hijo) => (
                        <NodoEquipo key={hijo.id} equipo={hijo} nivel={nivel + 1} onEditar={onEditar} onRevisar={onRevisar} revisando={revisando} />
                    ))}
                    {equipo.clientes.map((c) => <FilaCliente key={`c${c.id}`} cliente={c} />)}
                    {equipo.router && (
                        <li className="mt-1">
                            <TarjetaRouter router={equipo.router} onEditar={onEditar} onRevisar={onRevisar} revisando={revisando} anidado />
                        </li>
                    )}
                </ul>
            )}
        </li>
    );
}

function TarjetaRouter({ router, onEditar, onRevisar, revisando, anidado = false }: {
    router: RouterArbol;
    onEditar: (equipo: EquipoRed) => void;
    onRevisar: (equipo: EquipoRed) => void;
    revisando: number | null;
    anidado?: boolean;
}) {
    const [verSueltos, setVerSueltos] = useState(false);
    return (
        <section className={anidado ? 'rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-200 sm:p-2 dark:bg-slate-800/40 dark:ring-slate-700' : `${TARJETA} p-2 sm:p-3`} data-testid={`router-${router.id ?? 'ninguno'}`}>
            <div className="flex items-center gap-2 px-2 pb-2">
                <ServerStackIcon className="h-5 w-5 text-blue-600" />
                <Punto responde={router.en_linea} />
                <h2 className="font-bold text-slate-900 dark:text-white">{router.nombre}</h2>
                {router.ip && <span className="font-mono text-xs text-slate-500">{router.ip}</span>}
            </div>
            {router.equipos.length === 0 && <p className="px-3 pb-2 text-sm text-slate-500">Todavía no hay equipos de red en este MikroTik.</p>}
            <ul>
                {router.equipos.map((equipo) => (
                    <NodoEquipo key={equipo.id} equipo={equipo} nivel={0} onEditar={onEditar} onRevisar={onRevisar} revisando={revisando} />
                ))}
            </ul>
            {router.clientes_sin_ap.length > 0 && (
                <div className="mt-1 px-2">
                    <button type="button" onClick={() => setVerSueltos((v) => !v)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                        {verSueltos ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                        {router.clientes_sin_ap.length} cliente{router.clientes_sin_ap.length === 1 ? '' : 's'} de radio sin AP detectado
                    </button>
                    {verSueltos && <ul className="ml-4">{router.clientes_sin_ap.map((c) => <FilaCliente key={c.id} cliente={c} />)}</ul>}
                </div>
            )}
        </section>
    );
}

/**
 * Árbol de la red inalámbrica: MikroTik → PtP → AP → clientes, con ping y
 * señal (airOS) de cada equipo. Los clientes se acomodan solos en su AP.
 */
export default function RedInalambrica() {
    const [arbol, setArbol] = useState<Arbol | null>(null);
    const [cargando, setCargando] = useState(true);
    const [editando, setEditando] = useState<EquipoRed | 'nuevo' | null>(null);
    const [revisando, setRevisando] = useState<number | null>(null);

    const cargar = useCallback(async () => {
        try {
            const { data } = await client.get<Arbol>('/red-inalambrica/arbol');
            setArbol(data);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo cargar la red'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        const primera = window.setTimeout(() => void cargar(), 0);
        return () => window.clearTimeout(primera);
    }, [cargar]);

    const revisar = async (equipo: EquipoRed) => {
        setRevisando(equipo.id);
        try {
            const { data } = await client.post<EquipoRed>(`/red-inalambrica/equipos/${equipo.id}/revisar`);
            toast[data.responde ? 'success' : 'error'](`${equipo.nombre}: ${data.responde ? `responde (${data.latencia_ms} ms)` : 'no responde'}`);
            await cargar();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo revisar'));
        } finally {
            setRevisando(null);
        }
    };

    const equipos = useMemo(() => (arbol ? todos([...arbol.troncal, ...arbol.routers.flatMap((r) => r.equipos)]) : []), [arbol]);
    const routers = useMemo(() => (arbol ? todosRouters(arbol) : []), [arbol]);
    const caidos = equipos.filter((e) => e.activo && e.responde === false).length;
    const radio = [...routers.flatMap((r) => r.clientes_sin_ap), ...equipos.flatMap((e) => e.clientes)];
    const clientes = radio.length;
    const clientesCaidos = radio.filter((c) => c.responde === false).length;

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <EncabezadoPagina
                titulo="Red inalámbrica"
                descripcion="AP, PtP y antenas de los clientes. Se revisan solos cada 10 minutos."
                acciones={<button type="button" onClick={() => setEditando('nuevo')} className={BOTON_ACCION_PRIMARIO}><PlusIcon className="h-5 w-5" /> Agregar equipo</button>}
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Metrica etiqueta="Equipos" valor={equipos.length} icono={WifiIcon} />
                <Metrica etiqueta="Equipos sin responder" valor={caidos} tono={caidos ? 'rojo' : 'verde'} icono={SignalIcon} />
                <Metrica etiqueta="Clientes de radio" valor={clientes} />
                <Metrica etiqueta="Antenas sin responder" valor={clientesCaidos} tono={clientesCaidos ? 'ambar' : 'verde'} />
            </div>

            {cargando ? (
                <p className="py-16 text-center text-sm text-slate-500">Cargando la red…</p>
            ) : !arbol || (arbol.routers.length === 0 && arbol.troncal.length === 0) ? (
                <Vacio icono={WifiIcon} titulo="Aún no hay equipos de radio" detalle="Agrega tus PtP y AP; los clientes se acomodan solos en su AP al leer los Ubiquiti." />
            ) : (
                <>
                    {arbol.troncal.length > 0 && (
                        <section className={`${TARJETA} p-3`} data-testid="troncal">
                            <h2 className="px-2 pb-2 font-bold text-slate-900 dark:text-white">Red troncal</h2>
                            <ul>
                                {arbol.troncal.map((equipo) => (
                                    <NodoEquipo key={equipo.id} equipo={equipo} nivel={0} onEditar={setEditando} onRevisar={(e) => void revisar(e)} revisando={revisando} />
                                ))}
                            </ul>
                        </section>
                    )}
                    {arbol.routers.map((router) => (
                        <TarjetaRouter key={router.id ?? 'ninguno'} router={router} onEditar={setEditando} onRevisar={(e) => void revisar(e)} revisando={revisando} />
                    ))}
                </>
            )}

            {editando && arbol && (
                <EquipoRedModal
                    equipo={editando === 'nuevo' ? null : editando}
                    equipos={equipos}
                    tipos={arbol.tipos}
                    marcas={arbol.marcas}
                    onCerrar={() => setEditando(null)}
                    onGuardado={() => { setEditando(null); void cargar(); }}
                />
            )}
        </div>
    );
}
