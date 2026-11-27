import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import {
    Antena, CLAVE_DE_FABRICA, IP_DE_FABRICA, USUARIO_DE_FABRICA, buscarAntena, calidadSenal, esAppNativa,
    type EstadoAntena, type Sector,
} from '@/native/airos';
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ETIQUETA_CAMPO, PILDORA, TARJETA } from '@/components/ui/estilo';

type Paso = 'buscar' | 'entrar' | 'antena';
const LECTURA_MS = 1500;
const claveGuardada = (ssid: string) => localStorage.getItem(`clave-sector:${ssid}`) || '';

/**
 * Asistente de antena: encuentra la antena de fábrica por el WiFi del módem,
 * entra, muestra los sectores para elegir uno, la enlaza y la alineación
 * (señal, CCQ, airMAX) se ve en vivo sola. Todo es local entre el celular y
 * la antena: funciona sin internet.
 */
export default function TechAntena() {
    const navigate = useNavigate();
    const [paso, setPaso] = useState<Paso>('buscar');
    const [ip, setIp] = useState(IP_DE_FABRICA);
    const [usuario, setUsuario] = useState(USUARIO_DE_FABRICA);
    const [clave, setClave] = useState(CLAVE_DE_FABRICA);
    const [ocupado, setOcupado] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [estado, setEstado] = useState<EstadoAntena | null>(null);
    const [sinRespuesta, setSinRespuesta] = useState(false);
    const [sectores, setSectores] = useState<Sector[] | null>(null);
    const [elegido, setElegido] = useState<Sector | null>(null);
    const [claveWifi, setClaveWifi] = useState('');
    const antena = useRef<Antena | null>(null);
    const aplicando = useRef(false);

    const buscar = async () => {
        setOcupado('Buscando…');
        setError(null);
        try {
            const encontrada = await buscarAntena(ip.trim());
            if (!encontrada) {
                setError(`No encontré la antena en ${ip}. Revisa que el celular esté en el WiFi del módem y la antena en un puerto LAN.`);
                return;
            }
            antena.current = encontrada;
            setPaso('entrar');
        } finally {
            setOcupado(null);
        }
    };

    const escanear = useCallback(async () => {
        if (!antena.current) return;
        setOcupado('Escaneando sectores…');
        setError(null);
        try {
            setSectores(await antena.current.escanear());
        } catch {
            setError('La antena no pudo escanear. Intenta otra vez.');
        } finally {
            setOcupado(null);
        }
    }, []);

    const entrar = async () => {
        if (!antena.current) return;
        setOcupado('Entrando…');
        setError(null);
        try {
            await antena.current.entrar(usuario, clave);
            const actual = await antena.current.estado();
            setEstado(actual);
            setPaso('antena');
            setOcupado(null);
            if (!actual.enlazada) void escanear();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo entrar');
            setOcupado(null);
        }
    };

    // Lectura continua mientras se ve la antena: es la alineación en vivo.
    const leer = useCallback(async () => {
        if (!antena.current || aplicando.current) return;
        try {
            setEstado(await antena.current.estado());
            setSinRespuesta(false);
        } catch {
            setSinRespuesta(true);
        }
    }, []);

    useEffect(() => {
        if (paso !== 'antena') return;
        const id = window.setInterval(() => void leer(), LECTURA_MS);
        return () => window.clearInterval(id);
    }, [paso, leer]);

    const elegir = (sector: Sector) => {
        setElegido(sector);
        setClaveWifi(claveGuardada(sector.ssid));
        setError(null);
    };

    const conectar = async () => {
        if (!antena.current || !elegido) return;
        aplicando.current = true;
        setOcupado(`Conectando a ${elegido.ssid}… la antena tarda unos 30 segundos`);
        setError(null);
        try {
            await antena.current.conectarSector(elegido, claveWifi.trim());
            if (elegido.seguridad !== 'none' && claveWifi.trim()) {
                localStorage.setItem(`clave-sector:${elegido.ssid}`, claveWifi.trim());
            }
            // Esperar el enlace (hasta ~1 min) antes de dar por buena la conexión.
            let ultimo: EstadoAntena | null = null;
            for (let i = 0; i < 30; i += 1) {
                ultimo = await antena.current.estado().catch(() => null);
                if (ultimo?.enlazada) break;
                await new Promise((r) => window.setTimeout(r, 2000));
            }
            if (ultimo) setEstado(ultimo);
            if (!ultimo?.enlazada) {
                setError(`La antena no se enlazó a ${elegido.ssid}. Revisa la clave WiFi del sector o apunta mejor la antena.`);
            } else {
                setElegido(null);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo conectar al sector');
        } finally {
            aplicando.current = false;
            setOcupado(null);
        }
    };

    if (!esAppNativa()) {
        return (
            <div className="mx-auto max-w-md p-4">
                <p className={`${TARJETA} p-4 text-sm text-slate-600 dark:text-slate-300`}>
                    El asistente de antena funciona solo en la app de Android del técnico.
                </p>
            </div>
        );
    }

    const enlazada = Boolean(estado?.enlazada);
    const calidad = calidadSenal(enlazada ? estado?.senal : null);
    const colorSenal = calidad.tono === 'verde' ? 'text-emerald-600' : calidad.tono === 'ambar' ? 'text-amber-500' : 'text-rose-600';
    const colorBarra = calidad.tono === 'verde' ? 'bg-emerald-500' : calidad.tono === 'ambar' ? 'bg-amber-500' : 'bg-rose-500';
    // -90 dBm = vacío, -50 dBm = lleno.
    const llenado = enlazada && estado?.senal ? Math.max(4, Math.min(100, ((estado.senal + 90) / 40) * 100)) : 0;

    return (
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigate(-1)} className="p-2" aria-label="Atrás"><ArrowLeftIcon className="h-5 w-5" /></button>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Asistente de antena</h1>
            </div>

            {error && <p className={`rounded-xl p-3 text-sm ${PILDORA.rojo}`}>{error}</p>}
            {ocupado && (
                <p className={`flex items-center gap-2 rounded-xl p-3 text-sm ${PILDORA.azul}`}>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" /> {ocupado}
                </p>
            )}

            {paso === 'buscar' && (
                <div className={`${TARJETA} flex flex-col gap-3 p-4`}>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Conecta la antena a un puerto <b>LAN</b> del módem y el celular a su WiFi. No hace falta internet.
                    </p>
                    <label><span className={ETIQUETA_CAMPO}>IP de la antena</span>
                        <input value={ip} onChange={(e) => setIp(e.target.value)} inputMode="decimal" className={`${CAMPO} font-mono`} /></label>
                    <button type="button" onClick={() => void buscar()} disabled={Boolean(ocupado)} className={BOTON_PRIMARIO}>Buscar antena</button>
                </div>
            )}

            {paso === 'entrar' && (
                <div className={`${TARJETA} flex flex-col gap-3 p-4`}>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Antena encontrada en {antena.current?.base}.</p>
                    <label><span className={ETIQUETA_CAMPO}>Usuario</span>
                        <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoCapitalize="none" className={CAMPO} /></label>
                    <label><span className={ETIQUETA_CAMPO}>Clave</span>
                        <input value={clave} onChange={(e) => setClave(e.target.value)} type="password" className={CAMPO} /></label>
                    <p className="text-xs text-slate-500">De fábrica: ubnt / ubnt.</p>
                    <button type="button" onClick={() => void entrar()} disabled={Boolean(ocupado)} className={BOTON_PRIMARIO}>Entrar</button>
                </div>
            )}

            {paso === 'antena' && estado && (
                <>
                    {/* Alineación en vivo: se actualiza sola cada 1.5 s. */}
                    <div className={`${TARJETA} p-4`} data-testid="alineacion">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{estado.modelo || 'Antena'} · {estado.firmware}</p>
                                <p className="text-xs text-slate-500">{estado.nombre || 'sin nombre'}</p>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sinRespuesta ? PILDORA.ambar : enlazada ? PILDORA.verde : PILDORA.neutro}`}>
                                {sinRespuesta ? 'Reconectando…' : enlazada ? 'En vivo' : 'Sin enlace'}
                            </span>
                        </div>

                        {enlazada ? (
                            <>
                                <p className="mt-3 text-center text-xs font-semibold text-slate-500">Enlazada a <b>{estado.ssid}</b> · {estado.frecuencia}</p>
                                <p className={`mt-1 text-center text-6xl font-black tabular-nums ${colorSenal}`}>{estado.senal}<span className="text-2xl"> dBm</span></p>
                                <p className="text-center text-sm font-semibold text-slate-600 dark:text-slate-300">{calidad.texto}</p>
                                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                    <div className={`h-full rounded-full transition-all duration-500 ${colorBarra}`} style={{ width: `${llenado}%` }} />
                                </div>
                                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                    <Dato nombre="CCQ" valor={estado.ccq} sufijo="%" />
                                    <Dato nombre="Calidad airMAX" valor={estado.calidadAirmax} sufijo="%" />
                                    <Dato nombre="Capacidad airMAX" valor={estado.capacidadAirmax} sufijo="%" />
                                    <Dato nombre="Ruido" valor={estado.ruido} sufijo=" dBm" />
                                    <Dato nombre="Subida" valor={estado.txMbps} sufijo=" Mbps" />
                                    <Dato nombre="Bajada" valor={estado.rxMbps} sufijo=" Mbps" />
                                </div>
                                <button type="button" onClick={() => void escanear()} disabled={Boolean(ocupado)} className={`${BOTON_SECUNDARIO} mt-4 w-full`}>
                                    Cambiar de sector
                                </button>
                            </>
                        ) : (
                            <p className="mt-4 text-center text-sm text-slate-500">Sin enlace: elige el sector abajo.</p>
                        )}
                    </div>

                    {(!enlazada || sectores) && (
                        <div className={`${TARJETA} p-4`}>
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Elige el sector</p>
                                <button type="button" onClick={() => void escanear()} disabled={Boolean(ocupado)} className={BOTON_SECUNDARIO}>
                                    <ArrowPathIcon className="h-4 w-4" /> Escanear
                                </button>
                            </div>
                            {!sectores || sectores.length === 0 ? (
                                <p className="mt-3 text-xs text-slate-500">{sectores ? 'No se ve ningún sector.' : 'Escaneando…'}</p>
                            ) : (
                                <ul className="mt-2 flex flex-col gap-1.5">
                                    {sectores.map((s) => {
                                        const c = calidadSenal(s.senal);
                                        const activo = elegido?.mac === s.mac;
                                        const actual = enlazada && estado?.apMac?.toUpperCase() === s.mac.toUpperCase();
                                        return (
                                            <li key={s.mac}>
                                                <button
                                                    type="button"
                                                    onClick={() => elegir(s)}
                                                    disabled={Boolean(ocupado)}
                                                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${activo
                                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                                                        : 'border-slate-200 dark:border-slate-700'}`}
                                                >
                                                    <span>
                                                        <span className="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                            {s.seguridad !== 'none' && <LockClosedIcon className="h-3.5 w-3.5 text-slate-400" />}
                                                            {s.ssid}
                                                            {actual && <CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
                                                        </span>
                                                        <span className="text-xs text-slate-500">{s.frecuencia} GHz · {s.seguridad === 'none' ? 'abierta' : s.seguridad.toUpperCase()}</span>
                                                    </span>
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PILDORA[c.tono]}`}>{s.senal} dBm</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {elegido && (
                                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Conectar a {elegido.ssid}</p>
                                    {elegido.seguridad !== 'none' && (
                                        <label><span className={ETIQUETA_CAMPO}>Clave WiFi del sector</span>
                                            <input value={claveWifi} onChange={(e) => setClaveWifi(e.target.value)} type="password" autoCapitalize="none" className={CAMPO} />
                                            <span className="mt-1 block text-[11px] text-slate-500">Se recuerda en este celular para la próxima instalación.</span>
                                        </label>
                                    )}
                                    <button type="button" onClick={() => void conectar()} disabled={Boolean(ocupado)} className={BOTON_PRIMARIO}>
                                        Conectar
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function Dato({ nombre, valor, sufijo }: { nombre: string; valor: number | null | undefined; sufijo: string }) {
    return (
        <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
            <p className="text-[10px] font-semibold uppercase text-slate-500">{nombre}</p>
            <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{valor ?? '—'}{valor !== null && valor !== undefined ? sufijo : ''}</p>
        </div>
    );
}
