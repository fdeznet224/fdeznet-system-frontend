import { useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
    ArrowLeftIcon, SignalIcon, ArrowPathIcon, CalendarDaysIcon,
    KeyIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    XMarkIcon, PaperAirplaneIcon, PhoneIcon,
} from '@heroicons/react/24/outline';
import { rutaEnMaps } from '@/utils/mapas';
import { apiErrorMessage } from '@/utils/apiError';
import { BOTON_EXITO, BOTON_PRIMARIO, BOTON_SECUNDARIO, TARJETA, TITULO_SECCION } from './estilo';

interface TechData {
    id: number;
    nombre: string;
    cedula: string;
    telefono: string;
    direccion: string;
    latitud?: number | null;
    longitud?: number | null;
    estado: string;
    ip_asignada: string;
    is_online: boolean;
    nap_nombre: string;
    puerto_nap: number | null;
    router_nombre: string;
    plan_nombre: string;
    precio_plan: number;
    velocidad_bajada: number;
    fecha_corte: string | null;
    // Chat y llamada: solo con sus clientes asignados.
    es_cliente_asignado?: boolean;
    puede_reiniciar_onu?: boolean;
    total_deuda: number | null;
    facturas_pendientes: number | null;
    cuenta?: {
        estado_servicio: string;
        explicacion: string;
        adeudos: { concepto: string; monto: number; vence?: string | null; vencido: boolean }[];
        ultimo_pago?: { fecha?: string | null; monto: number; metodo?: string | null } | null;
        promesa?: { fecha?: string | null } | null;
        suspendido_desde?: string | null;
    } | null;
    suggested_user: string;
    suggested_pass: string;
    identificador_onu: string;
    olt_nombre: string;
    potencia_optica?: string;
}

interface ChatMessage {
    id?: number;
    direccion: string;
    mensaje: string;
    fecha: string;
}

// Sesión PPPoE y consumo en el MikroTik: sirve también sin ONU (radio enlace).
interface EstadoConexion {
    online: boolean;
    uptime?: string | null;
    ip?: string | null;
    bajada: number;
    subida: number;
    error?: string;
}

const mbps = (bps: number) => `${(bps / 1_000_000).toFixed(bps >= 10_000_000 ? 0 : 1)} Mbps`;

interface DiagnosticoResponse {
    data: {
        potencia: string;
        recomendacion: string;
    };
}

function getErrorMessage(error: unknown, fallback: string) {
    return apiErrorMessage(error, fallback);
}

/** Dato de la ficha en una fila: etiqueta a la izquierda, valor a la derecha. */
function Fila({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">{etiqueta}</span>
            <span className="min-w-0 truncate text-right text-sm font-semibold text-slate-900 dark:text-white">{children}</span>
        </div>
    );
}

export default function ClientTechView() {
    const { cedula } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<TechData | null>(null);
    const [loading, setLoading] = useState(true);

    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [reiniciando, setReiniciando] = useState(false);
    const [enLinea, setEnLinea] = useState<EstadoConexion | null>(null);
    const [revisandoConexion, setRevisandoConexion] = useState(false);
    const [consumoEnVivo, setConsumoEnVivo] = useState(false);
    const [liveSignal, setLiveSignal] = useState<{ potencia: string, mensaje: string } | null>(null);

    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const clienteId = data?.id;

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await client.get<TechData>(`/clientes/${encodeURIComponent(cedula ?? '')}/portal`);
                setData(res.data);
            } catch {
                toast.error("Cliente no encontrado");
                navigate('/tech/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [cedula, navigate]);

    const revisarConexion = useCallback(async (clienteIdConexion: number) => {
        setRevisandoConexion(true);
        try {
            const [conexion, trafico] = await Promise.all([
                client.get<{ online: boolean; mensaje?: string; datos?: { uptime?: string; ip_actual?: string } }>(`/network/diagnostico/conexion/${clienteIdConexion}`),
                client.get<{ velocidad_bajada?: number; velocidad_subida?: number }>(`/network/diagnostico/trafico/${clienteIdConexion}`),
            ]);
            setEnLinea({
                online: Boolean(conexion.data.online),
                uptime: conexion.data.datos?.uptime,
                ip: conexion.data.datos?.ip_actual,
                bajada: Number(trafico.data.velocidad_bajada || 0),
                subida: Number(trafico.data.velocidad_subida || 0),
                error: conexion.data.online ? undefined : conexion.data.mensaje,
            });
        } catch {
            setEnLinea({ online: false, bajada: 0, subida: 0, error: 'No se pudo consultar el MikroTik' });
        } finally {
            setRevisandoConexion(false);
        }
    }, []);

    // Al abrir la ficha se revisa una vez la conexión.
    const idConexion = data?.id;
    useEffect(() => {
        if (!idConexion) return;
        const inicial = window.setTimeout(() => void revisarConexion(idConexion), 0);
        return () => window.clearTimeout(inicial);
    }, [idConexion, revisarConexion]);

    // Consumo en vivo: solo el tráfico, cada 3 s, mientras esté encendido.
    useEffect(() => {
        if (!consumoEnVivo || !idConexion) return;
        let activo = true;
        const leer = async () => {
            try {
                const { data: trafico } = await client.get<{ velocidad_bajada?: number; velocidad_subida?: number }>(`/network/diagnostico/trafico/${idConexion}`);
                if (!activo) return;
                setEnLinea((previo) => previo && {
                    ...previo,
                    bajada: Number(trafico.velocidad_bajada || 0),
                    subida: Number(trafico.velocidad_subida || 0),
                });
            } catch {
                if (activo) setConsumoEnVivo(false);
            }
        };
        const intervalo = window.setInterval(() => void leer(), 3000);
        return () => {
            activo = false;
            window.clearInterval(intervalo);
        };
    }, [consumoEnVivo, idConexion]);

    // Reinicio normal de la ONU (no borra su configuración): el cliente se queda sin internet 1 a 2 minutos.
    const handleReiniciarOnu = async () => {
        if (!data) return;
        if (!window.confirm(`¿Reiniciar la ONU de ${data.nombre}?\n\nEs un reinicio normal, no borra su configuración. Se queda sin internet 1 a 2 minutos.`)) return;
        setReiniciando(true);
        try {
            await client.post(`/clientes/${data.id}/reiniciar-onu`);
            toast.success('La ONU se está reiniciando; vuelve en 1 a 2 minutos.');
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo reiniciar la ONU'));
        } finally {
            setReiniciando(false);
        }
    };

    const handleDiagnosticoVivo = async () => {
        if (!data?.id) return;
        setIsDiagnosing(true);
        const t = toast.loading("Consultando OLT...");
        try {
            const res = await client.get<DiagnosticoResponse>(`/olts/diagnostico-cliente/${data.id}`);
            const diag = res.data.data;
            setLiveSignal({ potencia: diag.potencia, mensaje: diag.recomendacion });
            toast.success("Señal actualizada", { id: t });
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, "Error al conectar con OLT"), { id: t });
        } finally {
            setIsDiagnosing(false);
        }
    };

    const loadChat = useCallback(async () => {
        if (!clienteId) return;
        try {
            const res = await client.get<ChatMessage[]>(`/whatsapp/chat/${clienteId}`);
            setChatMessages(res.data);
        } catch (error) { console.error(error); }
    }, [clienteId]);

    useEffect(() => {
        if (!isChatOpen || !clienteId) return;
        const initialLoad = setTimeout(() => void loadChat(), 0);
        const interval = setInterval(() => void loadChat(), 3000);
        return () => {
            clearTimeout(initialLoad);
            clearInterval(interval);
        };
    }, [isChatOpen, clienteId, loadChat]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatMessages, isChatOpen]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !data?.id) return;
        setIsSending(true);
        try {
            await client.post(`/whatsapp/chat/${data.id}/enviar`, { mensaje: newMessage });
            setNewMessage('');
            await loadChat();
        } catch { toast.error("Error al enviar"); }
        finally { setIsSending(false); }
    };

    const getSignalColor = (dbm: string) => {
        const val = parseFloat(dbm.replace(' dBm', ''));
        if (isNaN(val)) return 'text-slate-400 dark:text-slate-500';
        if (val >= -25) return 'text-emerald-600 dark:text-emerald-500';
        if (val >= -27) return 'text-amber-500';
        return 'text-rose-600 dark:text-rose-500';
    };

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
        </div>
    );

    if (!data) return null;

    // Chat y llamada: solo con sus clientes asignados. El estado de cuenta lo ve siempre.
    const esSuCliente = data.es_cliente_asignado !== false;
    const cuenta = data.cuenta;
    const rutaCliente = rutaEnMaps({ latitud: data.latitud, longitud: data.longitud, direccion: data.direccion });
    const deuda = Number(data.total_deuda ?? 0);
    const tieneFacturasVencidas = (data.facturas_pendientes ?? 0) > 0;
    const estaSuspendido = data.estado === 'suspendido' || data.estado === 'cortado';
    const velocidadMb = data.velocidad_bajada / 1024;
    // La sesión PPPoE en vivo manda; mientras llega, el último estado sincronizado.
    const estaOnline = enLinea ? enLinea.online : data.is_online;
    const estado = estaSuspendido
        ? { texto: 'Suspendido', clase: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300', punto: 'bg-rose-500' }
        : estaOnline
            ? { texto: 'Online', clase: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', punto: 'bg-emerald-500' }
            : { texto: 'Offline', clase: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', punto: 'bg-slate-400' };
    // La lectura ya puede traer "dBm": se muestra una sola vez.
    const potencia = String(liveSignal?.potencia || data.potencia_optica || '--.--').replace(/\s*dBm\s*$/i, '');

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900 transition-colors dark:bg-slate-950 dark:text-white">

            {/* ENCABEZADO */}
            <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl dark:border-slate-800 dark:bg-[#11151f]/95">
                <button type="button" aria-label="Volver" onClick={() => navigate('/tech/dashboard')} className="-ml-1 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">{data.nombre}</h1>
                    <p className="truncate font-mono text-[11px] text-slate-500">Contrato {data.cedula}</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${estado.clase}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${estado.punto}`} />{estado.texto}
                </span>
            </div>

            <div className="mx-auto max-w-3xl space-y-3 p-4">

                {/* UBICACIÓN Y CONTACTO */}
                <section className={`${TARJETA} space-y-3 p-4`}>
                    <p className="flex items-start gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                        <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {data.direccion || 'Sin dirección registrada'}
                    </p>
                    {tieneFacturasVencidas && (
                        <p className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                            <CalendarDaysIcon className="h-3.5 w-3.5" /> Factura vencida
                        </p>
                    )}
                    <div className={`grid gap-2 ${esSuCliente ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {rutaCliente ? (
                            <a href={rutaCliente} target="_blank" rel="noreferrer" className={`${BOTON_PRIMARIO} h-10`}>
                                <MapPinIcon className="h-4 w-4" /> Cómo llegar
                            </a>
                        ) : (
                            <span className="flex h-10 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">Sin ubicación</span>
                        )}
                        {!esSuCliente ? null : data.telefono ? (
                            <a href={`tel:${data.telefono}`} className={BOTON_SECUNDARIO}>
                                <PhoneIcon className="h-4 w-4" /> Llamar
                            </a>
                        ) : (
                            <span className="flex h-10 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-slate-700">Sin teléfono</span>
                        )}
                    </div>
                </section>

                {/* ESTADO DE CUENTA */}
                <p className={`${TITULO_SECCION} pt-2`}>Estado de cuenta</p>
                <section className={`${TARJETA} space-y-3 p-4`}>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{deuda > 0 ? 'Saldo deudor' : 'Al día'}</p>
                            <p className={`text-2xl font-black ${deuda > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>${deuda}</p>
                            {tieneFacturasVencidas && <p className="text-[11px] text-rose-600">{data.facturas_pendientes} factura{data.facturas_pendientes === 1 ? '' : 's'}</p>}
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Plan</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{velocidadMb} <span className="text-sm font-semibold text-slate-500">Mb</span></p>
                            <p className="text-[11px] text-slate-500">${data.precio_plan} al mes</p>
                        </div>
                    </div>
                    {cuenta && (
                        <>
                            <p className={`rounded-xl p-3 text-xs font-medium leading-relaxed ${cuenta.estado_servicio === 'suspendido'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                                : cuenta.adeudos.some((a) => a.vencido)
                                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                                {cuenta.explicacion}
                            </p>
                            {cuenta.adeudos.length > 0 && (
                                <ul aria-label="Lo que debe" className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {cuenta.adeudos.map((a, i) => (
                                        <li key={`${a.concepto}-${i}`} className="flex items-center justify-between gap-3 py-2">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{a.concepto}</p>
                                                <p className={`text-[11px] ${a.vencido ? 'text-rose-600' : 'text-slate-500'}`}>{a.vencido ? 'Venció' : 'Vence'} el {a.vence || '—'}</p>
                                            </div>
                                            <span className="shrink-0 font-mono text-sm font-bold text-slate-900 dark:text-white">${a.monto.toLocaleString('es-MX')}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                                <Fila etiqueta="Último pago">{cuenta.ultimo_pago ? `$${cuenta.ultimo_pago.monto.toLocaleString('es-MX')} · ${cuenta.ultimo_pago.fecha}` : 'Sin pagos'}</Fila>
                                <Fila etiqueta="Promesa de pago">{cuenta.promesa ? `Para el ${cuenta.promesa.fecha}` : 'Ninguna activa'}</Fila>
                            </div>
                        </>
                    )}
                </section>

                {/* RED Y FIBRA */}
                <p className={`${TITULO_SECCION} pt-2`}>Red y fibra</p>
                <section className={`${TARJETA} p-4`}>
                    <div className="flex items-center justify-between gap-3 pb-3">
                        <div>
                            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><SignalIcon className="h-4 w-4" /> Potencia óptica (RX)</p>
                            <p className="mt-0.5">
                                <span className={`text-2xl font-black ${getSignalColor(potencia)}`}>{potencia}</span>{' '}
                                <span className="text-xs font-semibold text-slate-400">dBm</span>
                            </p>
                        </div>
                        <button type="button" aria-label="Revisar señal en vivo" onClick={handleDiagnosticoVivo} disabled={isDiagnosing} className={`${BOTON_SECUNDARIO} w-10 px-0`}>
                            <ArrowPathIcon className={`h-5 w-5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                        <Fila etiqueta="ONU"><span className="font-mono text-xs">{data.identificador_onu || 'N/A'}</span></Fila>
                        <Fila etiqueta="Caja NAP">{data.nap_nombre}{data.puerto_nap ? ` · puerto ${data.puerto_nap}` : ''}</Fila>
                        <Fila etiqueta="Router">{data.router_nombre}</Fila>
                        <Fila etiqueta="IP"><span className="font-mono text-xs">{data.ip_asignada}</span></Fila>
                    </div>
                    {data.puede_reiniciar_onu && (
                        <button type="button" onClick={() => void handleReiniciarOnu()} disabled={reiniciando} className={`${BOTON_SECUNDARIO} mt-3 h-11 w-full text-amber-700 dark:text-amber-300`}>
                            <ArrowPathIcon className={`h-4 w-4 ${reiniciando ? 'animate-spin' : ''}`} />
                            {reiniciando ? 'Reiniciando...' : 'Reiniciar ONU'}
                        </button>
                    )}
                </section>

                {/* CONEXIÓN EN EL MIKROTIK */}
                <div className="flex items-center justify-between pt-2">
                    <p className={TITULO_SECCION}>Conexión PPPoE y consumo</p>
                    <button type="button" aria-label="Revisar conexión" onClick={() => void revisarConexion(data.id)} disabled={revisandoConexion} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 active:scale-90 dark:hover:bg-slate-800">
                        <ArrowPathIcon className={`h-4 w-4 ${revisandoConexion ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <section className={`${TARJETA} space-y-3 p-4`}>
                    {!enLinea ? (
                        <p className="text-sm text-slate-500">Consultando el MikroTik...</p>
                    ) : (
                        <>
                            <p className={`flex items-center gap-2 text-sm font-semibold ${enLinea.online ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                                <span className={`h-2 w-2 shrink-0 rounded-full ${enLinea.online ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {enLinea.online
                                    ? `Conectado${enLinea.uptime ? ` hace ${enLinea.uptime}` : ''}${enLinea.ip ? ` · IP ${enLinea.ip}` : ''}`
                                    : `Sin sesión PPPoE${enLinea.error ? ` · ${enLinea.error}` : ''}`}
                            </p>
                            {enLinea.online && (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Bajada ahora</p>
                                            <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{mbps(enLinea.bajada)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Subida ahora</p>
                                            <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{mbps(enLinea.subida)}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setConsumoEnVivo((v) => !v)}
                                        className={consumoEnVivo ? `${BOTON_EXITO} h-10 text-xs` : `${BOTON_SECUNDARIO} w-full`}>
                                        {consumoEnVivo && <span className="h-2 w-2 animate-pulse rounded-full bg-white" />}
                                        {consumoEnVivo ? 'Viendo consumo en vivo · detener' : 'Ver consumo en vivo'}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </section>

                {/* CREDENCIALES PPPoE */}
                <p className={`${TITULO_SECCION} flex items-center gap-1.5 pt-2`}><KeyIcon className="h-3.5 w-3.5" /> Credenciales PPPoE</p>
                <section className={`${TARJETA} divide-y divide-slate-100 px-4 py-1 dark:divide-slate-800`}>
                    <Fila etiqueta="Usuario"><span className="select-all font-mono">{data.suggested_user}</span></Fila>
                    <Fila etiqueta="Contraseña"><span className="select-all font-mono">{data.suggested_pass}</span></Fila>
                </section>

                <button type="button" onClick={() => window.location.reload()} className={`${BOTON_SECUNDARIO} h-11 w-full`}>
                    <ArrowPathIcon className="h-4 w-4" /> Actualizar datos
                </button>
            </div>

            {/* BOTÓN FLOTANTE DE CHAT: solo con sus clientes asignados */}
            {esSuCliente && (
                <button type="button" aria-label="WhatsApp al cliente" onClick={() => setIsChatOpen(true)} className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-500 active:scale-90">
                    <ChatBubbleLeftRightIcon className="h-6 w-6" />
                </button>
            )}

            {/* CHAT */}
            {isChatOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="flex h-[85vh] w-full flex-col border-t border-slate-200 bg-slate-50 shadow-2xl animate-in slide-in-from-bottom-full duration-300 dark:border-slate-800 dark:bg-[#0b0e14] sm:h-[600px] sm:max-w-md sm:rounded-2xl sm:border">
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:rounded-t-2xl">
                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{data.nombre}</h3>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">{data.telefono}</p>
                            </div>
                            <button type="button" aria-label="Cerrar chat" onClick={() => setIsChatOpen(false)} className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 active:scale-90 dark:hover:bg-slate-800"><XMarkIcon className="h-5 w-5" /></button>
                        </div>

                        <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
                            {chatMessages.map((msg, index) => (
                                <div key={msg.id ?? index} className={`flex ${msg.direccion === 'salida' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${msg.direccion === 'salida' ? 'rounded-tr-sm bg-emerald-600 text-white' : 'rounded-tl-sm border border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'}`}>
                                        <p>{msg.mensaje}</p>
                                        <p className={`mt-1 text-right text-[10px] ${msg.direccion === 'salida' ? 'text-emerald-100' : 'text-slate-400'}`}>
                                            {new Date(msg.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="border-t border-slate-200 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 pl-4 dark:border-slate-700 dark:bg-[#0b0e14]">
                                <input type="text" aria-label="Mensaje" className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white" placeholder="Escribe un mensaje..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                                <button type="button" aria-label="Enviar" onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-90 ${newMessage.trim() && !isSending ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
                                    {isSending ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <PaperAirplaneIcon className="-ml-0.5 h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
