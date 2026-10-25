import { useEffect, useRef, useState } from 'react';
import { CheckCircleIcon, ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import type { EstadoServicio } from './tipos';
import { BOTON_SUAVE, TARJETA } from './ui';

// Mientras hay algo en curso se revisa seguido; si no, de vez en cuando por si cae la zona.
const CADA_EN_CURSO = 20_000;
const CADA_NORMAL = 60_000;

const ALCANCE: Record<NonNullable<EstadoServicio['falla']>['alcance'], string> = {
    nodo: 'Hay una falla en tu zona',
    troncal: 'Hay una falla en la fibra de tu zona',
    caja: 'Hay una falla en la caja de fibra de tu calle',
};

function hora(iso: string | null): string {
    if (!iso) return '';
    const fecha = new Date(iso);
    const texto = fecha.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
    return fecha.toDateString() === new Date().toDateString() ? texto : `${fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}, ${texto}`;
}

const enCurso = (estado: EstadoServicio | null) => Boolean(
    estado?.falla || (estado?.reconexion && !(estado.reconexion.etapa === 'reactivado' && estado.reconexion.conectado)),
);

/** Arriba de Inicio: falla en su zona o cómo va su reconexión después de pagar. */
export default function EstadoServicioPortal({ color, tieneOnu, onReactivado }: { color: string; tieneOnu: boolean; onReactivado: () => void }) {
    const [estado, setEstado] = useState<EstadoServicio | null>(null);
    const [reiniciando, setReiniciando] = useState(false);
    const etapaAnterior = useRef<string | null>(null);

    useEffect(() => {
        let vigente = true;
        let espera: number | undefined;
        const leer = async (primera = false) => {
            let siguiente = CADA_NORMAL;
            if (primera || document.visibilityState === 'visible') {
                try {
                    const { data } = await portalClient.get<EstadoServicio>('/portal/estado-servicio');
                    if (!vigente) return;
                    const etapa = data.reconexion?.etapa ?? null;
                    // Al reactivarse cambia su cuenta (ya no dice suspendido): se recarga.
                    if (etapa === 'reactivado' && etapaAnterior.current && etapaAnterior.current !== 'reactivado') onReactivado();
                    etapaAnterior.current = etapa;
                    setEstado(data);
                    if (enCurso(data)) siguiente = CADA_EN_CURSO;
                } catch { /* sin aviso: se intenta en la siguiente vuelta */ }
            }
            if (vigente) espera = window.setTimeout(() => void leer(), siguiente);
        };
        void leer(true);
        return () => { vigente = false; window.clearTimeout(espera); };
    }, [onReactivado]);

    const reiniciar = async () => {
        setReiniciando(true);
        try {
            await portalClient.post('/portal/reiniciar');
            toast.success('Tu módem se está reiniciando. Vuelve en unos 2 minutos.', { duration: 8000 });
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo reiniciar tu módem'));
        } finally {
            setReiniciando(false);
        }
    };

    if (!estado) return null;
    const { falla, reconexion } = estado;

    if (falla) {
        return (
            <section className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/20" data-testid="falla-zona">
                <div className="flex gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-amber-600 dark:text-amber-300" />
                    <div className="space-y-1">
                        <p className="font-semibold text-amber-900 dark:text-amber-100">{ALCANCE[falla.alcance]}</p>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            {falla.desde ? `Desde las ${hora(falla.desde)}` : 'Desde hace un momento'} varios vecinos están sin internet.
                            Ya lo sabemos y estamos trabajando para resolverlo; no necesitas reportarlo ni reiniciar tu módem.
                        </p>
                    </div>
                </div>
            </section>
        );
    }

    if (!reconexion) return null;

    if (reconexion.etapa === 'reactivado') {
        return (
            <section className={`${TARJETA} space-y-3`} data-testid="reconexion">
                <div className="flex gap-3">
                    <CheckCircleIcon className="h-6 w-6 shrink-0 text-emerald-500" />
                    <div className="space-y-1">
                        <p className="font-semibold">Tu servicio se reactivó{reconexion.desde ? ` a las ${hora(reconexion.desde)}` : ''}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {reconexion.conectado
                                ? 'Ya estás conectado. ¡Gracias por tu pago!'
                                : tieneOnu
                                    ? 'Si en unos minutos aún no tienes internet, reinicia tu módem.'
                                    : 'Si en unos minutos aún no tienes internet, desconecta tu módem de la luz y vuelve a conectarlo.'}
                        </p>
                    </div>
                </div>
                {!reconexion.conectado && tieneOnu && (
                    <button type="button" onClick={() => void reiniciar()} disabled={reiniciando} className={`${BOTON_SUAVE} w-full`}>
                        {reiniciando ? 'Reiniciando…' : 'Reiniciar mi módem'}
                    </button>
                )}
            </section>
        );
    }

    return (
        <section className={TARJETA} data-testid="reconexion">
            <div className="flex gap-3">
                <span className="relative flex h-6 w-6 shrink-0 items-center justify-center" style={{ color }}>
                    <ClockIcon className="h-6 w-6" />
                </span>
                <div className="space-y-1">
                    <p className="font-semibold">
                        {reconexion.etapa === 'reactivando' ? 'Estamos reactivando tu servicio' : 'Recibimos tu comprobante'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {reconexion.etapa === 'reactivando'
                            ? 'Tu pago ya quedó aplicado. Tu internet vuelve en unos minutos (máximo 10); aquí te avisamos.'
                            : `Lo recibimos${reconexion.desde ? ` a las ${hora(reconexion.desde)}` : ''} y lo está revisando un asesor. Al aprobarse, tu servicio se reactiva solo.`}
                    </p>
                </div>
            </div>
        </section>
    );
}
