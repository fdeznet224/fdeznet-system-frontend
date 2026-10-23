import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronRightIcon, LifebuoyIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import type { Reporte } from './tipos';
import { BOTON, CAMPO, TARJETA_LISTA } from './ui';

const FALLAS = [
    ['sin_internet', 'No tengo internet'],
    ['lentitud', 'Va lento'],
    ['router_wifi', 'WiFi o módem'],
    ['otro', 'Otra cosa'],
] as const;
const CATEGORIAS: Record<string, string> = {
    sin_internet: 'Sin internet', lentitud: 'Lentitud', router_wifi: 'WiFi o módem', potencia_baja: 'Señal de fibra',
    cable_roto: 'Fibra o cable', cambio_domicilio: 'Cambio de domicilio', otro: 'Otro',
};
const ESTADOS: Record<string, string> = {
    pendiente: 'Recibido', asignada: 'Con técnico', en_camino: 'Técnico en camino', trabajando: 'En atención',
    terminada: 'Resuelto', cancelada: 'Cancelado',
};
const ABIERTOS = new Set(['pendiente', 'asignada', 'en_camino', 'trabajando']);

/** «¿Algo falla?»: al tocarlo se abre el reporte; le llega al personal por WhatsApp como los del agente. */
export default function AyudaPortal({ color }: { color: string }) {
    const [abierto, setAbierto] = useState(false);
    const [categoria, setCategoria] = useState<string>('sin_internet');
    const [descripcion, setDescripcion] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [reportes, setReportes] = useState<Reporte[]>([]);

    const leer = () => portalClient.get<Reporte[]>('/portal/reportes').then(({ data }) => setReportes(data)).catch(() => undefined);
    useEffect(() => { void leer(); }, []);

    const reportar = async (e: React.FormEvent) => {
        e.preventDefault();
        setEnviando(true);
        try {
            const { data } = await portalClient.post<{ id: number }>('/portal/falla', { categoria, descripcion });
            toast.success(`Recibimos tu reporte${data.id ? ` #${data.id}` : ''}. Un técnico te contactará.`, { duration: 8000 });
            setDescripcion('');
            setAbierto(false);
            void leer();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'No se pudo enviar el reporte'));
        } finally {
            setEnviando(false);
        }
    };

    const abiertos = reportes.filter((r) => ABIERTOS.has(r.estado));

    return (
        <section className={TARJETA_LISTA}>
            <button type="button" onClick={() => setAbierto((a) => !a)} className="flex w-full items-center gap-4 px-5 py-4 text-left" aria-expanded={abierto}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <LifebuoyIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">¿Algo falla?</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">Levanta un reporte y un técnico te contacta</span>
                </span>
                <ChevronRightIcon className={`h-4 w-4 text-slate-400 transition ${abierto ? 'rotate-90' : ''}`} />
            </button>

            {abierto && (
                <form onSubmit={reportar} className="space-y-3 px-5 pb-5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Antes prueba reiniciar tu módem desde Mi WiFi; muchas veces se arregla solo.</p>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="¿Qué pasa?">
                        {FALLAS.map(([valor, texto]) => {
                            const elegida = categoria === valor;
                            return (
                                <button key={valor} type="button" role="radio" aria-checked={elegida} onClick={() => setCategoria(valor)}
                                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${elegida ? 'text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
                                    style={elegida ? { background: color } : undefined}>
                                    {texto}
                                </button>
                            );
                        })}
                    </div>
                    <textarea
                        value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} maxLength={1000} aria-label="Cuéntanos qué pasa"
                        placeholder="Cuéntanos qué pasa: desde cuándo, si ya reiniciaste, qué foco está en rojo…" className={`${CAMPO} resize-none`}
                    />
                    <button type="submit" disabled={enviando || descripcion.trim().length < 5} className={BOTON} style={{ background: color }}>
                        {enviando ? 'Enviando…' : 'Enviar reporte'}
                    </button>
                </form>
            )}

            {abiertos.length > 0 && (
                <ul className="border-t border-slate-100 px-5 py-3 dark:border-slate-800" data-testid="reportes-portal">
                    {abiertos.map((r) => (
                        <li key={r.id} className="flex justify-between py-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>#{r.id} · {CATEGORIAS[r.categoria ?? ''] ?? 'Reporte'}</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{ESTADOS[r.estado] ?? r.estado}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
