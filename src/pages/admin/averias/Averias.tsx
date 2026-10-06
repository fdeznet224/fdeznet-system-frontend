import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    MapPinIcon,
    MegaphoneIcon,
    CubeIcon,
    SignalIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';
import { readSessionRole } from '@/utils/roles';

interface Zona { id: number; nombre: string }
interface Caja {
    id: number;
    nombre: string;
    zona_id: number;
    zona_nombre?: string | null;
    olt_id?: number | null;
    olt_nombre?: string | null;
    puerto_olt?: number | null;
}
interface Sugerida { id: number; nombre: string; distancia_m: number; puertos_libres: number; posicion_estimada: boolean }
interface SinNap {
    servicio_id: number;
    nombre: string | null;
    contrato: string | null;
    alias: string;
    direccion: string | null;
    zona_id: number | null;
    zona_nombre: string | null;
    tiene_gps: boolean;
    sugeridas: Sugerida[];
}

type Pestana = 'aviso' | 'sin-nap' | 'senal';
type Alcance = 'nap' | 'olt' | 'zona';

const campo = 'w-full min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white';
const etiqueta = 'mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400';
const tarjeta = 'rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#12141a] sm:p-5';

const distancia = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);

/** Avisar a los clientes de una avería por caja, puerto de OLT o zona. */
function AvisoAveria({ cajas, zonas }: { cajas: Caja[]; zonas: Zona[] }) {
    const [alcance, setAlcance] = useState<Alcance>('nap');
    const [cajaId, setCajaId] = useState('');
    const [oltPuerto, setOltPuerto] = useState('');
    const [zonaId, setZonaId] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [vista, setVista] = useState<{ total: number; clientes: string[] } | null>(null);
    const [enviando, setEnviando] = useState(false);

    // Puertos PON que tienen cajas registradas: "OLT · puerto N".
    const puertosOlt = useMemo(() => {
        const mapa = new Map<string, string>();
        cajas.forEach((c) => {
            if (c.olt_id && c.puerto_olt != null) {
                mapa.set(`${c.olt_id}:${c.puerto_olt}`, `${c.olt_nombre || `OLT ${c.olt_id}`} · puerto ${c.puerto_olt}`);
            }
        });
        return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es', { numeric: true }));
    }, [cajas]);

    const filtro = useMemo(() => {
        if (alcance === 'nap' && cajaId) return { caja_nap_id: Number(cajaId) };
        if (alcance === 'olt' && oltPuerto) {
            const [olt, puerto] = oltPuerto.split(':').map(Number);
            return { olt_id: olt, puerto_olt: puerto };
        }
        if (alcance === 'zona' && zonaId) return { zona_id: Number(zonaId) };
        return null;
    }, [alcance, cajaId, oltPuerto, zonaId]);

    useEffect(() => {
        if (!filtro) return;
        let vigente = true;
        client.post<{ total: number; clientes: string[]; mensaje_sugerido: string }>('/infraestructura/avisos-averia/vista-previa', filtro)
            .then(({ data }) => {
                if (!vigente) return;
                setVista({ total: data.total, clientes: data.clientes });
                setMensaje((actual) => actual || data.mensaje_sugerido);
            })
            .catch((error) => { if (vigente) toast.error(apiErrorMessage(error, 'No se pudo calcular a quién avisar')); });
        return () => { vigente = false; };
    }, [filtro]);

    const enviar = async () => {
        if (!filtro || !vista?.total) return;
        if (!confirm(`¿Mandar el aviso por WhatsApp a ${vista.total} clientes?`)) return;
        setEnviando(true);
        try {
            const { data } = await client.post<{ total_mensajes: number }>('/infraestructura/avisos-averia', { ...filtro, mensaje });
            toast.success(`Aviso en camino a ${data.total_mensajes} clientes`);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo mandar el aviso'));
        } finally {
            setEnviando(false);
        }
    };

    const opciones: [Alcance, string][] = [['nap', 'Caja NAP'], ['olt', 'Puerto de OLT'], ['zona', 'Zona']];

    return (
        <div className="space-y-4">
            <div className={tarjeta}>
                <span className={etiqueta}>¿Dónde es la falla?</span>
                <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
                    {opciones.map(([valor, texto]) => (
                        <button
                            key={valor}
                            type="button"
                            aria-pressed={alcance === valor}
                            onClick={() => { setAlcance(valor); setVista(null); }}
                            className={`min-h-10 rounded-xl text-xs font-black ${alcance === valor ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-500'}`}
                        >
                            {texto}
                        </button>
                    ))}
                </div>
                <div className="mt-3">
                    {alcance === 'nap' && (
                        <select aria-label="Caja NAP con falla" value={cajaId} onChange={(e) => { setCajaId(e.target.value); setVista(null); }} className={campo}>
                            <option value="">Elige la caja</option>
                            {cajas.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.zona_nombre ? ` · ${c.zona_nombre}` : ''}</option>)}
                        </select>
                    )}
                    {alcance === 'olt' && (
                        <select aria-label="Puerto de OLT con falla" value={oltPuerto} onChange={(e) => { setOltPuerto(e.target.value); setVista(null); }} className={campo}>
                            <option value="">Elige el puerto</option>
                            {puertosOlt.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                        </select>
                    )}
                    {alcance === 'zona' && (
                        <select aria-label="Zona con falla" value={zonaId} onChange={(e) => { setZonaId(e.target.value); setVista(null); }} className={campo}>
                            <option value="">Elige la zona</option>
                            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                        </select>
                    )}
                </div>
                {alcance !== 'zona' && (
                    <p className="mt-2 text-[11px] text-slate-500">Solo llega a los clientes que tienen su caja NAP asignada. Complétalas en la pestaña «Sin caja».</p>
                )}
            </div>

            {vista && (
                <div className={tarjeta}>
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                        {vista.total === 0 ? 'Ningún cliente con teléfono en esa falla' : `Le llegará a ${vista.total} cliente${vista.total === 1 ? '' : 's'}`}
                    </p>
                    {vista.clientes.length > 0 && (
                        <p className="mt-1 line-clamp-3 text-xs text-slate-500">{vista.clientes.join(', ')}{vista.total > vista.clientes.length ? '…' : ''}</p>
                    )}
                    <label className="mt-3 block">
                        <span className={etiqueta}>Mensaje ({'{nombre}'} pone el nombre del cliente)</span>
                        <textarea value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={5} maxLength={1000} className={`${campo} py-3 font-medium`} />
                    </label>
                    <button
                        type="button"
                        disabled={!vista.total || enviando || mensaje.trim().length < 10}
                        onClick={() => void enviar()}
                        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40"
                    >
                        <MegaphoneIcon className="h-5 w-5" /> {enviando ? 'Enviando…' : 'Mandar aviso por WhatsApp'}
                    </button>
                </div>
            )}
        </div>
    );
}

/** Clientes vigentes sin caja NAP: confirmar la sugerida o elegir otra. */
function ClientesSinNap({ cajas, zonas }: { cajas: Caja[]; zonas: Zona[] }) {
    const [zonaId, setZonaId] = useState('');
    const [lista, setLista] = useState<SinNap[] | null>(null);
    const [elegidas, setElegidas] = useState<Record<number, string>>({});
    const [soloConGps, setSoloConGps] = useState(false);

    const cargar = useCallback(async (zona: string) => {
        setLista(null);
        try {
            const { data } = await client.get<SinNap[]>(`/infraestructura/naps/sin-asignar${zona ? `?zona_id=${zona}` : ''}`);
            setLista(data);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo cargar la lista'));
            setLista([]);
        }
    }, []);

    useEffect(() => {
        const inicial = window.setTimeout(() => void cargar(zonaId), 0);
        return () => window.clearTimeout(inicial);
    }, [cargar, zonaId]);

    const asignar = async (item: SinNap, cajaId: number) => {
        try {
            await client.post('/infraestructura/naps/asignar', { servicio_id: item.servicio_id, caja_nap_id: cajaId });
            setLista((actual) => (actual || []).filter((s) => s.servicio_id !== item.servicio_id));
            toast.success(`${item.nombre} quedó en su caja`);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo asignar la caja'));
        }
    };

    const visibles = (lista || []).filter((s) => !soloConGps || s.tiene_gps);
    const sinGps = (lista || []).filter((s) => !s.tiene_gps).length;

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select aria-label="Zona" value={zonaId} onChange={(e) => setZonaId(e.target.value)} className={`${campo} sm:max-w-xs`}>
                    <option value="">Todas las zonas</option>
                    {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                </select>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={soloConGps} onChange={(e) => setSoloConGps(e.target.checked)} className="h-4 w-4 rounded" />
                    Solo los que tienen GPS
                </label>
            </div>
            {lista && (
                <p className="text-xs font-semibold text-slate-500">
                    {lista.length === 0
                        ? 'Todos los clientes de esta zona ya tienen caja NAP.'
                        : `${lista.length} sin caja${sinGps ? ` · ${sinGps} sin GPS (elige su caja a mano)` : ''}`}
                </p>
            )}
            {!lista && <p className="text-sm text-slate-500">Cargando clientes…</p>}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {visibles.map((item) => {
                    const sugerida = item.sugeridas[0];
                    const otrasDeLaZona = cajas.filter((c) => !item.zona_id || c.zona_id === item.zona_id);
                    const elegida = elegidas[item.servicio_id] || '';
                    return (
                        <article key={item.servicio_id} className={`min-w-0 ${tarjeta}`}>
                            <div className="min-w-0">
                                <h3 className="truncate text-base font-black text-slate-900 dark:text-white">{item.nombre}</h3>
                                <p className="text-xs text-slate-500">Contrato {item.contrato}{item.alias !== 'Principal' ? ` · ${item.alias}` : ''}{item.zona_nombre ? ` · ${item.zona_nombre}` : ''}</p>
                                <p className="mt-1 flex items-start gap-1 text-xs text-slate-500"><MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span className="line-clamp-2">{item.direccion || 'Sin dirección'}</span></p>
                            </div>
                            {sugerida ? (
                                <button
                                    type="button"
                                    onClick={() => void asignar(item, sugerida.id)}
                                    className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-left dark:border-emerald-500/40 dark:bg-emerald-500/10"
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate text-xs font-black text-emerald-800 dark:text-emerald-300">Sugerida · {sugerida.nombre}</span>
                                        <span className="block text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                                            {sugerida.posicion_estimada ? '≈ ' : ''}{distancia(sugerida.distancia_m)} · {sugerida.puertos_libres} libres
                                        </span>
                                    </span>
                                    <span className="flex shrink-0 items-center gap-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                                        <CheckCircleIcon className="h-5 w-5" /> Usar
                                    </span>
                                </button>
                            ) : (
                                <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                    <ExclamationTriangleIcon className="h-4 w-4 shrink-0" /> Sin GPS: elige su caja a mano
                                </p>
                            )}
                            <div className="mt-2 flex gap-2">
                                <select
                                    aria-label={`Otra caja para ${item.nombre}`}
                                    value={elegida}
                                    onChange={(e) => setElegidas({ ...elegidas, [item.servicio_id]: e.target.value })}
                                    className={`${campo} min-w-0 flex-1`}
                                >
                                    <option value="">Otra caja…</option>
                                    {(item.sugeridas.length ? item.sugeridas.slice(1).map((s) => ({ id: s.id, nombre: `${s.nombre} · ${distancia(s.distancia_m)}` })) : [])
                                        .concat(otrasDeLaZona.filter((c) => !item.sugeridas.some((s) => s.id === c.id)).map((c) => ({ id: c.id, nombre: c.nombre })))
                                        .map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                                <button
                                    type="button"
                                    disabled={!elegida}
                                    onClick={() => void asignar(item, Number(elegida))}
                                    className="min-h-12 shrink-0 rounded-xl bg-indigo-600 px-4 text-xs font-black text-white disabled:opacity-40"
                                >
                                    Asignar
                                </button>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
}

interface SenalDebil {
    servicio_id: number;
    nombre: string | null;
    contrato: string | null;
    caja_nap: string | null;
    rx: number;
    critica: boolean;
    fecha: string | null;
}

/** Clientes con la señal óptica baja según la última lectura (cada noche a las 2:00). */
function SenalDebilLista() {
    const [lista, setLista] = useState<SenalDebil[] | null>(null);
    const [leyendo, setLeyendo] = useState(false);
    const esAdmin = readSessionRole() === 'admin';

    const cargar = useCallback(async () => {
        try {
            const { data } = await client.get<SenalDebil[]>('/ftth/senal-debil');
            setLista(data);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo cargar la señal'));
            setLista([]);
        }
    }, []);

    useEffect(() => {
        const inicial = window.setTimeout(() => void cargar(), 0);
        return () => window.clearTimeout(inicial);
    }, [cargar]);

    const leerAhora = async () => {
        setLeyendo(true);
        const aviso = toast.loading('Leyendo todas las OLT…');
        try {
            const { data } = await client.post<{ leidas: number; empeoraron: number; olts_con_error: string[] }>('/ftth/senal/leer');
            toast.success(
                `${data.leidas} lecturas · ${data.empeoraron} empeoraron${data.olts_con_error.length ? ` · sin respuesta: ${data.olts_con_error.join(', ')}` : ''}`,
                { id: aviso, duration: 6000 },
            );
            await cargar();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo leer la señal'), { id: aviso });
        } finally {
            setLeyendo(false);
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-slate-500">
                    Se lee cada noche a las 2:00 y se avisa por WhatsApp de las que empeoran. Debajo de -27 dBm la conexión empieza a fallar.
                </p>
                {esAdmin && (
                    <button type="button" disabled={leyendo} onClick={() => void leerAhora()} className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                        <ArrowPathIcon className={`h-4 w-4 ${leyendo ? 'animate-spin' : ''}`} /> Leer ahora
                    </button>
                )}
            </div>
            {!lista && <p className="text-sm text-slate-500">Cargando…</p>}
            {lista && lista.length === 0 && (
                <p className="rounded-[1.5rem] border border-dashed border-slate-300 py-12 text-center text-sm font-bold text-slate-500 dark:border-slate-700">Ningún cliente con señal baja en la última lectura.</p>
            )}
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {(lista || []).map((item) => (
                    <div key={item.servicio_id} className={`flex min-w-0 items-center justify-between gap-3 ${tarjeta}`}>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900 dark:text-white">{item.nombre}</p>
                            <p className="truncate text-xs text-slate-500">Contrato {item.contrato}{item.caja_nap ? ` · ${item.caja_nap}` : ''}</p>
                        </div>
                        <span className={`shrink-0 rounded-xl px-3 py-1.5 font-mono text-sm font-black ${item.critica
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
                            {item.rx.toFixed(2)} dBm
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Averías y cajas NAP: avisar a los afectados y completar las cajas de los clientes. */
export default function Averias() {
    const [params, setParams] = useSearchParams();
    const pestana: Pestana = params.get('tab') === 'sin-nap' ? 'sin-nap' : params.get('tab') === 'senal' ? 'senal' : 'aviso';
    const [cajas, setCajas] = useState<Caja[]>([]);
    const [zonas, setZonas] = useState<Zona[]>([]);

    useEffect(() => {
        Promise.all([
            client.get<Caja[]>('/infraestructura/naps'),
            client.get<Zona[]>('/zonas/'),
        ])
            .then(([resCajas, resZonas]) => { setCajas(resCajas.data); setZonas(resZonas.data); })
            .catch(() => toast.error('No se pudieron cargar las cajas y zonas'));
    }, []);

    const pestanas: [Pestana, string, typeof MegaphoneIcon][] = [
        ['aviso', 'Avería', MegaphoneIcon],
        ['sin-nap', 'Sin caja', CubeIcon],
        ['senal', 'Señal débil', SignalIcon],
    ];

    return (
        <div className="mx-auto max-w-7xl space-y-4 p-4 md:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-xl font-black tracking-tight text-slate-800 dark:text-white md:text-2xl">Averías y cajas NAP</h1>
                <div role="tablist" aria-label="Secciones" className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-[#12141a] sm:w-[28rem]">
                    {pestanas.map(([valor, texto, Icono]) => (
                        <button
                            key={valor}
                            type="button"
                            role="tab"
                            aria-selected={pestana === valor}
                            onClick={() => setParams(valor === 'aviso' ? {} : { tab: valor }, { replace: true })}
                            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-1 text-[11px] font-black uppercase tracking-wide sm:text-xs ${pestana === valor ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'}`}
                        >
                            <Icono className="h-4 w-4" /> {texto}
                        </button>
                    ))}
                </div>
            </div>
            {pestana === 'aviso' && <AvisoAveria cajas={cajas} zonas={zonas} />}
            {pestana === 'sin-nap' && <ClientesSinNap cajas={cajas} zonas={zonas} />}
            {pestana === 'senal' && <SenalDebilLista />}
        </div>
    );
}
