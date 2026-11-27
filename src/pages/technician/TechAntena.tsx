import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, ArrowPathIcon, SignalIcon } from '@heroicons/react/24/outline';
import {
    Antena, CLAVE_DE_FABRICA, IP_DE_FABRICA, USUARIO_DE_FABRICA, buscarAntena, calidadSenal, esAppNativa,
    type EstadoAntena, type Sector,
} from '@/native/airos';
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ETIQUETA_CAMPO, PILDORA, TARJETA } from '@/components/ui/estilo';

type Paso = 'buscar' | 'entrar' | 'listo';

/**
 * Asistente de antena (fase de prueba): encuentra la antena de fábrica por el
 * WiFi del módem, entra, muestra los sectores con su señal y la señal en vivo
 * para alinear. Funciona sin internet (todo es local entre el celular y la antena).
 */
export default function TechAntena() {
    const navigate = useNavigate();
    const [paso, setPaso] = useState<Paso>('buscar');
    const [ip, setIp] = useState(IP_DE_FABRICA);
    const [usuario, setUsuario] = useState(USUARIO_DE_FABRICA);
    const [clave, setClave] = useState(CLAVE_DE_FABRICA);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [estado, setEstado] = useState<EstadoAntena | null>(null);
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [enVivo, setEnVivo] = useState(false);
    const antena = useRef<Antena | null>(null);

    const buscar = async () => {
        setOcupado(true);
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
            setOcupado(false);
        }
    };

    const entrar = async () => {
        if (!antena.current) return;
        setOcupado(true);
        setError(null);
        try {
            await antena.current.entrar(usuario, clave);
            setEstado(await antena.current.estado());
            setPaso('listo');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'No se pudo entrar');
        } finally {
            setOcupado(false);
        }
    };

    const escanear = async () => {
        if (!antena.current) return;
        setOcupado(true);
        setError(null);
        try {
            setSectores(await antena.current.escanear());
        } catch {
            setError('La antena no pudo escanear.');
        } finally {
            setOcupado(false);
        }
    };

    const refrescar = useCallback(async () => {
        if (!antena.current) return;
        try {
            setEstado(await antena.current.estado());
        } catch {
            /* un fallo suelto mientras se mueve la antena no detiene la lectura */
        }
    }, []);

    useEffect(() => {
        if (!enVivo) return;
        const id = window.setInterval(() => void refrescar(), 1500);
        return () => window.clearInterval(id);
    }, [enVivo, refrescar]);

    if (!esAppNativa()) {
        return (
            <div className="mx-auto max-w-md p-4">
                <p className={`${TARJETA} p-4 text-sm text-slate-600 dark:text-slate-300`}>
                    El asistente de antena funciona solo en la app de Android del técnico.
                </p>
            </div>
        );
    }

    const calidad = calidadSenal(estado?.senal);

    return (
        <div className="mx-auto flex max-w-md flex-col gap-4 p-4 pb-24">
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigate(-1)} className="p-2" aria-label="Atrás"><ArrowLeftIcon className="h-5 w-5" /></button>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Asistente de antena</h1>
            </div>

            {error && <p className={`rounded-xl p-3 text-sm ${PILDORA.rojo}`}>{error}</p>}

            {paso === 'buscar' && (
                <div className={`${TARJETA} flex flex-col gap-3 p-4`}>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Conecta la antena a un puerto <b>LAN</b> del módem y el celular a su WiFi. No hace falta internet.
                    </p>
                    <label><span className={ETIQUETA_CAMPO}>IP de la antena</span>
                        <input value={ip} onChange={(e) => setIp(e.target.value)} inputMode="decimal" className={`${CAMPO} font-mono`} /></label>
                    <button type="button" onClick={() => void buscar()} disabled={ocupado} className={BOTON_PRIMARIO}>
                        {ocupado ? 'Buscando…' : 'Buscar antena'}
                    </button>
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
                    <button type="button" onClick={() => void entrar()} disabled={ocupado} className={BOTON_PRIMARIO}>
                        {ocupado ? 'Entrando…' : 'Entrar'}
                    </button>
                </div>
            )}

            {paso === 'listo' && estado && (
                <>
                    <div className={`${TARJETA} p-4`}>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{estado.modelo || 'Antena'} · {estado.firmware}</p>
                        <p className="text-xs text-slate-500">airOS {antena.current?.version} · {estado.nombre || 'sin nombre'} · {estado.modo || '—'}</p>
                        <div className="mt-4 text-center">
                            <p className={`text-5xl font-black ${calidad.tono === 'verde' ? 'text-emerald-600' : calidad.tono === 'ambar' ? 'text-amber-500' : 'text-rose-600'}`}>
                                {estado.enlazada && estado.senal !== null ? `${estado.senal} dBm` : '—'}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{calidad.texto}</p>
                            {estado.enlazada && <p className="text-xs text-slate-500">{estado.ssid} · CCQ {estado.ccq ?? '—'}% · ruido {estado.ruido ?? '—'}</p>}
                        </div>
                        <button type="button" onClick={() => setEnVivo((v) => !v)} className={`${BOTON_SECUNDARIO} mt-4 w-full`}>
                            <SignalIcon className="h-4 w-4" /> {enVivo ? 'Detener lectura en vivo' : 'Leer señal en vivo (alinear)'}
                        </button>
                    </div>

                    <div className={`${TARJETA} p-4`}>
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Sectores que ve</p>
                            <button type="button" onClick={() => void escanear()} disabled={ocupado} className={BOTON_SECUNDARIO}>
                                <ArrowPathIcon className={`h-4 w-4 ${ocupado ? 'animate-spin' : ''}`} /> Escanear
                            </button>
                        </div>
                        {sectores.length === 0 ? (
                            <p className="mt-3 text-xs text-slate-500">Toca Escanear para ver los sectores.</p>
                        ) : (
                            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                                {sectores.map((s) => {
                                    const c = calidadSenal(s.senal);
                                    return (
                                        <li key={s.mac} className="flex items-center justify-between py-2">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.ssid}</p>
                                                <p className="text-xs text-slate-500">{s.frecuencia} GHz · {s.seguridad}</p>
                                            </div>
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PILDORA[c.tono]}`}>{s.senal} dBm</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
