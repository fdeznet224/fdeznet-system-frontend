import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/axios';
import { toast } from 'react-hot-toast';
import {
    ArrowLeftIcon, SignalIcon, GlobeAmericasIcon,
    ServerIcon, CubeIcon,
    ArrowPathIcon, CurrencyDollarIcon, CalendarDaysIcon,
    KeyIcon, MapPinIcon, ChatBubbleLeftRightIcon,
    XMarkIcon, PaperAirplaneIcon, PhoneIcon,
} from '@heroicons/react/24/outline';
import { rutaEnMaps } from '@/utils/mapas';
import { apiErrorMessage } from '@/utils/apiError';

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

interface DiagnosticoResponse {
    data: {
        potencia: string;
        recomendacion: string;
    };
}

function getErrorMessage(error: unknown, fallback: string) {
    return apiErrorMessage(error, fallback);
}

export default function ClientTechView() {
    const { cedula } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<TechData | null>(null);
    const [loading, setLoading] = useState(true);

    const [isDiagnosing, setIsDiagnosing] = useState(false);
    const [reiniciando, setReiniciando] = useState(false);
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
                const res = await client.get<TechData>(`/clientes/${cedula}/portal`);
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
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] flex flex-col items-center justify-center font-sans transition-colors duration-300">
            <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
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

    return (
        /* ✅ ADAPTADO: Fondo transiciona suavemente de claro a oscuro */
        <div className="min-h-screen bg-slate-50 dark:bg-[#0f1219] text-slate-900 dark:text-white pb-24 font-sans relative transition-colors duration-300">

            {/* HEADER STICKY ADAPTATIVO */}
            <div className="px-5 py-4 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0f1219]/90 backdrop-blur-md sticky top-0 z-20 shadow-sm dark:shadow-none transition-colors">
                <button onClick={() => navigate('/tech/dashboard')} className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition">
                    <ArrowLeftIcon className="w-6 h-6" />
                </button>
                <div className="flex-1 overflow-hidden">
                    <h2 className="font-bold text-sm truncate text-slate-900 dark:text-white uppercase tracking-wider transition-colors">Detalle de Cliente</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 truncate font-mono font-bold">Contrato: {data.cedula}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg border text-[10px] font-bold uppercase ${estaSuspendido
                        ? 'bg-rose-50 dark:bg-rose-500 text-rose-600 dark:text-white border-rose-200 dark:border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)] dark:shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                        : data.is_online
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-500'
                            : 'bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400'
                    }`}>
                    {estaSuspendido ? 'Suspendido' : (data.is_online ? 'Online' : 'Offline')}
                </div>
            </div>

            <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
                
                {/* 1. STATUS DE CONEXIÓN */}
                <div className={`p-6 rounded-[2rem] border text-center relative overflow-hidden transition-all duration-300 ${estaSuspendido
                        ? 'bg-gradient-to-br from-rose-50 dark:from-rose-900/40 to-white dark:to-[#0f1219] border-rose-200 dark:border-rose-500 shadow-md dark:shadow-[0_0_40px_rgba(244,63,94,0.2)]'
                        : data.is_online
                            ? 'bg-gradient-to-br from-emerald-50/50 dark:from-[#1a1f2e] to-white dark:to-[#0f1219] border-emerald-200 dark:border-emerald-500/30 shadow-md dark:shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                            : 'bg-gradient-to-br from-slate-100 dark:from-[#1a1f2e] to-white dark:to-[#0f1219] border-slate-200 dark:border-slate-800 shadow-sm'
                    }`}>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 ${estaSuspendido ? 'bg-rose-100 dark:bg-rose-500 text-rose-600 dark:text-white animate-pulse' : (data.is_online ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-500')
                            }`}>
                            {estaSuspendido ? <XMarkIcon className="w-8 h-8" /> : <SignalIcon className="w-8 h-8" />}
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white transition-colors">{data.nombre}</h1>
                        {tieneFacturasVencidas && (
                            <div className="mt-2 bg-rose-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1 mx-auto shadow-md">
                                <CalendarDaysIcon className="w-3 h-3" /> Factura Vencida
                            </div>
                        )}
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1 italic font-medium">
                            <MapPinIcon className="w-3.5 h-3.5" /> {data.direccion || 'Sin dirección registrada'}
                        </p>
                        <div className={`mt-4 grid w-full max-w-xs gap-2 ${esSuCliente ? 'grid-cols-2' : 'grid-cols-1'}`}>
                            {rutaCliente ? (
                                <a href={rutaCliente} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-[11px] font-black uppercase tracking-widest text-white shadow-sm active:scale-95">
                                    <MapPinIcon className="h-4 w-4" /> Cómo llegar
                                </a>
                            ) : (
                                <span className="flex h-11 items-center justify-center rounded-xl border border-dashed border-slate-300 text-[11px] font-bold text-slate-400">Sin ubicación</span>
                            )}
                            {!esSuCliente ? null : data.telefono ? (
                                <a href={`tel:${data.telefono}`} className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[11px] font-black uppercase tracking-widest text-slate-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                    <PhoneIcon className="h-4 w-4" /> Llamar
                                </a>
                            ) : (
                                <span className="flex h-11 items-center justify-center rounded-xl border border-dashed border-slate-300 text-[11px] font-bold text-slate-400">Sin teléfono</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. DATOS COMERCIALES */}
                <div className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm dark:shadow-xl transition-colors">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <CurrencyDollarIcon className="w-4 h-4" /> ESTADO DE CUENTA
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {/* TARJETA IZQUIERDA */}
                        <div className={`p-4 rounded-3xl border flex flex-col justify-between h-40 transition-colors ${deuda > 0 ? 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/30' : 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/30'}`}>
                            <div>
                                <p className={`text-[9px] font-black uppercase mb-1 tracking-widest ${deuda > 0 ? 'text-rose-500 dark:text-rose-400/80' : 'text-emerald-600 dark:text-emerald-400/80'}`}>
                                    {deuda > 0 ? 'SALDO DEUDOR' : 'AL DÍA'}
                                </p>
                                <p className={`text-3xl font-black ${deuda > 0 ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-500'}`}>
                                    ${deuda}
                                </p>
                                {tieneFacturasVencidas && (
                                    <div className="mt-auto pt-4">
                                        <span className="text-[9px] font-black bg-white dark:bg-[#0f1219] px-2 py-1.5 rounded-lg text-rose-600 dark:text-white uppercase border border-rose-200 dark:border-white/5 shadow-sm dark:shadow-none">
                                            {data.facturas_pendientes} FACTURA
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* TARJETA DERECHA */}
                        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-[#0f1219] border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-40 transition-colors">
                            <div>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase mb-1 tracking-widest">PLAN CONTRATADO</p>
                                <p className="text-xl font-black text-purple-600 dark:text-purple-500 uppercase tracking-tighter">
                                    {velocidadMb} MEGAS
                                </p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black mt-1">
                                    ${data.precio_plan} / Mes
                                </p>
                            </div>
                        </div>
                    </div>

                    {cuenta && (
                        <div className="space-y-3">
                            <p className={`rounded-2xl p-3 text-sm font-bold leading-snug ${cuenta.estado_servicio === 'suspendido'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                                : cuenta.adeudos.some((a) => a.vencido)
                                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                                {cuenta.explicacion}
                            </p>
                            {cuenta.adeudos.length > 0 && (
                                <ul aria-label="Lo que debe" className="divide-y divide-slate-100 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                                    {cuenta.adeudos.map((a, i) => (
                                        <li key={`${a.concepto}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{a.concepto}</p>
                                                <p className={`text-[11px] font-bold ${a.vencido ? 'text-rose-600' : 'text-slate-500'}`}>{a.vencido ? 'Venció' : 'Vence'} el {a.vence || '—'}</p>
                                            </div>
                                            <span className="shrink-0 font-mono text-sm font-black text-slate-900 dark:text-white">${a.monto.toLocaleString('es-MX')}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-[#0f1219]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Último pago</p>
                                    <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">
                                        {cuenta.ultimo_pago ? `$${cuenta.ultimo_pago.monto.toLocaleString('es-MX')} · ${cuenta.ultimo_pago.fecha}` : 'Sin pagos'}
                                    </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-[#0f1219]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Promesa de pago</p>
                                    <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">{cuenta.promesa ? `Para el ${cuenta.promesa.fecha}` : 'Ninguna activa'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. CONFIGURACIÓN DE RED */}
                <div className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 rounded-3xl p-5 space-y-4 shadow-sm dark:shadow-xl transition-colors">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ServerIcon className="w-4 h-4" /> Configuración Técnica
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-[#0f1219] rounded-2xl border border-slate-200 dark:border-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-lg text-blue-600 dark:text-blue-500"><ServerIcon className="w-4 h-4" /></div>
                                <div>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Nodo / Router</p>
                                    <p className="text-xs font-black text-slate-800 dark:text-white transition-colors">{data.router_nombre}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-[#0f1219] rounded-2xl border border-slate-200 dark:border-slate-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 dark:bg-orange-500/10 rounded-lg text-orange-600 dark:text-orange-500"><CubeIcon className="w-4 h-4" /></div>
                                <div>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Caja NAP</p>
                                    <p className="text-xs font-black text-slate-800 dark:text-white transition-colors">{data.nap_nombre}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">Puerto</p>
                                <span className="text-xs font-black text-slate-700 dark:text-white bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded transition-colors">{data.puerto_nap || 'N/A'}</span>
                            </div>
                        </div>

                        {/* DIAGNÓSTICO DE FIBRA */}
                        <div className="p-4 bg-gradient-to-br from-slate-100 dark:from-[#0f1219] to-white dark:to-black rounded-2xl border border-slate-200 dark:border-slate-700/50 relative overflow-hidden group transition-colors">
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <h4 className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                                        <SignalIcon className="w-3.5 h-3.5" /> Potencia Óptica (RX)
                                    </h4>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className={`text-2xl font-black ${getSignalColor(liveSignal?.potencia || data.potencia_optica || '0')}`}>
                                            {liveSignal?.potencia || data.potencia_optica || '--.--'}
                                        </span>
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-600">dBm</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 font-mono font-bold mt-1.5 uppercase tracking-widest">SN: {data.identificador_onu || 'N/A'}</p>
                                </div>
                                <button aria-label="Revisar señal en vivo" onClick={handleDiagnosticoVivo} disabled={isDiagnosing} className={`p-3 rounded-xl transition-all ${isDiagnosing ? 'bg-slate-200 dark:bg-slate-800' : 'bg-emerald-100 dark:bg-emerald-600/10 text-emerald-600 dark:text-emerald-500 border border-emerald-200 dark:border-emerald-500/20 active:scale-90 shadow-md dark:shadow-lg'}`}>
                                    <ArrowPathIcon className={`w-5 h-5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {data.puede_reiniciar_onu && (
                                <button
                                    type="button"
                                    onClick={() => void handleReiniciarOnu()}
                                    disabled={reiniciando}
                                    className="relative z-10 mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 text-[11px] font-black uppercase tracking-widest text-amber-700 active:scale-95 disabled:opacity-60 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                                >
                                    <ArrowPathIcon className={`h-4 w-4 ${reiniciando ? 'animate-spin' : ''}`} />
                                    {reiniciando ? 'Reiniciando...' : 'Reiniciar ONU'}
                                </button>
                            )}
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-[#0f1219] rounded-2xl border border-slate-200 dark:border-slate-800/50 transition-colors">
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1"><GlobeAmericasIcon className="w-3 h-3" /> IP Asignada</p>
                            <p className="text-xs font-mono font-bold text-slate-800 dark:text-white transition-colors">{data.ip_asignada}</p>
                        </div>
                    </div>
                </div>

                {/* 4. CREDENCIALES PPPoE */}
                <div className="bg-gradient-to-r from-purple-50 dark:from-purple-900/20 to-indigo-50 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-500/30 rounded-3xl p-5 relative overflow-hidden transition-colors shadow-sm dark:shadow-lg">
                    <h3 className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-4 relative z-10">
                        <KeyIcon className="w-4 h-4" /> Credenciales PPPoE
                    </h3>
                    <div className="grid grid-cols-1 gap-3 relative z-10">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/5 pb-2 transition-colors">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Usuario:</span>
                            <span className="text-sm font-mono font-black text-slate-800 dark:text-white select-all transition-colors">{data.suggested_user}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Contraseña:</span>
                            <span className="text-sm font-mono font-black text-slate-800 dark:text-white select-all transition-colors">{data.suggested_pass}</span>
                        </div>
                    </div>
                </div>

                <button onClick={() => window.location.reload()} className="w-full py-4 bg-white dark:bg-[#1a1f2e] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95">
                    <ArrowPathIcon className="w-5 h-5" /> Actualizar Datos
                </button>
            </div>

            {/* BOTÓN FLOTANTE DE CHAT: solo con sus clientes asignados */}
            {esSuCliente && <button aria-label="WhatsApp al cliente" onClick={() => setIsChatOpen(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-600/30 active:scale-90 transition-all z-30 border border-emerald-400/50">
                <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
            </button>}

            {/* MODAL DE CHAT ADAPTATIVO */}
            {isChatOpen && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-sm sm:p-4 transition-colors">
                    <div className="w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-slate-50 dark:bg-[#0b0c10] sm:rounded-3xl flex flex-col border-t sm:border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-full duration-300 shadow-2xl transition-colors">
                        <div className="bg-white dark:bg-[#1a1f2e] px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center">
                                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm text-slate-900 dark:text-white truncate max-w-[200px] transition-colors">{data.nombre}</h3>
                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-widest">{data.telefono}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsChatOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800/50 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors active:scale-90"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-[#0b0c10] transition-colors custom-scrollbar">
                            {chatMessages.map((msg, index) => (
                                <div key={msg.id ?? index} className={`flex ${msg.direccion === 'salida' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-md font-medium ${msg.direccion === 'salida' ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white dark:bg-[#1a1f2e] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-sm transition-colors'}`}>
                                        <p>{msg.mensaje}</p>
                                        <p className={`text-[9px] mt-1.5 text-right font-bold uppercase tracking-widest ${msg.direccion === 'salida' ? 'text-emerald-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                            {new Date(msg.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <div className="bg-white dark:bg-[#1a1f2e] p-3 border-t border-slate-200 dark:border-slate-800 transition-colors">
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#0b0c10] border border-slate-300 dark:border-slate-700 rounded-full p-1 pl-4 transition-colors shadow-inner">
                                <input type="text" className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-slate-500" placeholder="Escribe un mensaje..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
                                <button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-90 ${newMessage.trim() && !isSending ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600'}`}>
                                    {isSending ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5 -ml-0.5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
