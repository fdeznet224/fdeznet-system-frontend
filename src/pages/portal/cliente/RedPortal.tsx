import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    ArrowPathIcon, CheckCircleIcon, ChevronDownIcon, ComputerDesktopIcon, DevicePhoneMobileIcon, EyeIcon, EyeSlashIcon, PowerIcon, WifiIcon,
} from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import { redesPorNombre, type EquipoRed, type EstadoRed } from '@/pages/clientes/components/miRed';
import { AVISO, BOTON, BOTON_SUAVE, CAMPO, ERROR, ETIQUETA, TARJETA, TITULO } from './ui';

interface Cambio { equipo: EquipoRed; bloquear: boolean; paso: 'confirmar' | 'aplicando' | 'listo' | 'error'; error?: string }

/** Confirmar el bloqueo y esperar a que la ONU lo aplique, con la ventana abierta hasta el final. */
function VentanaCambio({ cambio, color, onConfirmar, onCerrar }: { cambio: Cambio; color: string; onConfirmar: () => void; onCerrar: () => void }) {
    const nombre = cambio.equipo.nombre || 'este equipo';
    const ocupada = cambio.paso === 'aplicando';
    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center"
            role="dialog" aria-modal="true" aria-labelledby="titulo-cambio" onClick={() => { if (!ocupada) onCerrar(); }}>
            <div className={`${TARJETA} w-full max-w-sm space-y-4 text-center`} onClick={(e) => e.stopPropagation()}>
                {cambio.paso === 'confirmar' && (
                    <>
                        <h2 id="titulo-cambio" className="text-lg font-semibold">{cambio.bloquear ? `¿Quitar el internet a ${nombre}?` : `¿Devolver el internet a ${nombre}?`}</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {cambio.bloquear ? 'Se desconectará de tu WiFi y no podrá volver a conectarse hasta que lo actives.' : 'Podrá conectarse otra vez a tu WiFi.'}
                        </p>
                        <div className="flex gap-2">
                            <button type="button" onClick={onCerrar} className={`${BOTON_SUAVE} flex-1`}>Cancelar</button>
                            <button type="button" onClick={onConfirmar} className={`${BOTON} h-11 flex-1 text-sm`} style={{ background: cambio.bloquear ? '#e11d48' : color }}>
                                {cambio.bloquear ? 'Sí, bloquear' : 'Sí, activar'}
                            </button>
                        </div>
                    </>
                )}
                {ocupada && (
                    <div className="space-y-3 py-4" aria-live="polite">
                        <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                        <p id="titulo-cambio" className="text-base font-semibold">{cambio.bloquear ? 'Bloqueando dispositivo…' : 'Activando dispositivo…'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Lo estamos aplicando en tu módem, tarda unos segundos.</p>
                    </div>
                )}
                {cambio.paso === 'listo' && (
                    <div className="space-y-2 py-4" aria-live="polite">
                        <CheckCircleIcon className="mx-auto h-10 w-10 text-emerald-500" />
                        <p id="titulo-cambio" className="text-base font-semibold">{cambio.bloquear ? `${nombre} ya no tiene internet` : `${nombre} tiene internet otra vez`}</p>
                    </div>
                )}
                {cambio.paso === 'error' && (
                    <>
                        <p id="titulo-cambio" className="text-base font-semibold">No se pudo {cambio.bloquear ? 'bloquear' : 'activar'}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{cambio.error}</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={onCerrar} className={`${BOTON_SUAVE} flex-1`}>Cerrar</button>
                            <button type="button" onClick={onConfirmar} className={`${BOTON} h-11 flex-1 text-sm`} style={{ background: color }}>Reintentar</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function Interruptor({ encendido, ocupado, onCambiar, etiqueta }: { encendido: boolean; ocupado: boolean; onCambiar: () => void; etiqueta: string }) {
    return (
        <button
            type="button" role="switch" aria-checked={encendido} aria-label={etiqueta} onClick={onCambiar} disabled={ocupado}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${encendido ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
        >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${encendido ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
    );
}

function Equipo({ equipo, ocupado, onCambiar }: { equipo: EquipoRed; ocupado: boolean; onCambiar: () => void }) {
    const Icono = equipo.conexion === 'cable' ? ComputerDesktopIcon : DevicePhoneMobileIcon;
    const nombre = equipo.nombre || 'Equipo sin nombre';
    const detalle = equipo.bloqueado ? 'Sin internet' : equipo.conectado ? (equipo.red?.split(' · ')[1] || (equipo.conexion === 'cable' ? 'Por cable' : 'Conectado')) : 'Desconectado';
    return (
        <li className="flex items-center gap-3 py-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${equipo.conectado && !equipo.bloqueado ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200' : 'bg-slate-100/60 text-slate-400 dark:bg-slate-800/50'}`}>
                <Icono className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{nombre}</p>
                <p className={`truncate text-xs ${equipo.bloqueado ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>{detalle}</p>
            </div>
            {equipo.bloqueado !== null && (
                <Interruptor encendido={!equipo.bloqueado} ocupado={ocupado} onCambiar={onCambiar} etiqueta={`Internet de ${nombre}`} />
            )}
        </li>
    );
}

/** La red de la casa para el cliente: su WiFi, sus equipos con un interruptor de internet y reiniciar el módem. */
export default function RedPortal({ color }: { color: string }) {
    const [estado, setEstado] = useState<EstadoRed | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState<string | null>(null);
    const [editando, setEditando] = useState(false);
    const [clave, setClave] = useState('');
    const [verClave, setVerClave] = useState(false);
    const [verDesconectados, setVerDesconectados] = useState(false);
    const [confirmarReinicio, setConfirmarReinicio] = useState(false);
    const [cambio, setCambio] = useState<Cambio | null>(null);

    const leer = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            setEstado((await portalClient.get<EstadoRed>('/portal/red')).data);
        } catch (e) {
            setError(apiErrorMessage(e, 'No se pudo consultar tu módem'));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        const t = window.setTimeout(() => void leer(), 0);
        return () => window.clearTimeout(t);
    }, [leer]);

    const pedirCambio = (equipo: EquipoRed) => setCambio({ equipo, bloquear: !equipo.bloqueado, paso: 'confirmar' });

    const aplicarCambio = async () => {
        if (!cambio) return;
        const { equipo, bloquear } = cambio;
        setCambio({ ...cambio, paso: 'aplicando' });
        try {
            // Responde cuando la ONU ya lo guardó: con eso se actualiza la lista, sin recargar.
            const { data } = await portalClient.post<{ bloqueados: string[] }>('/portal/red/bloqueo', { mac: equipo.mac, bloquear });
            const bloqueados = new Set(data.bloqueados);
            setEstado((actual) => actual && { ...actual, equipos: actual.equipos.map((e) => ({ ...e, bloqueado: bloqueados.has(e.mac) })) });
            setCambio({ ...cambio, paso: 'listo' });
            window.setTimeout(() => setCambio(null), 1500);
        } catch (e) {
            setCambio({ ...cambio, paso: 'error', error: apiErrorMessage(e, 'Tu módem no aceptó el cambio') });
        }
    };

    const guardarClave = async (ssid: string) => {
        setOcupado('wifi');
        try {
            const { data } = await portalClient.post<{ aplicado: boolean }>('/portal/red/clave-wifi', { ssid, clave });
            toast.success(data.aplicado ? 'Listo. Conecta tus equipos con la contraseña nueva.' : 'Tu módem la aplicará en unos minutos.', { duration: 8000 });
            setEditando(false);
            setClave('');
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo cambiar la contraseña'));
        } finally {
            setOcupado(null);
        }
    };

    const reiniciar = async () => {
        setOcupado('reinicio');
        try {
            await portalClient.post('/portal/reiniciar');
            toast.success('Tu módem se está reiniciando. Vuelve en unos 2 minutos.', { duration: 8000 });
            setConfirmarReinicio(false);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo reiniciar tu módem'));
        } finally {
            setOcupado(null);
        }
    };

    const red = estado ? redesPorNombre(estado.redes)[0] : undefined;
    const activos = estado?.equipos.filter((e) => e.conectado || e.bloqueado) ?? [];
    const desconectados = estado?.equipos.filter((e) => !e.conectado && !e.bloqueado) ?? [];

    return (
        <div className="space-y-4">
            {error && <p className={ERROR}>{error}</p>}
            {estado && !estado.tr069 && <p className={AVISO}>Tu módem todavía no está conectado al portal. Pronto podrás ver y controlar tus equipos aquí.</p>}
            {estado?.tr069 && !estado.al_dia && <p className={AVISO}>Tu módem no contestó ahora; ves lo último que reportó.</p>}

            {red && (
                <section className={`${TARJETA} space-y-4`}>
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: color }}>
                            <WifiIcon className="h-6 w-6" />
                        </span>
                        <div className="min-w-0">
                            <p className={ETIQUETA}>Tu WiFi</p>
                            <p className="truncate text-lg font-semibold">{red.ssid}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{red.bandas.join(' y ') || 'WiFi'} · {red.conectados} {red.conectados === 1 ? 'equipo' : 'equipos'}</p>
                        </div>
                    </div>
                    {editando ? (
                        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void guardarClave(red.ssid); }}>
                            <div className="relative">
                                <input
                                    type={verClave ? 'text' : 'password'} value={clave} onChange={(e) => setClave(e.target.value)} autoFocus
                                    minLength={8} maxLength={63} placeholder="Contraseña nueva" aria-label="Contraseña nueva del WiFi" className={`${CAMPO} pr-12`}
                                />
                                <button type="button" onClick={() => setVerClave((v) => !v)} aria-label={verClave ? 'Ocultar' : 'Mostrar'} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400">
                                    {verClave ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">De 8 a 63 caracteres, sin acentos ni ñ. Todos tus equipos tendrán que conectarse de nuevo.</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setEditando(false)} className={`${BOTON_SUAVE} flex-1`}>Cancelar</button>
                                <button type="submit" disabled={clave.length < 8 || ocupado === 'wifi'} className={`${BOTON} h-11 flex-1 text-sm`} style={{ background: color }}>
                                    {ocupado === 'wifi' ? 'Guardando…' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button type="button" onClick={() => { setEditando(true); setClave(''); }} className={`${BOTON_SUAVE} w-full`}>Cambiar contraseña</button>
                    )}
                </section>
            )}

            {estado && (
                <section className={TARJETA}>
                    <div className="flex items-center justify-between">
                        <h2 className={TITULO}>Equipos conectados <span className="font-normal text-slate-400">{activos.filter((e) => e.conectado).length}</span></h2>
                        <button type="button" onClick={() => void leer()} disabled={cargando} aria-label="Actualizar" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                            <ArrowPathIcon className={`h-5 w-5 ${cargando ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {!estado.bloqueo_disponible && (
                        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                            <span>No pudimos revisar qué equipos están bloqueados. Inténtalo en un momento.</span>
                            <button type="button" onClick={() => void leer()} className="shrink-0 font-semibold underline">Actualizar</button>
                        </div>
                    )}
                    {estado.bloqueo_disponible && activos.length > 0 && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Apaga el interruptor para quitarle el internet a un equipo.</p>
                    )}
                    <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800" data-testid="equipos-portal">
                        {activos.map((e) => <Equipo key={e.mac} equipo={e} ocupado={ocupado === e.mac} onCambiar={() => pedirCambio(e)} />)}
                        {activos.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No hay equipos conectados ahora.</li>}
                    </ul>
                    {desconectados.length > 0 && (
                        <>
                            <button type="button" onClick={() => setVerDesconectados((v) => !v)} className="mt-2 flex w-full items-center justify-between rounded-2xl px-1 py-2 text-sm text-slate-500 dark:text-slate-400">
                                Desconectados ({desconectados.length})
                                <ChevronDownIcon className={`h-4 w-4 transition ${verDesconectados ? 'rotate-180' : ''}`} />
                            </button>
                            {verDesconectados && (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {desconectados.map((e) => <Equipo key={e.mac} equipo={e} ocupado={ocupado === e.mac} onCambiar={() => pedirCambio(e)} />)}
                                </ul>
                            )}
                        </>
                    )}
                </section>
            )}

            {!estado && cargando && (
                <div className={`${TARJETA} flex flex-col items-center gap-3 py-10 text-center`} data-testid="cargando-red">
                    <ArrowPathIcon className="h-6 w-6 animate-spin text-slate-400" />
                    <p className="text-sm font-medium">Cargando tus equipos…</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Estamos consultando tu módem, tarda unos segundos.</p>
                </div>
            )}

            {estado?.tr069 && (
            <section className={`${TARJETA} space-y-3`}>
                <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <PowerIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Reiniciar mi módem</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Si el internet anda lento o se traba.</p>
                    </div>
                    {!confirmarReinicio && <button type="button" onClick={() => setConfirmarReinicio(true)} className={BOTON_SUAVE}>Reiniciar</button>}
                </div>
                {confirmarReinicio && (
                    <div className="space-y-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/60">
                        <p className="text-sm text-slate-600 dark:text-slate-300">Te quedarás sin internet unos 2 minutos mientras se reinicia.</p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmarReinicio(false)} className={`${BOTON_SUAVE} flex-1`}>Cancelar</button>
                            <button type="button" onClick={() => void reiniciar()} disabled={ocupado === 'reinicio'} className={`${BOTON} h-11 flex-1 text-sm`} style={{ background: color }}>
                                {ocupado === 'reinicio' ? 'Reiniciando…' : 'Sí, reiniciar'}
                            </button>
                        </div>
                    </div>
                )}
            </section>
            )}
            {cambio && <VentanaCambio cambio={cambio} color={color} onConfirmar={() => void aplicarCambio()} onCerrar={() => setCambio(null)} />}
        </div>
    );
}
