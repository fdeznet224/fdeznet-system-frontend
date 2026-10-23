import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BellAlertIcon, ChatBubbleLeftRightIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import CambiarClavePortal from './CambiarClavePortal';
import InstalarApp from './InstalarApp';
import {
    activarNotificaciones, desactivarNotificaciones, estadoNotificaciones, type EstadoNotificaciones,
} from './notificaciones';
import type { Resumen } from './tipos';
import { BOTON, BOTON_SUAVE, CAMPO, ETIQUETA, TARJETA, TITULO, dinero, velocidad } from './ui';

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null | undefined }) {
    return (
        <div className="flex justify-between gap-4 py-2.5 text-sm">
            <span className="text-slate-500 dark:text-slate-400">{etiqueta}</span>
            <span className="text-right font-medium">{valor || '—'}</span>
        </div>
    );
}

function Telefono({ actual, color, onCambio }: { actual: string | null; color: string; onCambio: () => void }) {
    const [paso, setPaso] = useState<'ver' | 'numero' | 'codigo'>('ver');
    const [numero, setNumero] = useState('');
    const [codigo, setCodigo] = useState('');
    const [ocupado, setOcupado] = useState(false);

    const pedir = async () => {
        setOcupado(true);
        try {
            const { data } = await portalClient.post<{ telefono: string; minutos: number }>('/portal/telefono/codigo', { telefono: numero });
            toast.success(`Te mandamos un código por WhatsApp al ${data.telefono}.`, { duration: 8000 });
            setPaso('codigo');
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo mandar el código'));
        } finally {
            setOcupado(false);
        }
    };

    const confirmar = async () => {
        setOcupado(true);
        try {
            await portalClient.post('/portal/telefono/confirmar', { codigo });
            toast.success('Número actualizado. Ahí te llegarán los avisos.');
            setPaso('ver');
            setNumero('');
            setCodigo('');
            onCambio();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo confirmar'));
        } finally {
            setOcupado(false);
        }
    };

    return (
        <section className={`${TARJETA} space-y-4`}>
            <div className="flex items-center gap-4">
                <DevicePhoneMobileIcon className="h-6 w-6 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                    <p className={ETIQUETA}>Tu WhatsApp</p>
                    <p className="text-base font-semibold">{actual || 'Sin número'}</p>
                </div>
                {paso === 'ver' && <button type="button" onClick={() => setPaso('numero')} className={BOTON_SUAVE}>Cambiar</button>}
            </div>
            {paso === 'numero' && (
                <div className="space-y-3">
                    <input type="tel" inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} autoFocus
                        placeholder="Número a 10 dígitos" aria-label="Número nuevo" className={CAMPO} />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Te mandaremos un código por WhatsApp a ese número para confirmarlo.</p>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setPaso('ver')} className={`${BOTON_SUAVE} flex-1`}>Cancelar</button>
                        <button type="button" onClick={() => void pedir()} disabled={ocupado || numero.replace(/\D/g, '').length < 10}
                            className={`${BOTON} h-11 flex-1 text-sm`} style={{ background: color }}>
                            {ocupado ? 'Enviando…' : 'Mandar código'}
                        </button>
                    </div>
                </div>
            )}
            {paso === 'codigo' && (
                <div className="space-y-3">
                    <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                        autoFocus placeholder="Código de 6 dígitos" aria-label="Código" className={`${CAMPO} text-center text-xl tracking-[0.5em]`} />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setPaso('numero')} className={`${BOTON_SUAVE} flex-1`}>Otro número</button>
                        <button type="button" onClick={() => void confirmar()} disabled={ocupado || codigo.length !== 6}
                            className={`${BOTON} h-11 flex-1 text-sm`} style={{ background: color }}>
                            {ocupado ? 'Confirmando…' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}

export function Notificaciones({ color, compacta = false }: { color: string; compacta?: boolean }) {
    const [estado, setEstado] = useState<EstadoNotificaciones | null>(null);
    const [clave, setClave] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => {
        portalClient.get<{ disponible: boolean; clave_publica: string | null }>('/portal/notificaciones')
            .then(async ({ data }) => { setClave(data.clave_publica); setEstado(await estadoNotificaciones(data.disponible)); })
            .catch(() => setEstado('no_disponible'));
    }, []);

    if (!estado || estado === 'no_disponible' || (compacta && estado !== 'apagadas')) return null;

    const cambiar = async () => {
        setOcupado(true);
        try {
            if (estado === 'activas') setEstado(await desactivarNotificaciones());
            else {
                const nuevo = await activarNotificaciones(clave!);
                setEstado(nuevo);
                if (nuevo === 'activas') await portalClient.post('/portal/notificaciones/prueba').catch(() => undefined);
                if (nuevo === 'bloqueadas') toast.error('Las bloqueaste en tu navegador; actívalas en sus ajustes.');
            }
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudieron activar'));
        } finally {
            setOcupado(false);
        }
    };

    return (
        <section className={`${TARJETA} flex items-center gap-4`}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${color}1a`, color }}>
                <BellAlertIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Notificaciones</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {estado === 'activas' ? 'Activas en este celular.' : estado === 'bloqueadas' ? 'Bloqueadas en tu navegador.' : 'Recibe aquí tus avisos de pago y de tu servicio.'}
                </p>
            </div>
            {estado !== 'bloqueadas' && (
                <button type="button" onClick={() => void cambiar()} disabled={ocupado} className={BOTON_SUAVE}>
                    {ocupado ? '…' : estado === 'activas' ? 'Desactivar' : 'Activar'}
                </button>
            )}
        </section>
    );
}

/** Sus datos (lo que el cliente debe ver), su WhatsApp, notificaciones y su contraseña. */
export default function PerfilPortal({ resumen, color, telefonoEmpresa, onCambio, onSalir }: {
    resumen: Resumen; color: string; telefonoEmpresa: string | null; onCambio: () => void; onSalir: () => void;
}) {
    const [cambiandoClave, setCambiandoClave] = useState(false);
    const bajada = resumen.plan ? velocidad(resumen.plan.bajada_kbps) : null;
    const subida = resumen.plan ? velocidad(resumen.plan.subida_kbps) : null;

    return (
        <>
            <section className={TARJETA}>
                <h2 className={TITULO}>{resumen.nombre}</h2>
                <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                    <Dato etiqueta="Contrato" valor={resumen.contrato} />
                    <Dato etiqueta="Zona" valor={resumen.zona} />
                    <Dato etiqueta="Dirección" valor={resumen.direccion} />
                    <Dato etiqueta="Plan" valor={resumen.plan?.nombre} />
                    <Dato etiqueta="Velocidad" valor={bajada && subida ? `${bajada.valor} ${bajada.unidad} / ${subida.valor} ${subida.unidad}` : null} />
                    <Dato etiqueta="Mensualidad" valor={resumen.plan ? dinero(resumen.plan.precio) : null} />
                    {resumen.correo && <Dato etiqueta="Correo" valor={resumen.correo} />}
                </div>
            </section>

            <Telefono actual={resumen.telefono} color={color} onCambio={onCambio} />
            <Notificaciones color={color} />

            <section className={`${TARJETA} space-y-4`}>
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className={TITULO}>Contraseña del portal</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">La que usas para entrar aquí.</p>
                    </div>
                    {!cambiandoClave && <button type="button" onClick={() => setCambiandoClave(true)} className={BOTON_SUAVE}>Cambiar</button>}
                </div>
                {cambiandoClave && <CambiarClavePortal color={color} onListo={() => setCambiandoClave(false)} />}
            </section>

            <InstalarApp color={color} />

            {telefonoEmpresa && (
                <a href={`https://wa.me/${telefonoEmpresa.replace(/\D/g, '').replace(/^(\d{10})$/, '52$1')}`} target="_blank" rel="noreferrer"
                    className={`${TARJETA} flex items-center gap-4`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Escríbenos por WhatsApp</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{telefonoEmpresa}</p>
                    </div>
                </a>
            )}

            <button type="button" onClick={onSalir} className={`${BOTON_SUAVE} w-full text-rose-600 dark:text-rose-400`}>Cerrar sesión</button>
        </>
    );
}
