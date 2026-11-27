import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    ArrowLeftIcon, ArrowPathIcon, CheckCircleIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, WifiIcon,
} from '@heroicons/react/24/outline';
import {
    Antena, CLAVE_DE_FABRICA, IP_DE_FABRICA, USUARIO_DE_FABRICA, buscarAntena, calidadSenal, esAppNativa,
    capacidadEstimada, detenerPitido, guardarSectoresDelSistema, infoDeSector, iniciarPitido, sectoresGuardados,
    SECTOR_CASI_LLENO, SECTOR_SATURADO, veredictoInstalacion, type EstadoAntena, type InfoSector, type PlantillaAntena, type Sector,
} from '@/native/airos';
import client from '@/api/axios';
import { BOTON_EXITO, BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ETIQUETA_CAMPO, PILDORA, TARJETA } from '@/components/ui/estilo';

type Paso = 1 | 2 | 3 | 4 | 5;
const PASOS: Record<Paso, string> = { 1: 'Conectar', 2: 'Red WiFi', 3: 'Alinear', 4: 'Configurar', 5: 'Terminar' };
const claveOrden = (orden: string) => `antena-orden:${orden}`;

interface DatosOrden {
    nombre: string;
    contrato: string;
    usuario_pppoe: string;
    password_pppoe: string;
    plantilla: PlantillaAntena;
}

interface EstadoConexion {
    pppoe: { conectado: boolean; ip?: string | null };
    antena: { responde?: boolean | null } | null;
    ip_antena: string | null;
}
const LECTURA_MS = 1500;
const claveGuardada = (ssid: string) => localStorage.getItem(`clave-sector:${ssid}`) || '';
/** Lo que deja el asistente para la activación del cliente. */
export const CLAVE_ANTENA_INSTALADA = 'antena-instalada';

/**
 * Asistente de antena por pasos (como tutorial para el técnico):
 * 1 encontrar la antena y entrar, 2 elegir el sector y su clave, 3 alinear con
 * los datos en vivo y un veredicto en palabras, 4 terminar y volver a la
 * activación. Todo es local entre el celular y la antena: funciona sin internet.
 */
export default function TechAntena() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const ordenId = params.get('orden');
    const [conocidos, setConocidos] = useState<InfoSector[]>(() => sectoresGuardados());
    const [pitido, setPitido] = useState(false);
    const [paso, setPaso] = useState<Paso>(1);
    const [ip, setIp] = useState(IP_DE_FABRICA);
    const [usuario, setUsuario] = useState(USUARIO_DE_FABRICA);
    const [clave, setClave] = useState(CLAVE_DE_FABRICA);
    const [pedirClave, setPedirClave] = useState(false);
    const [ocupado, setOcupado] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [estado, setEstado] = useState<EstadoAntena | null>(null);
    const [sinRespuesta, setSinRespuesta] = useState(false);
    const [sectores, setSectores] = useState<Sector[] | null>(null);
    const [elegido, setElegido] = useState<Sector | null>(null);
    const [claveWifi, setClaveWifi] = useState('');
    const [verClave, setVerClave] = useState(false);
    const antena = useRef<Antena | null>(null);
    const aplicando = useRef(false);
    const [orden, setOrden] = useState<DatosOrden | null>(() => {
        try {
            return ordenId ? JSON.parse(localStorage.getItem(claveOrden(ordenId)) || 'null') : null;
        } catch {
            return null;
        }
    });
    const [ordenError, setOrdenError] = useState<string | null>(null);
    const [medicion, setMedicion] = useState<EstadoAntena | null>(null);
    const [configurada, setConfigurada] = useState(false);
    const [conexion, setConexion] = useState<EstadoConexion | null>(null);
    const [registro, setRegistro] = useState<string | null>(null);

    // Con internet se trae (y se guarda) la configuración del cliente de la orden.
    useEffect(() => {
        if (!ordenId) return;
        client.get<DatosOrden>(`/ordenes/${ordenId}/antena`)
            .then(({ data }) => {
                localStorage.setItem(claveOrden(ordenId), JSON.stringify(data));
                setOrden(data);
                setOrdenError(null);
            })
            .catch((e) => {
                const detalle = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
                if (detalle) setOrdenError(detalle);
            });
    }, [ordenId]);

    // Configurada la antena: se espera a que el sistema vea su PPPoE (llega cuando hay internet).
    useEffect(() => {
        if (paso !== 4 || !configurada || !ordenId) return;
        let vivo = true;
        const revisar = async () => {
            try {
                const { data } = await client.get<EstadoConexion>(`/ordenes/${ordenId}/antena/estado`);
                if (vivo) setConexion(data);
            } catch {
                /* sin internet todavía: se reintenta */
            }
        };
        void revisar();
        const id = window.setInterval(() => void revisar(), 6000);
        return () => { vivo = false; window.clearInterval(id); };
    }, [paso, configurada, ordenId]);

    // Con internet (antes de llegar al WiFi del cliente) se actualizan los
    // clientes por sector; sin internet se usa lo guardado.
    useEffect(() => {
        client.get('/red-inalambrica/arbol')
            .then(({ data }) => setConocidos(guardarSectoresDelSistema(data)))
            .catch(() => undefined);
    }, []);

    // El pitido se apaga al salir de Alinear o de la pantalla.
    useEffect(() => {
        if (paso !== 3 && pitido) {
            void detenerPitido();
            setPitido(false);
        }
    }, [paso, pitido]);
    useEffect(() => () => { void detenerPitido(); }, []);

    const cambiarPitido = async () => {
        if (!antena.current) return;
        if (pitido) {
            await detenerPitido();
            setPitido(false);
        } else {
            await iniciarPitido(antena.current);
            setPitido(true);
        }
    };

    const escanear = useCallback(async () => {
        if (!antena.current) return;
        setOcupado('Buscando redes WiFi…');
        setError(null);
        try {
            setSectores(await antena.current.escanear());
        } catch {
            setError('La antena no pudo escanear. Intenta otra vez.');
        } finally {
            setOcupado(null);
        }
    }, []);

    const irAPaso2 = useCallback(() => {
        setPaso(2);
        setElegido(null);
        setSectores(null);
        void escanear();
    }, [escanear]);

    const entrar = async (u = usuario, c = clave) => {
        if (!antena.current) return false;
        setOcupado('Entrando a la antena…');
        setError(null);
        try {
            await antena.current.entrar(u, c);
            const actual = await antena.current.estado();
            setEstado(actual);
            setOcupado(null);
            if (actual.enlazada) setPaso(3);
            else irAPaso2();
            return true;
        } catch (e) {
            setOcupado(null);
            setError(e instanceof Error ? e.message : 'No se pudo entrar');
            return false;
        }
    };

    const buscar = async () => {
        setOcupado('Buscando la antena…');
        setError(null);
        const encontrada = await buscarAntena(ip.trim()).catch(() => null);
        if (!encontrada) {
            setOcupado(null);
            setError(`No encontré la antena en ${ip}. Revisa que el celular esté en el WiFi del módem y la antena en un puerto LAN.`);
            return;
        }
        antena.current = encontrada;
        // Primero con la clave de fábrica; si no entra, se piden usuario y clave.
        if (!(await entrar(USUARIO_DE_FABRICA, CLAVE_DE_FABRICA))) {
            setError(null);
            setPedirClave(true);
        }
    };

    // Lectura continua en el paso de alinear: los datos se ven en vivo.
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
        if (paso !== 3) return;
        const id = window.setInterval(() => void leer(), LECTURA_MS);
        return () => window.clearInterval(id);
    }, [paso, leer]);

    const elegir = (sector: Sector) => {
        setElegido(sector);
        setClaveWifi(claveGuardada(sector.ssid));
        setVerClave(false);
        setError(null);
    };

    const conectar = async () => {
        if (!antena.current || !elegido) return;
        aplicando.current = true;
        setOcupado(`Conectando a ${elegido.ssid}… tarda unos 30 segundos`);
        setError(null);
        try {
            await antena.current.conectarSector(elegido, claveWifi.trim());
            let ultimo: EstadoAntena | null = null;
            for (let i = 0; i < 30; i += 1) {
                ultimo = await antena.current.estado().catch(() => null);
                if (ultimo?.enlazada) break;
                await new Promise((r) => window.setTimeout(r, 2000));
            }
            if (ultimo) setEstado(ultimo);
            if (ultimo?.enlazada) {
                if (elegido.seguridad !== 'none' && claveWifi.trim()) {
                    localStorage.setItem(`clave-sector:${elegido.ssid}`, claveWifi.trim());
                }
                setPaso(3);
            } else {
                setError(`No se conectó a ${elegido.ssid}. Revisa la clave WiFi (toca el ojo para verla) o apunta mejor la antena.`);
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo conectar a la red');
        } finally {
            aplicando.current = false;
            setOcupado(null);
        }
    };

    /** De Alinear al siguiente paso: se guarda la medición (después de configurar ya no se lee aquí). */
    const terminarAlineacion = () => {
        if (!estado) return;
        const veredicto = veredictoInstalacion(estado);
        if (veredicto.nivel === 'mala' && !window.confirm('La instalación quedó mala. ¿Seguir de todos modos?')) return;
        const estimada = capacidadEstimada(estado);
        setMedicion(estado);
        sessionStorage.setItem(CLAVE_ANTENA_INSTALADA, JSON.stringify({
            orden: ordenId, ssid: estado.ssid, apMac: estado.apMac, modelo: estado.modelo, senal: estado.senal,
            ccq: estado.ccq, capacidad: estado.capacidadAirmax, distanciaM: estado.distanciaM,
            bajadaEstimada: estimada?.bajada, subidaEstimada: estimada?.subida, calidad: veredicto.texto,
            en: new Date().toISOString(),
        }));
        setPaso(ordenId ? 4 : 5);
    };

    const configurar = async () => {
        if (!antena.current || !orden) return;
        aplicando.current = true;
        setOcupado(`Configurando la antena de ${orden.nombre}…`);
        setError(null);
        try {
            await antena.current.aplicarPlantilla(orden.plantilla);
            setConfigurada(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo configurar la antena');
        } finally {
            aplicando.current = false;
            setOcupado(null);
        }
    };

    const terminar = async () => {
        const m = medicion || estado;
        if (ordenId && m) {
            try {
                const { data } = await client.post<{ resumen: string }>(`/ordenes/${ordenId}/antena`, {
                    ssid: m.ssid || 'desconocido', frecuencia: m.frecuencia, senal: m.senal, ccq: m.ccq,
                    distancia_m: m.distanciaM, modelo: m.modelo, calidad: veredictoInstalacion(m).texto, configurada,
                });
                setRegistro(data.resumen);
            } catch {
                setRegistro(null);
                setError('No se pudo guardar en el sistema (¿sin internet?). Toca Terminar otra vez cuando haya señal.');
                return;
            }
        }
        localStorage.removeItem(claveOrden(ordenId || ''));
        setPaso(5);
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

    return (
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigate(-1)} className="p-2" aria-label="Atrás"><ArrowLeftIcon className="h-5 w-5" /></button>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Instalar antena</h1>
            </div>

            {/* Pasos del tutorial */}
            <ol className="grid grid-cols-5 gap-1">
                {([1, 2, 3, 4, 5] as Paso[]).filter((n) => n !== 4 || ordenId).map((n) => (
                    <li key={n} className="flex flex-col items-center gap-1">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${n < paso
                            ? 'bg-emerald-500 text-white' : n === paso ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>
                            {n < paso ? '✓' : n}
                        </span>
                        <span className={`text-[11px] font-semibold ${n === paso ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{PASOS[n]}</span>
                    </li>
                ))}
            </ol>

            {error && <p className={`rounded-xl p-3 text-sm ${PILDORA.rojo}`}>{error}</p>}
            {ocupado && (
                <p className={`flex items-center gap-2 rounded-xl p-3 text-sm ${PILDORA.azul}`}>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" /> {ocupado}
                </p>
            )}

            {ordenId && (
                <p className={`rounded-xl p-3 text-xs ${orden ? PILDORA.azul : PILDORA.ambar}`}>
                    {orden
                        ? <>Instalación de <b>{orden.nombre}</b> · contrato {orden.contrato}</>
                        : ordenError || 'Abre esta pantalla con internet una vez para traer los datos del cliente.'}
                </p>
            )}

            {paso === 1 && (
                <div className={`${TARJETA} flex flex-col gap-3 p-4`}>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Paso 1: conecta la antena</p>
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                        <li>Conecta la antena a un puerto <b>LAN</b> del módem (con su PoE).</li>
                        <li>Conecta este celular al <b>WiFi del módem</b>. No hace falta internet.</li>
                        <li>Toca <b>Buscar antena</b>.</li>
                    </ol>
                    {!pedirClave ? (
                        <>
                            <label><span className={ETIQUETA_CAMPO}>IP de la antena</span>
                                <input value={ip} onChange={(e) => setIp(e.target.value)} inputMode="decimal" className={`${CAMPO} font-mono`} /></label>
                            <button type="button" onClick={() => void buscar()} disabled={Boolean(ocupado)} className={BOTON_PRIMARIO}>Buscar antena</button>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-amber-700 dark:text-amber-300">La antena no entró con la clave de fábrica. Escribe su usuario y clave.</p>
                            <label><span className={ETIQUETA_CAMPO}>Usuario</span>
                                <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoCapitalize="none" className={CAMPO} /></label>
                            <label><span className={ETIQUETA_CAMPO}>Clave</span>
                                <input value={clave} onChange={(e) => setClave(e.target.value)} type="password" className={CAMPO} /></label>
                            <button type="button" onClick={() => void entrar()} disabled={Boolean(ocupado)} className={BOTON_PRIMARIO}>Entrar</button>
                        </>
                    )}
                </div>
            )}

            {paso === 2 && (
                <div className={`${TARJETA} flex flex-col gap-3 p-4`}>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Paso 2: conéctame a una red WiFi</p>
                        <button type="button" onClick={() => void escanear()} disabled={Boolean(ocupado)} className={BOTON_SECUNDARIO} aria-label="Buscar redes">
                            <ArrowPathIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">Elige el sector de FdezNet con mejor señal (el de arriba es el más fuerte).</p>
                    {sectores && sectores.length === 0 && <p className="text-sm text-slate-500">No se ve ninguna red. Apunta la antena hacia la torre y busca otra vez.</p>}
                    {sectores && sectores.length > 0 && (
                        <ul className="flex flex-col gap-1.5">
                            {sectores.map((s) => {
                                const c = calidadSenal(s.senal);
                                const activo = elegido?.mac === s.mac;
                                return (
                                    <li key={s.mac}>
                                        <button
                                            type="button"
                                            onClick={() => elegir(s)}
                                            disabled={Boolean(ocupado)}
                                            className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${activo
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700'}`}
                                        >
                                            <WifiIcon className={`h-5 w-5 shrink-0 ${c.tono === 'verde' ? 'text-emerald-500' : c.tono === 'ambar' ? 'text-amber-500' : 'text-rose-500'}`} />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                    {s.ssid}
                                                    {s.seguridad !== 'none' && <LockClosedIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                                                </span>
                                                <span className="text-xs text-slate-500">{s.frecuencia} GHz · {s.seguridad === 'none' ? 'abierta' : s.seguridad.toUpperCase()}</span>
                                                <Saturacion info={infoDeSector(s, conocidos)} hayLista={conocidos.length > 0} />
                                            </span>
                                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${PILDORA[c.tono]}`}>{s.senal} dBm</span>
                                        </button>
                                        {activo && (
                                            <div className="mt-1.5 flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                                                {s.seguridad !== 'none' && (
                                                    <label><span className={ETIQUETA_CAMPO}>Clave WiFi de {s.ssid}</span>
                                                        <span className="relative block">
                                                            <input value={claveWifi} onChange={(e) => setClaveWifi(e.target.value)} type={verClave ? 'text' : 'password'}
                                                                autoCapitalize="none" autoCorrect="off" spellCheck={false} className={`${CAMPO} pr-11 font-mono`} />
                                                            <button type="button" onClick={() => setVerClave((v) => !v)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500" aria-label={verClave ? 'Ocultar clave' : 'Ver clave'}>
                                                                {verClave ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                                            </button>
                                                        </span>
                                                    </label>
                                                )}
                                                <button type="button" onClick={() => void conectar()} disabled={Boolean(ocupado)} className={BOTON_PRIMARIO}>
                                                    Conectar
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            {paso === 3 && estado && <Alineacion estado={estado} sinRespuesta={sinRespuesta}
                onCambiar={irAPaso2} onTerminar={terminarAlineacion} ocupado={Boolean(ocupado)} textoSiguiente={ordenId ? 'Siguiente: configurar' : 'Terminar instalación'}
                pitido={pitido} onPitido={() => void cambiarPitido()} />}

            {paso === 4 && (
                <div className={`${TARJETA} flex flex-col gap-3 p-4`} data-testid="configurar">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Paso 4: configura la antena del cliente</p>
                    {!orden ? (
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                            Faltan los datos del cliente. Activa la orden con internet y vuelve a abrir el asistente desde ella.
                        </p>
                    ) : !configurada ? (
                        <>
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800/60">
                                <dt className="text-slate-500">Cliente</dt><dd className="font-semibold">{orden.nombre}</dd>
                                <dt className="text-slate-500">Modo</dt><dd className="font-semibold">Router con PPPoE</dd>
                                <dt className="text-slate-500">PPPoE</dt><dd className="font-mono font-semibold">{orden.plantilla.pppoe_usuario}</dd>
                                <dt className="text-slate-500">IP de la antena</dt><dd className="font-mono font-semibold">{orden.plantilla.ip} (VLAN {orden.plantilla.vlan})</dd>
                                <dt className="text-slate-500">Red al módem</dt><dd className="font-mono font-semibold">{orden.plantilla.lan_ip}</dd>
                                <dt className="text-slate-500">Sector</dt><dd className="font-semibold">{medicion?.ssid} · {medicion?.senal} dBm</dd>
                            </dl>
                            {!orden.plantilla.usuario_empresa && (
                                <p className="text-xs text-amber-700 dark:text-amber-300">Sin usuario de la empresa configurado: la antena se queda con su clave actual.</p>
                            )}
                            <button type="button" onClick={() => void configurar()} disabled={Boolean(ocupado)} className={BOTON_PRIMARIO}>
                                Aplicar configuración del cliente
                            </button>
                        </>
                    ) : (
                        <>
                            <p className={`rounded-xl p-3 text-sm ${PILDORA.verde}`}>✓ Configuración aplicada en la antena.</p>
                            <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-200">
                                <li>Pasa el cable de la antena al puerto <b>WAN</b> (azul) del módem.</li>
                                <li>Deja el módem como viene de fábrica (IP dinámica) y ponle el WiFi del cliente.</li>
                                <li>Espera aquí: el sistema confirma cuando conecte.</li>
                            </ol>
                            <div className="flex flex-col gap-1.5 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
                                <Comprobacion ok={Boolean(conexion?.pppoe.conectado)} texto={conexion?.pppoe.conectado ? `PPPoE conectado (${conexion.pppoe.ip})` : 'Esperando que conecte el PPPoE…'} />
                                <Comprobacion ok={Boolean(conexion?.antena?.responde)} texto={conexion?.antena?.responde ? `La antena responde en ${conexion.ip_antena}` : 'Esperando que la antena responda en su IP…'} />
                                {!conexion && <p className="text-[11px] text-slate-500">Se revisa cada 6 s; necesita internet (llega por el PPPoE o por datos).</p>}
                            </div>
                            <button type="button" onClick={() => void terminar()} disabled={!conexion?.pppoe.conectado} className={BOTON_EXITO}>
                                Terminar instalación
                            </button>
                            <button type="button" onClick={() => void terminar()} className="text-xs font-semibold text-slate-500">Terminar sin confirmar</button>
                        </>
                    )}
                </div>
            )}

            {paso === 5 && (
                <div className={`${TARJETA} flex flex-col items-center gap-3 p-6 text-center`}>
                    <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
                    <p className="text-lg font-bold text-slate-900 dark:text-white">Instalación terminada</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        {registro || <>Conectada a <b>{(medicion || estado)?.ssid}</b> · calidad <b>{(medicion || estado) ? veredictoInstalacion((medicion || estado) as EstadoAntena).texto : ''}</b>.</>}
                    </p>
                    <button type="button" onClick={() => navigate('/tech/dashboard')} className={BOTON_EXITO}>Volver al inicio</button>
                </div>
            )}
        </div>
    );
}

function Alineacion({ estado, sinRespuesta, onCambiar, onTerminar, ocupado, pitido, onPitido, textoSiguiente }: {
    estado: EstadoAntena; sinRespuesta: boolean; onCambiar: () => void; onTerminar: () => void; ocupado: boolean;
    pitido: boolean; onPitido: () => void; textoSiguiente: string;
}) {
    const estimada = capacidadEstimada(estado);
    const enlazada = Boolean(estado.enlazada);
    const v = veredictoInstalacion(estado);
    const colores = {
        excelente: { texto: 'text-emerald-600', fondo: 'bg-emerald-500', caja: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' },
        optima: { texto: 'text-teal-600', fondo: 'bg-teal-500', caja: 'bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200' },
        regular: { texto: 'text-amber-500', fondo: 'bg-amber-500', caja: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200' },
        mala: { texto: 'text-rose-600', fondo: 'bg-rose-500', caja: 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200' },
    }[v.nivel];
    // -90 dBm = vacío, -50 dBm = lleno.
    const llenado = enlazada && estado.senal ? Math.max(4, Math.min(100, ((estado.senal + 90) / 40) * 100)) : 0;

    return (
        <div className={`${TARJETA} flex flex-col gap-3 p-4`} data-testid="alineacion">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Paso 3: alinea la antena</p>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${sinRespuesta ? PILDORA.ambar : PILDORA.verde}`}>
                    {sinRespuesta ? 'Reconectando…' : '● En vivo'}
                </span>
            </div>
            <p className="text-center text-xs text-slate-500">Conectada a <b>{estado.ssid}</b> · {estado.frecuencia}</p>

            <div className={`rounded-2xl p-4 text-center ${colores.caja}`}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Instalación</p>
                <p className="text-2xl font-black">{v.texto}</p>
                <p className="mt-1 text-xs">{v.consejo}</p>
            </div>

            <p className={`text-center text-6xl font-black tabular-nums ${colores.texto}`}>{enlazada ? estado.senal : '—'}<span className="text-2xl"> dBm</span></p>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div className={`h-full rounded-full transition-all duration-500 ${colores.fondo}`} style={{ width: `${llenado}%` }} />
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
                <Dato nombre="CCQ" valor={estado.ccq} sufijo="%" />
                <Dato nombre="Calidad airMAX" valor={estado.calidadAirmax} sufijo="%" />
                <Dato nombre="Capacidad airMAX" valor={estado.capacidadAirmax} sufijo="%" />
                <Dato nombre="Ruido" valor={estado.ruido} sufijo=" dBm" />
                <Dato nombre="Subida" valor={estado.txMbps} sufijo=" Mbps" />
                <Dato nombre="Bajada" valor={estado.rxMbps} sufijo=" Mbps" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Capacidad estimada</p>
                    <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {estimada ? `↓ ${estimada.bajada} · ↑ ${estimada.subida} Mb` : '—'}
                    </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Distancia a la torre</p>
                    <p className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                        {estado.distanciaM ? (estado.distanciaM >= 1000 ? `${(estado.distanciaM / 1000).toFixed(2)} km` : `${estado.distanciaM} m`) : '—'}
                    </p>
                </div>
            </div>
            <p className="text-center text-[11px] text-slate-500">La capacidad es un cálculo con el enlace; la prueba real de velocidad va después de configurar.</p>

            <button type="button" onClick={onPitido}
                className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${pitido
                    ? 'bg-violet-600 text-white' : 'border border-violet-300 text-violet-700 dark:border-violet-500/40 dark:text-violet-300'}`}>
                {pitido ? '🔊 Pitido activo: toca para apagarlo' : '🔈 Activar pitido para alinear'}
            </button>
            {pitido && <p className="-mt-1 text-center text-[11px] text-slate-500">Más rápido y más agudo = mejor señal. Sigue sonando con el celular bloqueado.</p>}

            <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onCambiar} disabled={ocupado} className={`${BOTON_SECUNDARIO} h-11`}>Cambiar de sector</button>
                <button type="button" onClick={onTerminar} disabled={ocupado || !enlazada} className={BOTON_EXITO}>{textoSiguiente}</button>
            </div>
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

function Saturacion({ info, hayLista }: { info: InfoSector | null; hayLista: boolean }) {
    if (!info) {
        return hayLista ? <span className="mt-0.5 block text-[11px] text-slate-400">No es un sector de FdezNet (módem o red ajena)</span> : null;
    }
    if (info.clientes === null) return null;
    const lleno = info.clientes >= SECTOR_SATURADO;
    const casi = info.clientes >= SECTOR_CASI_LLENO;
    return (
        <span className={`mt-0.5 block text-[11px] font-semibold ${lleno ? 'text-rose-600' : casi ? 'text-amber-600' : 'text-slate-500'}`}>
            {info.nombre} · {info.clientes} clientes{lleno ? ' · ⚠️ saturado, usa otro sector' : casi ? ' · casi lleno' : ''}
        </span>
    );
}

function Comprobacion({ ok, texto }: { ok: boolean; texto: string }) {
    return (
        <p className={`flex items-center gap-2 ${ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>
            {ok ? <CheckCircleIcon className="h-5 w-5" /> : <ArrowPathIcon className="h-5 w-5 animate-spin" />} {texto}
        </p>
    );
}
