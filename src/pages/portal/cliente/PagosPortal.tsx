import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowDownTrayIcon, CalendarDaysIcon, CheckCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import SemanaPago from './SemanaPago';
import type { Factura, OpcionesPromesa, Resumen } from './tipos';
import { BOTON, BOTON_SUAVE, CAMPO, ETIQUETA, TARJETA, TITULO, dinero } from './ui';

const ESTADOS: Record<string, { texto: string; clase: string }> = {
    pagada: { texto: 'Pagada', clase: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    pendiente: { texto: 'Pendiente', clase: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
    vencida: { texto: 'Vencida', clase: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
    promesa: { texto: 'Con promesa', clase: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
};
const sinFormatoWhatsapp = (texto: string) => texto.replace(/\*/g, '');
const corta = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

/** Sus pagos: cuánto y cuándo, cómo pagar, promesa de pago y sus facturas en PDF. */
export default function PagosPortal({ resumen, color, onCambio }: { resumen: Resumen; color: string; onCambio: () => void }) {
    const [facturas, setFacturas] = useState<Factura[] | null>(null);
    const [promesa, setPromesa] = useState<OpcionesPromesa | null>(null);
    const [verPago, setVerPago] = useState(false);
    const [fecha, setFecha] = useState('');
    const [ocupado, setOcupado] = useState<string | null>(null);
    const total = resumen.cuenta.adeudos.reduce((suma, a) => suma + a.monto, 0);

    useEffect(() => {
        portalClient.get<Factura[]>('/portal/facturas').then(({ data }) => setFacturas(data)).catch(() => setFacturas([]));
        portalClient.get<OpcionesPromesa>('/portal/promesa').then(({ data }) => setPromesa(data)).catch(() => setPromesa(null));
    }, [resumen]);

    const descargar = async (factura: Factura) => {
        setOcupado(`pdf${factura.id}`);
        try {
            const { data } = await portalClient.get<Blob>(`/portal/facturas/${factura.id}/pdf`, { responseType: 'blob' });
            const url = URL.createObjectURL(data);
            const enlace = document.createElement('a');
            enlace.href = url;
            enlace.download = `factura-${String(factura.id).padStart(6, '0')}.pdf`;
            enlace.click();
            window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo descargar'));
        } finally {
            setOcupado(null);
        }
    };

    const prometer = async () => {
        setOcupado('promesa');
        try {
            const { data } = await portalClient.post<{ fecha: string; reactivado: boolean }>('/portal/promesa', { fecha });
            toast.success(`Listo: tienes hasta el ${corta(data.fecha)} para pagar.${data.reactivado ? ' Tu servicio se reactivó.' : ''}`, { duration: 8000 });
            onCambio();
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo registrar la promesa'));
        } finally {
            setOcupado(null);
        }
    };

    return (
        <>
            <SemanaPago calendario={resumen.calendario} color={color} />

            <section className={`${TARJETA} space-y-4`}>
                <p className={ETIQUETA}>{total > 0 ? 'Por pagar' : 'Tu cuenta'}</p>
                {total > 0 ? (
                    <div>
                        <p className="text-4xl font-semibold tracking-tight">{dinero(total)}</p>
                        <ul className="mt-2 space-y-1">
                            {resumen.cuenta.adeudos.map((a, n) => (
                                <li key={n} className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                                    <span>{a.concepto}</span>
                                    <span className={a.vencido ? 'text-rose-600 dark:text-rose-400' : ''}>{a.vence ? `${a.vencido ? 'Venció' : 'Vence'} ${a.vence}` : ''}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <CheckCircleIcon className="h-9 w-9 text-emerald-500" />
                        <p className="text-lg font-semibold">Estás al corriente</p>
                    </div>
                )}
                {resumen.saldo_a_favor > 0 && <p className="text-sm text-emerald-700 dark:text-emerald-300">Tienes {dinero(resumen.saldo_a_favor)} a favor.</p>}
                {resumen.datos_pago && (
                    <div>
                        <button type="button" onClick={() => setVerPago((v) => !v)} className={`${BOTON_SUAVE} w-full justify-between`} aria-expanded={verPago}>
                            ¿Cómo pago?
                            <ChevronDownIcon className={`h-4 w-4 transition ${verPago ? 'rotate-180' : ''}`} />
                        </button>
                        {verPago && <p className="mt-3 whitespace-pre-line px-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{sinFormatoWhatsapp(resumen.datos_pago)}</p>}
                    </div>
                )}
            </section>

            {promesa?.puede && (
                <section className={`${TARJETA} space-y-3`} data-testid="promesa-portal">
                    <div className="flex items-center gap-3">
                        <CalendarDaysIcon className="h-6 w-6 text-slate-400" />
                        <div>
                            <h2 className={TITULO}>¿Necesitas unos días más?</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Elige hasta cuándo pagarás; tu servicio sigue activo mientras tanto.</p>
                        </div>
                    </div>
                    <input
                        type="date" value={fecha} min={promesa.desde} max={promesa.hasta} onChange={(e) => setFecha(e.target.value)}
                        aria-label="Fecha en que pagarás" className={CAMPO}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">Puedes elegir hasta el {corta(promesa.hasta!)}.</p>
                    <button type="button" onClick={() => void prometer()} disabled={!fecha || ocupado === 'promesa'} className={BOTON} style={{ background: color }}>
                        {ocupado === 'promesa' ? 'Registrando…' : 'Prometer pago'}
                    </button>
                </section>
            )}
            {promesa && !promesa.puede && total > 0 && promesa.motivo && (
                <p className="px-1 text-xs text-slate-500 dark:text-slate-400">Promesa de pago: {promesa.motivo}</p>
            )}

            <section className={TARJETA}>
                <h2 className={TITULO}>Mis facturas</h2>
                <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800" data-testid="facturas-portal">
                    {facturas === null && <li className="py-6 text-center text-sm text-slate-400">Cargando…</li>}
                    {facturas?.length === 0 && <li className="py-6 text-center text-sm text-slate-400">Aún no tienes facturas.</li>}
                    {facturas?.map((f) => {
                        const estado = ESTADOS[f.estado] ?? { texto: f.estado, clase: ESTADOS.pendiente.clase };
                        return (
                            <li key={f.id} className="flex items-center gap-3 py-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{f.concepto}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {dinero(f.total)}{f.pagada ? ` · pagada el ${corta(f.pagada)}` : f.vence ? ` · vence ${corta(f.vence)}` : ''}
                                    </p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>{estado.texto}</span>
                                <button type="button" onClick={() => void descargar(f)} disabled={ocupado === `pdf${f.id}`} aria-label={`Descargar PDF de ${f.concepto}`}
                                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800">
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </section>

            {resumen.pagos.length > 0 && (
                <section className={TARJETA}>
                    <h2 className={TITULO}>Pagos recibidos</h2>
                    <ul className="mt-3 space-y-2">
                        {resumen.pagos.map((p, n) => (
                            <li key={n} className="flex justify-between text-sm">
                                <span className="text-slate-500 dark:text-slate-400">{corta(p.fecha)}{p.metodo ? ` · ${p.metodo}` : ''}</span>
                                <span className="font-medium">{dinero(p.monto)}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}
