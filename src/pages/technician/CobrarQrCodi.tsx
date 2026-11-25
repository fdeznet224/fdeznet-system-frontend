import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, QrCodeIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';
import { BOTON_PRIMARIO, BOTON_SECUNDARIO } from './estilo';

interface Qr { cobro_id: number; monto: string; vence_en: string | null; qr_png: string }

const pesos = (monto: number) => monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

/**
 * Cobro en campo: el cliente escanea el QR desde la app de su banco y el pago
 * se aplica solo. Sin efectivo ni capturas. Solo aparece si CoDi está activo
 * para este cliente.
 */
export default function CobrarQrCodi({ clienteId, deuda, onPagado }: { clienteId: number; deuda: number; onPagado: () => void }) {
    const [disponible, setDisponible] = useState(false);
    const [qr, setQr] = useState<Qr | null>(null);
    const [generando, setGenerando] = useState(false);
    const [pagado, setPagado] = useState(false);

    useEffect(() => {
        let vigente = true;
        client.get<{ disponible: boolean }>(`/pagos/codi/clientes/${clienteId}`)
            .then(({ data }) => { if (vigente) setDisponible(data.disponible); })
            .catch(() => undefined);
        return () => { vigente = false; };
    }, [clienteId]);

    useEffect(() => {
        if (!qr || pagado) return undefined;
        let vigente = true;
        const cada = window.setInterval(() => {
            client.get<{ estado: string }>(`/pagos/codi/cobros/${qr.cobro_id}`)
                .then(({ data }) => {
                    if (vigente && data.estado === 'pagado') {
                        setPagado(true);
                        window.clearInterval(cada);
                        window.setTimeout(onPagado, 3000);
                    }
                })
                .catch(() => undefined);
        }, 4000);
        return () => { vigente = false; window.clearInterval(cada); };
    }, [qr, pagado, onPagado]);

    if (!disponible || deuda <= 0) return null;

    const generar = async () => {
        setGenerando(true);
        try {
            const { data } = await client.post<Qr>(`/pagos/codi/clientes/${clienteId}/qr`);
            setQr(data);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo generar el QR'));
        } finally {
            setGenerando(false);
        }
    };

    if (pagado) {
        return (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" data-testid="qr-codi-pagado">
                <CheckCircleIcon className="h-7 w-7 shrink-0" /> Pago recibido y aplicado. Al cliente le llega su recibo por WhatsApp.
            </div>
        );
    }

    if (qr) {
        return (
            <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-center dark:bg-slate-800/60" data-testid="qr-codi-tecnico">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Que el cliente lo escanee desde la app de su banco</p>
                <img src={`data:image/png;base64,${qr.qr_png}`} alt={`QR para cobrar ${pesos(Number(qr.monto))}`} className="mx-auto w-64 rounded-xl bg-white p-2" />
                <p className="text-2xl font-black text-slate-900 dark:text-white">{pesos(Number(qr.monto))}</p>
                <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> Esperando el pago… (vale 30 minutos)
                </p>
                <button type="button" onClick={() => setQr(null)} className={`${BOTON_SECUNDARIO} w-full`}>Cerrar</button>
            </div>
        );
    }

    return (
        <button type="button" onClick={() => void generar()} disabled={generando} className={`${BOTON_PRIMARIO} w-full`} data-testid="cobrar-qr-codi">
            <QrCodeIcon className="h-5 w-5" /> {generando ? 'Generando QR…' : `Cobrar ${pesos(deuda)} con QR (CoDi)`}
        </button>
    );
}
