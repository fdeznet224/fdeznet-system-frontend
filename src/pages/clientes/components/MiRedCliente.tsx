import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, NoSymbolIcon, WifiIcon, ComputerDesktopIcon, LockClosedIcon, KeyIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import {
    BOTON_ACCION_PRIMARIO, BOTON_ACCION_SECUNDARIO, BOTON_ICONO, CAMPO, PILDORA, TARJETA, TITULO_SECCION,
} from '@/components/ui/estilo';
import { apiErrorMessage } from '@/utils/apiError';
import { nombreEquipo, redesPorNombre, type AccesoPortal, type EquipoRed, type EstadoRed, type OnuAutomatica } from './miRed';

function hace(fecha: string | null) {
    if (!fecha) return 'nunca';
    const minutos = Math.round((Date.now() - new Date(fecha).getTime()) / 60000);
    if (minutos < 1) return 'hace un momento';
    if (minutos < 60) return `hace ${minutos} min`;
    return new Date(fecha).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * La red de la casa del cliente vista desde su ONU: qué equipos tiene, cuáles
 * bloquear y la contraseña del WiFi. El nombre de la red no se cambia (va en
 * el contrato). El cliente ve lo suyo en su portal (pages/portal/cliente).
 */
export default function MiRedCliente({ clienteId }: { clienteId: number }) {
    const base = `/clientes/${clienteId}/red`;
    const [acceso, setAcceso] = useState<AccesoPortal | null>(null);
    const [automatica, setAutomatica] = useState<OnuAutomatica | null>(null);
    const [estado, setEstado] = useState<EstadoRed | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState<string | null>(null);
    const [editando, setEditando] = useState<string | null>(null);
    const [clave, setClave] = useState('');

    const leer = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            const { data } = await client.get<EstadoRed>(base);
            setEstado(data);
        } catch (e) {
            setError(apiErrorMessage(e, 'No se pudo leer la red del cliente'));
        } finally {
            setCargando(false);
        }
    }, [base]);

    useEffect(() => {
        client.get<AccesoPortal>(`/clientes/${clienteId}/portal-acceso`).then(({ data }) => setAcceso(data)).catch(() => setAcceso(null));
        client.get<OnuAutomatica | null>(`/clientes/${clienteId}/onu-automatica`).then(({ data }) => setAutomatica(data?.estado ? data : null)).catch(() => setAutomatica(null));
    }, [clienteId]);

    const reintentarAutomatica = async () => {
        setOcupado('automatica');
        try {
            const { data } = await client.post<OnuAutomatica>(`/clientes/${clienteId}/onu-automatica/reintentar`);
            setAutomatica(data);
            toast.success('Listo: en cuanto la ONU se reporte se configura sola.');
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo reintentar'));
        } finally {
            setOcupado(null);
        }
    };

    const restablecerPortal = async () => {
        setOcupado('portal');
        try {
            const { data } = await client.post<AccesoPortal>(`/clientes/${clienteId}/portal-acceso/restablecer`);
            setAcceso(data);
            toast.success(`Listo: entra con su contrato ${data.contrato} y pone una contraseña nueva.`);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo restablecer'));
        } finally {
            setOcupado(null);
        }
    };


    useEffect(() => {
        const t = window.setTimeout(() => void leer(), 0);
        return () => window.clearTimeout(t);
    }, [leer]);

    const bloquear = async (equipo: EquipoRed) => {
        const bloquearlo = !equipo.bloqueado;
        setOcupado(equipo.mac);
        try {
            const { data } = await client.post<{ bloqueados: string[] }>(`${base}/bloqueo`, { mac: equipo.mac, bloquear: bloquearlo });
            const bloqueados = new Set(data.bloqueados);
            setEstado((actual) => actual && {
                ...actual,
                equipos: actual.equipos.map((e) => ({ ...e, bloqueado: bloqueados.has(e.mac) })),
            });
            toast.success(bloquearlo ? `${nombreEquipo(equipo) || equipo.mac} quedó sin internet` : `${nombreEquipo(equipo) || equipo.mac} tiene internet otra vez`);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'La ONU no aceptó el cambio'));
        } finally {
            setOcupado(null);
        }
    };

    const guardarClave = async (ssid: string) => {
        setOcupado(ssid);
        try {
            const { data } = await client.post<{ aplicado: boolean; bandas: number }>(`${base}/clave-wifi`, { ssid, clave });
            toast.success(data.aplicado
                ? `Contraseña de ${ssid} cambiada. Los equipos se reconectan con la nueva.`
                : 'La ONU no contestó: el cambio se aplica en unos minutos.');
            setEditando(null);
            setClave('');
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo cambiar la contraseña'));
        } finally {
            setOcupado(null);
        }
    };

    const conectados = estado?.equipos.filter((e) => e.conectado).length ?? 0;
    const bloqueados = estado?.equipos.filter((e) => e.bloqueado).length ?? 0;

    return (
        <div className="space-y-4">
            <div className={`${TARJETA} flex items-center justify-between gap-3 p-4`}>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Red de la casa</h3>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {estado ? `${estado.modelo || 'ONU'} · ${estado.ip || 'sin IP'} · reporte ${hace(estado.ultimo_reporte)}` : 'Leyendo la ONU del cliente...'}
                    </p>
                </div>
                <button type="button" onClick={() => void leer()} disabled={cargando} aria-label="Actualizar" className={BOTON_ICONO}>
                    <ArrowPathIcon className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}

            {estado && !estado.tr069 && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    Esta ONU todavía no se reporta por TR-069: hay que activarle el ACS y la WAN TR069_INTERNET.
                </p>
            )}
            {estado?.tr069 && !estado.al_dia && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    La ONU no contestó ahora; se muestra lo último que reportó.
                </p>
            )}
            {estado?.error_bloqueo && (
                <p className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Bloqueo no disponible: {estado.error_bloqueo}
                </p>
            )}

            {estado && estado.redes.length > 0 && (
                <section className="space-y-2">
                    <h4 className={TITULO_SECCION}>WiFi</h4>
                    {redesPorNombre(estado.redes).map((red) => (
                        <div key={red.ssid} className={`${TARJETA} space-y-3 p-4`}>
                            <div className="flex items-center gap-3">
                                <WifiIcon className={`h-5 w-5 shrink-0 ${red.activa ? 'text-blue-600 dark:text-blue-400' : 'text-slate-300'}`} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{red.ssid}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{red.bandas.join(' y ') || 'WiFi'} · {red.conectados} conectados</p>
                                </div>
                                {editando !== red.ssid && (
                                    <button type="button" onClick={() => { setEditando(red.ssid); setClave(''); }} className={BOTON_ACCION_SECUNDARIO}>
                                        <LockClosedIcon className="h-4 w-4" /> Contraseña
                                    </button>
                                )}
                            </div>
                            {editando === red.ssid && (
                                <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void guardarClave(red.ssid); }}>
                                    <input
                                        type="text" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus
                                        minLength={8} maxLength={63} placeholder="Nueva contraseña (8 a 63 caracteres)" className={CAMPO}
                                    />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Se cambia en {red.bandas.length > 1 ? 'las dos bandas' : 'esta red'}; todos los equipos tendrán que volver a conectarse. El nombre de la red no se cambia.
                                    </p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setEditando(null)} className={`${BOTON_ACCION_SECUNDARIO} flex-1`}>Cancelar</button>
                                        <button type="submit" disabled={clave.length < 8 || ocupado === red.ssid} className={`${BOTON_ACCION_PRIMARIO} flex-1`}>
                                            {ocupado === red.ssid ? 'Guardando...' : 'Guardar'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    ))}
                </section>
            )}

            {estado && (
                <section className="space-y-2">
                    <h4 className={TITULO_SECCION}>Equipos · {conectados} conectados{bloqueados ? ` · ${bloqueados} bloqueados` : ''}</h4>
                    <div className={`${TARJETA} divide-y divide-slate-100 dark:divide-slate-800`} data-testid="equipos-red">
                        {estado.equipos.length === 0 && <p className="p-4 text-center text-sm text-slate-400">La ONU no reporta equipos.</p>}
                        {estado.equipos.map((equipo) => (
                            <div key={equipo.mac} className="flex items-center gap-3 p-3">
                                {equipo.conexion === 'cable'
                                    ? <ComputerDesktopIcon className="h-5 w-5 shrink-0 text-slate-400" />
                                    : <WifiIcon className="h-5 w-5 shrink-0 text-slate-400" />}
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate text-sm font-semibold ${equipo.conectado ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                                        {nombreEquipo(equipo) || 'Sin nombre'}
                                    </p>
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                        {[equipo.apodo && equipo.nombre, equipo.ip, equipo.mac, equipo.red].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                {equipo.bloqueado
                                    ? <span className={`hidden rounded-full px-2 py-0.5 text-xs font-semibold sm:inline ${PILDORA.rojo}`}>Bloqueado</span>
                                    : equipo.conectado && <span className={`hidden rounded-full px-2 py-0.5 text-xs font-semibold sm:inline ${PILDORA.verde}`}>Conectado</span>}
                                {estado.bloqueo_disponible && (
                                    <button
                                        type="button" onClick={() => void bloquear(equipo)} disabled={ocupado === equipo.mac}
                                        className={equipo.bloqueado ? BOTON_ACCION_SECUNDARIO : `${BOTON_ACCION_SECUNDARIO} text-rose-600 dark:text-rose-400`}
                                    >
                                        <NoSymbolIcon className="h-4 w-4" />
                                        {ocupado === equipo.mac ? '...' : equipo.bloqueado ? 'Desbloquear' : 'Bloquear'}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}
            {automatica && (
                <div className={`${TARJETA} flex items-center gap-3 p-4`} data-testid="onu-automatica">
                    <WifiIcon className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Configuración automática · {{ pendiente: 'esperando a la ONU', aplicado: 'hecha', vencido: 'la ONU no se reportó', error: 'la ONU la rechazó', manual: 'a mano (ZTE)' }[automatica.estado]}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            WiFi {automatica.red} · contraseña de instalación {automatica.clave}
                            {automatica.aplicado_en ? ` · ${hace(automatica.aplicado_en)}` : ''}
                        </p>
                        {automatica.detalle && <p className="text-xs text-amber-700 dark:text-amber-300">{automatica.detalle}</p>}
                    </div>
                    {(automatica.estado === 'vencido' || automatica.estado === 'error') && (
                        <button type="button" onClick={() => void reintentarAutomatica()} disabled={ocupado === 'automatica'} className={BOTON_ACCION_SECUNDARIO}>
                            {ocupado === 'automatica' ? '...' : 'Reintentar'}
                        </button>
                    )}
                </div>
            )}
            {acceso && (
                <div className={`${TARJETA} flex items-center gap-3 p-4`}>
                    <KeyIcon className="h-5 w-5 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Portal del cliente</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {!acceso.contrato ? 'Sin contrato: no puede entrar al portal.'
                                : acceso.activado
                                    ? `Entra en /cliente con el contrato ${acceso.contrato} y su contraseña · último acceso ${hace(acceso.ultimo_acceso)}`
                                    : `Aún no entra. La primera vez usa su contrato ${acceso.contrato} como contraseña y pone una suya.`}
                        </p>
                    </div>
                    {acceso.activado && (
                        <button type="button" onClick={() => void restablecerPortal()} disabled={ocupado === 'portal'} className={BOTON_ACCION_SECUNDARIO}>
                            {ocupado === 'portal' ? '...' : 'Restablecer'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
