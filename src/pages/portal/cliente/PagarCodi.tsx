import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import { BOTON, CAMPO, ETIQUETA, dinero } from './ui';

const legible = (n: string) => (n.length === 10 ? `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` : n);

/** Cobro CoDi: le llega a la app de su banco, lo acepta y el pago se aplica solo. */
export default function PagarCodi({ total, celular, color }: { total: number; celular: string | null; color: string }) {
    const [numero, setNumero] = useState(legible(celular ?? ''));
    const [enviando, setEnviando] = useState(false);
    const [enviado, setEnviado] = useState<{ celular: string; minutos: number } | null>(null);
    const limpio = numero.replace(/\D/g, '');

    const pagar = async () => {
        setEnviando(true);
        try {
            const { data } = await portalClient.post<{ celular: string; vence_en_minutos: number }>('/portal/pago-codi', { telefono: limpio });
            setEnviado({ celular: data.celular, minutos: data.vence_en_minutos });
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo mandar el cobro'));
        } finally {
            setEnviando(false);
        }
    };

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
            <label className="block">
                <span className={ETIQUETA}>Celular registrado en la app de tu banco</span>
                <input type="tel" inputMode="numeric" autoComplete="tel" maxLength={14} value={numero}
                    onChange={(e) => setNumero(e.target.value)} placeholder="10 dígitos" className={`${CAMPO} mt-1.5`} />
            </label>
            <button type="button" onClick={() => void pagar()} disabled={limpio.length !== 10 || enviando} className={BOTON} style={{ background: color }}>
                <DevicePhoneMobileIcon className="h-5 w-5" />
                {enviando ? 'Mandando…' : `Pagar ${dinero(total)} con mi banco`}
            </button>
            <p className="px-1 text-xs text-slate-500 dark:text-slate-400">Sin captura: aceptas el cobro (CoDi) en tu banco y tu pago queda aplicado al momento.</p>
        </div>
    );
}
