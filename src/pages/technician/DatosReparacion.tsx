import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    ArrowPathIcon, ArrowsRightLeftIcon, CheckBadgeIcon, ClipboardDocumentIcon, MapPinIcon, PencilSquareIcon, SignalIcon,
} from '@heroicons/react/24/outline';

import client from '../../api/axios';
import { apiErrorMessage } from '@/utils/apiError';
import SelectorOnu, { type OnuDisponible } from './SelectorOnu';
import { SERIE_MINIMA, normalizarSerie } from './onu';
import { BOTON_EXITO, BOTON_SECUNDARIO, CAMPO } from './estilo';
import FinalizarReparacion from './FinalizarReparacion';
import RevisionFalla, { type CuentaCliente } from './RevisionFalla';
import { numero, veredictoPotencia, type Diagnostico, type Revision } from './revision';

interface Ficha {
    id: number;
    cedula: string;
    telefono?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    suggested_user: string;
    suggested_pass: string;
    identificador_onu: string;
    potencia_optica?: string;
    ip_asignada?: string;
    estado?: string;
    total_deuda?: number | null;
    cuenta?: {
        estado_servicio?: string;
        explicacion?: string;
        ultimo_pago?: { fecha?: string | null; monto: number } | null;
        promesa?: { fecha?: string | null } | null;
    } | null;
}

interface Conexion {
    online: boolean;
    uptime?: string | null;
    bajada: number;
    subida: number;
    error?: string;
}

const mbps = (bps: number) => `${(bps / 1_000_000).toFixed(bps >= 10_000_000 ? 0 : 1)} Mbps`;

const colorPotencia = (valor: string) => {
    const dbm = parseFloat(valor);
    if (Number.isNaN(dbm)) return 'text-slate-400';
    if (dbm >= -25) return 'text-emerald-600 dark:text-emerald-400';
    if (dbm >= -27) return 'text-amber-500';
    return 'text-rose-600 dark:text-rose-400';
};

function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">{etiqueta}</span>
            <span className="flex min-w-0 items-center gap-1.5 text-right text-sm font-semibold text-slate-900 dark:text-white">{children}</span>
        </div>
    );
}

/**
 * Reparación en curso: lo que el técnico necesita a la mano (PPPoE, ONU,
 * potencia, conexión) para comparar antes y después, y corregir teléfono,
 * ubicación u ONU del cliente sin pedírselo a la oficina.
 */
export default function DatosReparacion({ ordenId, contrato, online, categoria, estado, onTerminada }: {
    ordenId: number;
    contrato: string;
    online: boolean;
    categoria?: string | null;
    estado: string;
    onTerminada: () => void;
}) {
    const [revision, setRevision] = useState<Revision | null>(null);
    const [diag, setDiag] = useState<Diagnostico | null>(null);
    const [revisando, setRevisando] = useState(false);
    const [ficha, setFicha] = useState<Ficha | null>(null);
    const [potencia, setPotencia] = useState<string | null>(null);
    const [conexion, setConexion] = useState<Conexion | null>(null);
    const [enVivo, setEnVivo] = useState(false);
    const [ocupado, setOcupado] = useState<string | null>(null);
    const [editando, setEditando] = useState<'telefono' | 'onu' | null>(null);
    const [telefono, setTelefono] = useState('');
    const [onus, setOnus] = useState<OnuDisponible[]>([]);
    const [onu, setOnu] = useState('');
    const [estadoVieja, setEstadoVieja] = useState('CON_FALLA');

    const cargar = useCallback(async () => {
        try {
            const { data } = await client.get<Ficha>(`/clientes/${encodeURIComponent(contrato)}/portal`);
            setFicha(data);
            setPotencia(null);
            return data;
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudieron cargar los datos del cliente'));
            return null;
        }
    }, [contrato]);

    const revisarConexion = useCallback(async (clienteId: number) => {
        try {
            const [estado, trafico] = await Promise.all([
                client.get<{ online: boolean; mensaje?: string; datos?: { uptime?: string } }>(`/network/diagnostico/conexion/${clienteId}`),
                client.get<{ velocidad_bajada?: number; velocidad_subida?: number }>(`/network/diagnostico/trafico/${clienteId}`),
            ]);
            setConexion({
                online: Boolean(estado.data.online),
                uptime: estado.data.datos?.uptime,
                bajada: Number(trafico.data.velocidad_bajada || 0),
                subida: Number(trafico.data.velocidad_subida || 0),
                error: estado.data.online ? undefined : estado.data.mensaje,
            });
        } catch {
            setConexion({ online: false, bajada: 0, subida: 0, error: 'No se pudo consultar el MikroTik' });
        }
    }, []);

    const cargarRevision = useCallback(async () => {
        try {
            const { data } = await client.get<Revision>(`/ordenes/${ordenId}/revision`);
            setRevision(data);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo cargar la revisión de la falla'));
        }
    }, [ordenId]);

    useEffect(() => {
        if (!online || !categoria) return;
        const inicial = window.setTimeout(() => void cargarRevision(), 0);
        return () => window.clearTimeout(inicial);
    }, [online, categoria, cargarRevision]);

    // OLT y MikroTik en vivo; queda guardado en la orden como prueba de cómo quedó.
    const revisar = async () => {
        setRevisando(true);
        try {
            const { data } = await client.post<Diagnostico>(`/soporte/incidencias/${ordenId}/diagnosticar`);
            setDiag(data);
            const rx = numero(data.olt.potencia_rx_dbm);
            if (rx !== null) setPotencia(rx.toFixed(2));
            if (data.mikrotik?.disponible) {
                setConexion((previo) => ({
                    online: Boolean(data.mikrotik?.pppoe_online),
                    uptime: data.mikrotik?.uptime,
                    bajada: Number(data.mikrotik?.trafico_bajada_bps || 0),
                    subida: Number(data.mikrotik?.trafico_subida_bps || 0),
                    error: previo?.error,
                }));
            }
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo revisar la OLT y el MikroTik'));
        } finally {
            setRevisando(false);
        }
    };

    useEffect(() => {
        if (!online) return;
        let vigente = true;
        void cargar().then((data) => { if (vigente && data) void revisarConexion(data.id); });
        return () => { vigente = false; };
    }, [online, cargar, revisarConexion]);

    // Consumo en vivo cada 3 s mientras esté encendido.
    const clienteId = ficha?.id;
    useEffect(() => {
        if (!enVivo || !clienteId) return;
        const intervalo = window.setInterval(() => {
            client.get<{ velocidad_bajada?: number; velocidad_subida?: number }>(`/network/diagnostico/trafico/${clienteId}`)
                .then(({ data }) => setConexion((previo) => previo && {
                    ...previo, bajada: Number(data.velocidad_bajada || 0), subida: Number(data.velocidad_subida || 0),
                }))
                .catch(() => setEnVivo(false));
        }, 3000);
        return () => window.clearInterval(intervalo);
    }, [enVivo, clienteId]);

    if (!online) {
        return <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Conéctate a internet para ver los datos del cliente.</p>;
    }
    if (!ficha) {
        return <p className="text-xs text-slate-400">Cargando datos del cliente…</p>;
    }

    const leerPotencia = async () => {
        setOcupado('potencia');
        try {
            const { data } = await client.get<{ data: { potencia: string } }>(`/olts/diagnostico-cliente/${ficha.id}`);
            setPotencia(data.data.potencia);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo consultar la OLT'));
        } finally {
            setOcupado(null);
        }
    };

    const copiar = (texto: string) => {
        void navigator.clipboard?.writeText(texto).then(() => toast.success('Copiado'), () => undefined);
    };

    const guardarContacto = async (datos: { telefono?: string; latitud?: number; longitud?: number }, aviso: string) => {
        setOcupado('contacto');
        try {
            await client.patch(`/ordenes/${ordenId}/cliente-contacto`, datos);
            toast.success(aviso);
            setEditando(null);
            await cargar();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo guardar'));
        } finally {
            setOcupado(null);
        }
    };

    const guardarUbicacion = () => {
        if (!navigator.geolocation) {
            toast.error('Tu celular no tiene GPS');
            return;
        }
        setOcupado('contacto');
        navigator.geolocation.getCurrentPosition(
            (pos) => void guardarContacto({ latitud: pos.coords.latitude, longitud: pos.coords.longitude }, 'Ubicación guardada'),
            () => { setOcupado(null); toast.error('Activa la ubicación del celular'); },
            { enableHighAccuracy: true, timeout: 15000 },
        );
    };

    const abrirCambioOnu = async () => {
        setEditando('onu');
        setOnu('');
        try {
            const { data } = await client.get<OnuDisponible[]>(`/ordenes/${ordenId}/onus-disponibles`);
            setOnus(data);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo cargar el inventario'));
        }
    };

    const elegida = onus.find((o) => normalizarSerie(o.identificador) === normalizarSerie(onu));
    const cambiarOnu = async () => {
        if (!elegida && normalizarSerie(onu).length < SERIE_MINIMA) {
            toast.error('Escribe, escanea o elige el serial/MAC de la ONU nueva');
            return;
        }
        setOcupado('onu');
        try {
            const { data } = await client.post<{ onu: string }>(`/ordenes/${ordenId}/cambiar-onu`, {
                estado_vieja_onu: estadoVieja,
                ...(elegida ? { onu_id: elegida.id } : { onu_identificador: onu.trim() }),
            });
            toast.success(`ONU cambiada: ${data.onu}`);
            setEditando(null);
            await cargar();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo cambiar la ONU'), { duration: 8000 });
        } finally {
            setOcupado(null);
        }
    };

    const valorPotencia = String(potencia || ficha.potencia_optica || '').replace(/\s*dBm\s*$/i, '');
    const tieneUbicacion = ficha.latitud != null && ficha.longitud != null;
    const cuenta: CuentaCliente = {
        estado: ficha.cuenta?.estado_servicio || ficha.estado || 'activo',
        deuda: Number(ficha.total_deuda ?? 0),
        explicacion: ficha.cuenta?.explicacion,
        ultimoPago: ficha.cuenta?.ultimo_pago ? `$${ficha.cuenta.ultimo_pago.monto.toLocaleString('es-MX')} · ${ficha.cuenta.ultimo_pago.fecha ?? ''}` : null,
        promesa: ficha.cuenta?.promesa?.fecha ?? null,
    };
    // Fibra: no se cierra en rojo sin explicar por qué se deja así.
    const veredicto = diag && (categoria === 'potencia_baja' || categoria === 'cable_roto')
        ? veredictoPotencia(revision?.potencia_antes?.rx ?? null, numero(diag.olt.potencia_rx_dbm), diag.olt.disponible ? diag.olt.onu_online : null)
        : null;

    return (
        <div className="space-y-3">
            {categoria && revision && (
                <RevisionFalla
                    ordenId={ordenId}
                    revision={revision}
                    diag={diag}
                    revisando={revisando}
                    cuenta={cuenta}
                    onRevisar={() => void revisar()}
                    onRecargar={() => void cargarRevision()}
                    latitud={ficha.latitud}
                    longitud={ficha.longitud}
                />
            )}
            <section aria-label="Datos del cliente" className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Datos del cliente</p>
                    <Link to={`/tech/cliente/${encodeURIComponent(ficha.cedula)}`} className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Ficha completa</Link>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    <Fila etiqueta="Usuario PPPoE">
                        <span className="select-all truncate font-mono text-xs">{ficha.suggested_user || '—'}</span>
                        {ficha.suggested_user && <button type="button" aria-label="Copiar usuario PPPoE" onClick={() => copiar(ficha.suggested_user)}><ClipboardDocumentIcon className="h-4 w-4 text-slate-400" /></button>}
                    </Fila>
                    <Fila etiqueta="Contraseña">
                        <span className="select-all truncate font-mono text-xs">{ficha.suggested_pass || '—'}</span>
                        {ficha.suggested_pass && <button type="button" aria-label="Copiar contraseña PPPoE" onClick={() => copiar(ficha.suggested_pass)}><ClipboardDocumentIcon className="h-4 w-4 text-slate-400" /></button>}
                    </Fila>
                    <Fila etiqueta="ONU"><span className="truncate font-mono text-xs">{ficha.identificador_onu || 'Sin ONU'}</span></Fila>
                    <Fila etiqueta="Potencia">
                        <span className={colorPotencia(valorPotencia)}>{valorPotencia || '--'} dBm</span>
                        <button type="button" aria-label="Leer potencia en vivo" disabled={ocupado !== null} onClick={() => void leerPotencia()}>
                            <SignalIcon className={`h-4 w-4 text-blue-600 ${ocupado === 'potencia' ? 'animate-pulse' : ''}`} />
                        </button>
                    </Fila>
                    <Fila etiqueta="Conexión">
                        {!conexion ? <span className="text-xs text-slate-400">Consultando…</span> : (
                            <span className={`text-xs ${conexion.online ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {conexion.online ? `Conectado${conexion.uptime ? ` · ${conexion.uptime}` : ''}` : 'Sin sesión PPPoE'}
                            </span>
                        )}
                        <button type="button" aria-label="Revisar conexión" onClick={() => void revisarConexion(ficha.id)}>
                            <ArrowPathIcon className="h-4 w-4 text-slate-400" />
                        </button>
                    </Fila>
                    {conexion?.online && (
                        <Fila etiqueta="Consumo">
                            <span className="font-mono text-xs">↓ {mbps(conexion.bajada)} · ↑ {mbps(conexion.subida)}</span>
                            <button type="button" onClick={() => setEnVivo((v) => !v)} className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${enVivo ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                                {enVivo ? 'En vivo' : 'Ver en vivo'}
                            </button>
                        </Fila>
                    )}
                    <Fila etiqueta="Teléfono">
                        <span className={ficha.telefono ? '' : 'text-xs text-amber-600'}>{ficha.telefono || 'Sin teléfono'}</span>
                        <button type="button" aria-label="Editar teléfono" onClick={() => { setTelefono(ficha.telefono || ''); setEditando(editando === 'telefono' ? null : 'telefono'); }}>
                            <PencilSquareIcon className="h-4 w-4 text-blue-600" />
                        </button>
                    </Fila>
                    <Fila etiqueta="Ubicación">
                        <span className={tieneUbicacion ? 'text-xs text-emerald-600 dark:text-emerald-400' : 'text-xs text-amber-600'}>{tieneUbicacion ? 'Guardada' : 'Sin ubicación'}</span>
                    </Fila>
                </div>

                {editando === 'telefono' && (
                    <div className="flex gap-2">
                        <input aria-label="Teléfono del cliente" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="10 dígitos" className={CAMPO} />
                        <button type="button" disabled={ocupado !== null} onClick={() => void guardarContacto({ telefono }, 'Teléfono guardado')} className={`${BOTON_SECUNDARIO} shrink-0 text-blue-700 dark:text-blue-300`}>Guardar</button>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={ocupado !== null} onClick={guardarUbicacion} className={BOTON_SECUNDARIO}>
                        <MapPinIcon className="h-4 w-4 text-blue-600" /> {tieneUbicacion ? 'Corregir ubicación' : 'Guardar ubicación'}
                    </button>
                    <button type="button" disabled={ocupado !== null} onClick={() => editando === 'onu' ? setEditando(null) : void abrirCambioOnu()} className={BOTON_SECUNDARIO}>
                        <ArrowsRightLeftIcon className="h-4 w-4 text-blue-600" /> Cambiar ONU
                    </button>
                </div>
                {!tieneUbicacion && <p className="text-[11px] text-slate-400">Guarda la ubicación estando en el domicilio del cliente.</p>}

                {editando === 'onu' && (
                    <div className="space-y-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                        <SelectorOnu onus={onus} valor={onu} elegida={elegida} onCambiar={setOnu} etiqueta="ONU nueva" al="guardar" />
                        <select aria-label="Cómo quedó la ONU retirada" value={estadoVieja} onChange={(e) => setEstadoVieja(e.target.value)} className={CAMPO}>
                            <option value="CON_FALLA">La ONU retirada tiene falla</option>
                            <option value="DISPONIBLE">La ONU retirada funciona (vuelve a inventario)</option>
                        </select>
                        <button type="button" disabled={ocupado !== null} onClick={() => void cambiarOnu()} className={BOTON_EXITO}>
                            <CheckBadgeIcon className="h-4 w-4" /> {ocupado === 'onu' ? 'Guardando…' : 'Guardar cambio de ONU'}
                        </button>
                    </div>
                )}
            </section>
            {categoria && estado === 'trabajando' && (
                <FinalizarReparacion
                    ordenId={ordenId}
                    online={online}
                    onTerminada={onTerminada}
                    diagnostico={diag}
                    verificando={revisando}
                    onVerificar={() => void revisar()}
                    alerta={veredicto?.tono === 'mal' ? `${veredicto.texto} Si la dejas así, explica por qué.` : null}
                />
            )}
        </div>
    );
}
