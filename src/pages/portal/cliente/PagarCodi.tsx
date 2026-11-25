import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, DevicePhoneMobileIcon, QrCodeIcon, ShareIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import { BOTON, BOTON_SUAVE, CAMPO, ETIQUETA, dinero } from './ui';

const legible = (n: string) => (n.length === 10 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : n);
const hora = (iso: string) => new Date(iso).toLocaleString('es-MX', { weekday: 'long', hour: 'numeric', minute: '2-digit' });

interface Qr { cobro_id: number; monto: string; vence_en: string | null; qr_png: string }

/** Mientras espera, pregunta cada 5 s si ya se pagó (el pago se aplica solo). */
function usePagado(cobroId: number | null, onPagado: () => void) {
    const [pagado, setPagado] = useState<number | null>(null);
    useEffect(() => {
        if (!cobroId) return undefined;
        let vigente = true;
        const cada = window.setInterval(() => {
            if (document.visibilityState !== 'visible') return;
            portalClient.get<{ estado: string }>(`/portal/pago-codi/${cobroId}`)
                .then(({ data }) => {
                    if (vigente && data.estado === 'pagado') {
                        setPagado(cobroId);
                        window.clearInterval(cada);
                        // Que alcance a ver el aviso antes de que se recargue su cuenta.
                        window.setTimeout(onPagado, 4000);
                    }
                })
                .catch(() => undefined);
        }, 5000);
        return () => { vigente = false; window.clearInterval(cada); };
    }, [cobroId, onPagado]);
    return pagado !== null && pagado === cobroId;
}

/** Cobro CoDi: le llega a la app de su banco, lo acepta y el pago se aplica solo. */
export default function PagarCodi({ total: debe, celular, color, onPagado }: { total: number; celular: string | null; color: string; onPagado: () => void }) {
    const [numero, setNumero] = useState(legible(celular ?? ''));
    // Meses por adelantado: al corriente, al menos uno.
    const [meses, setMeses] = useState(debe > 0 ? 0 : 1);
    const [adelanto, setAdelanto] = useState<{ meses: { mes: string; total: number; incluye?: string[] }[]; total: number } | null>(null);
    useEffect(() => {
        if (!meses) return undefined;
        let vigente = true;
        portalClient.get<{ meses: { mes: string; total: number; incluye?: string[] }[]; total: number }>('/portal/adelanto', { params: { meses } })
            .then(({ data }) => { if (vigente) setAdelanto(data); })
            .catch(() => { if (vigente) setAdelanto(null); });
        return () => { vigente = false; };
    }, [meses]);
    const cotizado = meses > 0 && adelanto && adelanto.meses.length > 0 ? adelanto : null;
    const total = debe + (cotizado ? cotizado.total : 0);
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState<{ cobro: number; celular: string; minutos: number } | null>(null);
    const [qr, setQr] = useState<Qr | null>(null);
    const [pidiendoQr, setPidiendoQr] = useState(false);
    const limpio = numero.replace(/\D/g, '');
    const pagadoCelular = usePagado(enviado?.cobro ?? null, onPagado);
    const pagadoQr = usePagado(qr?.cobro_id ?? null, onPagado);

    const pagar = async () => {
        setEnviando(true);
        try {
            const { data } = await portalClient.post<{ cobro_id: number; celular: string; vence_en_minutos: number }>('/portal/pago-codi', { telefono: limpio, meses_adelanto: cotizado ? meses : 0 });
            setEnviado({ cobro: data.cobro_id, celular: data.celular, minutos: data.vence_en_minutos });
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo mandar el cobro'));
        } finally {
            setEnviando(false);
        }
    };

    const pedirQr = async () => {
        setPidiendoQr(true);
        try {
            const { data } = await portalClient.post<Qr>('/portal/pago-codi/qr', { meses_adelanto: cotizado ? meses : 0 });
            setQr(data);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo generar el QR'));
        } finally {
            setPidiendoQr(false);
        }
    };

    const compartirQr = async () => {
        if (!qr) return;
        const archivo = new File([Uint8Array.from(atob(qr.qr_png), (c) => c.charCodeAt(0))], 'qr-pago.png', { type: 'image/png' });
        const texto = `QR para pagar ${dinero(Number(qr.monto))} de mi internet. Escanéalo desde la app de tu banco (CoDi).`;
        if (navigator.canShare?.({ files: [archivo] })) {
            try {
                await navigator.share({ files: [archivo], text: texto });
            } catch {
                // Canceló compartir.
            }
            return;
        }
        const enlace = document.createElement('a');
        enlace.href = `data:image/png;base64,${qr.qr_png}`;
        enlace.download = 'qr-pago.png';
        enlace.click();
    };

    if (pagadoCelular || pagadoQr) {
        return (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200" data-testid="codi-pagado">
                <CheckCircleIcon className="h-8 w-8 shrink-0 text-emerald-500" />
                <p><span className="block font-semibold">¡Pago recibido!</span>Ya quedó aplicado; te llega tu recibo por WhatsApp.</p>
            </div>
        );
    }

    if (qr) {
        return (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-center text-sm dark:bg-slate-800/60" data-testid="codi-qr">
                <p className="font-semibold">Que lo escanee quien te paga</p>
                <img src={`data:image/png;base64,${qr.qr_png}`} alt={`QR para pagar ${dinero(Number(qr.monto))}`} className="mx-auto w-56 rounded-xl bg-white p-2" />
                <p className="text-slate-600 dark:text-slate-300">
                    {dinero(Number(qr.monto))} · desde la app de su banco (CoDi o “Pagar con QR”).{qr.vence_en ? ` Vale hasta el ${hora(qr.vence_en)}.` : ''}
                </p>
                <button type="button" onClick={() => void compartirQr()} className={`${BOTON_SUAVE} w-full`}>
                    <ShareIcon className="h-4 w-4" /> Compartir QR
                </button>
                <button type="button" onClick={() => setQr(null)} className="text-xs font-semibold" style={{ color }}>Regresar</button>
            </div>
        );
    }

    if (enviado) {
        return (
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60" data-testid="codi-enviado">
                <p className="font-semibold">Abre la app de tu banco</p>
                <p className="text-slate-600 dark:text-slate-300">
                    Te mandamos el cobro de {dinero(total)} al {legible(enviado.celular)}. Acéptalo en los próximos {enviado.minutos} minutos
                    y tu pago se aplica solo; te llega tu recibo por WhatsApp.
                </p>
                <button type="button" onClick={() => setEnviado(null)} className="text-xs font-semibold" style={{ color }}>
                    ¿No te llegó? Mandarlo de nuevo o a otro número
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3" data-testid="pagar-codi">
            <div>
                <span className={ETIQUETA}>{debe > 0 ? '¿Quieres adelantar meses?' : '¿Cuántos meses quieres adelantar?'}</span>
                <div className="mt-1.5 flex gap-1.5" role="radiogroup" aria-label="Meses por adelantado">
                    {(debe > 0 ? [0, 1, 2, 3] : [1, 2, 3, 6]).map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={meses === n} onClick={() => setMeses(n)}
                            className={`flex-1 rounded-xl px-2 py-2 text-sm font-semibold transition ${meses === n ? 'text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`}
                            style={meses === n ? { background: color } : undefined}>
                            {n === 0 ? 'No' : `${debe > 0 ? '+' : ''}${n} ${n === 1 ? 'mes' : 'meses'}`}
                        </button>
                    ))}
                </div>
                {cotizado && (
                    <p className="mt-1.5 px-1 text-xs text-slate-500 dark:text-slate-400" data-testid="adelanto-detalle">
                        {cotizado.meses.map((m) => `${m.mes} ${dinero(m.total)}${m.incluye?.length ? ` (incluye ${m.incluye.join(', ')})` : ''}`).join(' · ')}{debe > 0 ? ` · más lo que debes ${dinero(debe)}` : ''}
                    </p>
                )}
            </div>
            <label className="block">
                <span className={ETIQUETA}>Celular registrado en la app de tu banco</span>
                <input type="tel" inputMode="numeric" autoComplete="tel" maxLength={14} value={numero}
                    onChange={(e) => setNumero(e.target.value)} placeholder="10 dígitos" className={`${CAMPO} mt-1.5`} />
            </label>
            <button type="button" onClick={() => void pagar()} disabled={limpio.length !== 10 || enviando || total <= 0} className={BOTON} style={{ background: color }}>
                <DevicePhoneMobileIcon className="h-5 w-5" />
                {enviando ? 'Mandando…' : `Pagar ${dinero(total)} con mi banco`}
            </button>
            <p className="px-1 text-xs text-slate-500 dark:text-slate-400">Sin captura: aceptas el cobro (CoDi) en tu banco y tu pago queda aplicado al momento.</p>
            <details className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300" data-testid="que-es-codi">
                <summary className="cursor-pointer font-semibold text-slate-800 dark:text-slate-100">¿Qué es CoDi?</summary>
                <div className="mt-2 space-y-2 leading-relaxed">
                    <p>Es el pago digital del Banco de México. El cobro te llega a la app de tu banco, lo aceptas y el dinero pasa al momento, cualquier día y a cualquier hora.</p>
                    <p><span className="font-semibold">Sin comisión y seguro:</span> no das tu tarjeta ni contraseñas; todo pasa dentro de la app de tu banco.</p>
                    <p className="font-semibold">Si no te llega el cobro, actívalo una sola vez:</p>
                    <ol className="list-decimal space-y-1 pl-5">
                        <li>Abre la app de tu banco.</li>
                        <li>Busca la opción <span className="font-semibold">CoDi</span> o <span className="font-semibold">Cobro Digital</span>.</li>
                        <li>Regístrala con tu número de celular.</li>
                    </ol>
                    <p>Si tu banco no lo tiene, puedes seguir pagando como siempre en “Otras formas de pago”.</p>
                </div>
            </details>
            <button type="button" onClick={() => void pedirQr()} disabled={pidiendoQr} className={`${BOTON_SUAVE} w-full`}>
                <QrCodeIcon className="h-4 w-4" /> {pidiendoQr ? 'Generando…' : '¿Te paga alguien más? Mostrar QR'}
            </button>
        </div>
    );
}
