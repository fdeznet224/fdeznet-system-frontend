import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, BanknotesIcon, CheckCircleIcon, ClockIcon, DevicePhoneMobileIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import client from '../../api/axios';
import { useBrand } from '@/context/brand/useBrand';
import { apiErrorMessage } from '@/utils/apiError';
import { fechaCorta, pesos } from '@/components/cobro/imagenCobro';
import { BOTON_EXITO, BOTON_PRIMARIO, BOTON_SECUNDARIO, ETIQUETA_CAMPO, TARJETA } from './estilo';

export interface EstadoProrrateo {
    hay: boolean;
    total?: number;
    saldo?: number;
    pagado?: boolean;
    desde?: string | null;
    hasta?: string | null;
    se_suma_el?: string | null;
    metodo?: string | null;
    cobrado_por?: string | null;
}

type Eleccion = 'transferencia' | 'despues' | null;

/**
 * Al terminar la instalación: el prorrateo se cobra en efectivo (queda a nombre
 * del técnico), por transferencia (el cliente manda su comprobante al WhatsApp y
 * el agente lo aplica) o después (se le avisa y un día antes se le recuerda).
 * `onDecidido` dice si ya se puede terminar la instalación.
 */
export default function ProrrateoInstalacion({ ordenId, onDecidido }: { ordenId: number; onDecidido: (listo: boolean) => void }) {
    const { brand } = useBrand();
    const [estado, setEstado] = useState<EstadoProrrateo | null>(null);
    const [eleccion, setEleccion] = useState<Eleccion>(null);
    const [enviando, setEnviando] = useState(false);
    const [confirmarEfectivo, setConfirmarEfectivo] = useState(false);
    const [sinRespuesta, setSinRespuesta] = useState(false);

    /** Devuelve el estado leído, o null si el servidor no contestó. */
    const cargar = useCallback(async (): Promise<EstadoProrrateo | null> => {
        try {
            const { data } = await client.get<EstadoProrrateo>(`/ordenes/${ordenId}/prorrateo`);
            setEstado(data);
            setSinRespuesta(false);
            return data;
        } catch {
            // No se esconde: el técnico debe saber que no se pudo revisar.
            setSinRespuesta(true);
            return null;
        }
    }, [ordenId]);

    useEffect(() => { void cargar(); }, [cargar]);

    // Esperando la transferencia: se revisa solo hasta que el agente la aplique.
    useEffect(() => {
        if (eleccion !== 'transferencia' || estado?.pagado) return undefined;
        const timer = window.setInterval(() => void cargar(), 5000);
        return () => window.clearInterval(timer);
    }, [cargar, eleccion, estado?.pagado]);

    const sinPendiente = !estado || !estado.hay || Boolean(estado.pagado);
    useEffect(() => {
        // Si el servidor no contesta no se le traba la instalación al técnico.
        onDecidido(sinRespuesta || (estado !== null && (sinPendiente || eleccion === 'despues')));
    }, [eleccion, estado, onDecidido, sinPendiente, sinRespuesta]);

    const decidir = async (accion: 'efectivo' | 'despues') => {
        setEnviando(true);
        try {
            const { data } = await client.post<EstadoProrrateo>(`/ordenes/${ordenId}/prorrateo`, {
                accion,
                clave_idempotencia: `prorrateo-orden-${ordenId}`,
            });
            setEstado(data);
            if (accion === 'despues') setEleccion('despues');
            toast.success(accion === 'efectivo' ? 'Pago registrado a tu nombre' : 'Le avisamos por WhatsApp');
        } catch (error) {
            // Pudo quedar registrado aunque la respuesta fallara: se revisa antes de decir error.
            const actual = await cargar();
            if (accion === 'efectivo' && actual?.pagado) {
                toast.success('Pago registrado a tu nombre');
            } else {
                toast.error(apiErrorMessage(error, 'No se pudo registrar'));
            }
        } finally {
            setEnviando(false);
            setConfirmarEfectivo(false);
        }
    };

    if (sinRespuesta && !estado?.hay) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                <ExclamationTriangleIcon className="h-7 w-7 shrink-0" />
                <p className="flex-1">No se pudo revisar el prorrateo. Revisa tu señal.</p>
                <button type="button" onClick={() => void cargar()} className={`${BOTON_SECUNDARIO} h-10 px-3`}>Reintentar</button>
            </div>
        );
    }
    if (!estado || !estado.hay) return null;
    const monto = pesos(estado.saldo || estado.total || 0);
    const dias = estado.desde && estado.hasta ? `del ${fechaCorta(estado.desde)} al ${fechaCorta(estado.hasta)}` : '';

    if (estado.pagado) {
        return (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10" data-testid="prorrateo-pagado">
                <CheckCircleIcon className="h-9 w-9 shrink-0 text-emerald-600" />
                <div>
                    <p className="font-bold text-emerald-700 dark:text-emerald-400">Prorrateo pagado · {pesos(estado.total || 0)}</p>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                        {estado.metodo === 'efectivo'
                            ? `En efectivo${estado.cobrado_por ? `, cobrado por ${estado.cobrado_por}` : ''}. Muéstraselo al cliente.`
                            : 'Por transferencia, validada por WhatsApp. Muéstraselo al cliente.'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${TARJETA} space-y-3 p-4`} data-testid="prorrateo-pendiente">
            <div>
                <p className={ETIQUETA_CAMPO}>Prorrateo</p>
                <p className="text-lg font-bold">{monto} <span className="text-sm font-medium text-slate-500">{dias}</span></p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    No corta su servicio. Si no lo paga ahora, se suma a su factura del {estado.se_suma_el ? fechaCorta(estado.se_suma_el) : 'próximo pago'}. ¿Lo paga ahora?
                </p>
            </div>

            {eleccion === 'transferencia' ? (
                <div className="space-y-3 rounded-2xl bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
                    <p>
                        Pídele que mande la captura de su transferencia por {monto}
                        {brand.empresa_telefono ? ` al WhatsApp ${brand.empresa_telefono}` : ' a nuestro WhatsApp'}, con su contrato en el concepto.
                        En cuanto se valide, aquí aparece como pagado.
                    </p>
                    <p className="flex items-center gap-2 text-xs font-semibold"><ClockIcon className="h-4 w-4 animate-pulse" />Esperando su comprobante…</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setEleccion(null)} className={`${BOTON_SECUNDARIO} h-10`}>Cambiar</button>
                        <button type="button" disabled={enviando} onClick={() => void decidir('despues')} className={`${BOTON_SECUNDARIO} h-10`}>Lo paga después</button>
                    </div>
                </div>
            ) : eleccion === 'despues' ? (
                <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                    Le llegó el aviso por WhatsApp. Un día antes de sumarse a su factura se le recuerda.
                </p>
            ) : confirmarEfectivo ? (
                <div className="space-y-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    <p>Vas a recibir <b>{monto}</b> en efectivo. El cobro queda a tu nombre y lo entregas en tu corte.</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button type="button" disabled={enviando} onClick={() => setConfirmarEfectivo(false)} className={`${BOTON_SECUNDARIO} h-10`}>Cancelar</button>
                        <button type="button" disabled={enviando} onClick={() => void decidir('efectivo')} className={`${BOTON_EXITO} h-10`}>
                            {enviando ? <><ArrowPathIcon className="h-5 w-5 animate-spin" /> Registrando…</> : 'Ya lo recibí'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-2">
                    <button type="button" onClick={() => setConfirmarEfectivo(true)} className={`${BOTON_PRIMARIO} h-11`}>
                        <BanknotesIcon className="h-5 w-5" /> Lo paga ahora en efectivo
                    </button>
                    <button type="button" onClick={() => setEleccion('transferencia')} className={`${BOTON_SECUNDARIO} h-11`}>
                        <DevicePhoneMobileIcon className="h-5 w-5" /> Por transferencia (WhatsApp)
                    </button>
                    <button type="button" disabled={enviando} onClick={() => void decidir('despues')} className={`${BOTON_SECUNDARIO} h-11`}>
                        Lo paga después
                    </button>
                </div>
            )}
        </div>
    );
}
