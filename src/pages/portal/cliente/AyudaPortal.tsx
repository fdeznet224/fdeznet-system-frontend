import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import type { Reporte } from './tipos';
import { BOTON, CAMPO, TARJETA, TITULO } from './ui';

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
const ESTADOS: Record<string, { texto: string; clase: string }> = {
    pendiente: { texto: 'Recibido', clase: 'bg-slate-500/10 text-slate-600 dark:text-slate-300' },
    asignada: { texto: 'Con técnico', clase: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
    en_camino: { texto: 'Técnico en camino', clase: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
    trabajando: { texto: 'En atención', clase: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    terminada: { texto: 'Resuelto', clase: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    cancelada: { texto: 'Cancelado', clase: 'bg-slate-500/10 text-slate-500' },
};

/** Reportar una falla, ver cómo van sus reportes y escribir por WhatsApp. */
export default function AyudaPortal({ telefono, color }: { telefono: string | null; color: string }) {
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
            void leer();
        } catch (err) {
            toast.error(apiErrorMessage(err, 'No se pudo enviar el reporte'));
        } finally {
            setEnviando(false);
        }
    };

    const whatsapp = telefono ? `https://wa.me/${telefono.replace(/\D/g, '').replace(/^(\d{10})$/, '52$1')}` : null;

    return (
        <>
            <form onSubmit={reportar} className={`${TARJETA} space-y-4`}>
                <div>
                    <h2 className={TITULO}>Reportar una falla</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Antes prueba reiniciar tu módem desde Mi red; muchas veces se arregla solo.</p>
                </div>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="¿Qué pasa?">
                    {FALLAS.map(([valor, texto]) => {
                        const elegida = categoria === valor;
                        return (
                            <button key={valor} type="button" role="radio" aria-checked={elegida} onClick={() => setCategoria(valor)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${elegida ? 'text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
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

            {reportes.length > 0 && (
                <section className={TARJETA} data-testid="reportes-portal">
                    <h2 className={TITULO}>Mis reportes</h2>
                    <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                        {reportes.map((r) => {
                            const estado = ESTADOS[r.estado] ?? { texto: r.estado, clase: ESTADOS.pendiente.clase };
                            return (
                                <li key={r.id} className="flex items-center gap-3 py-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">#{r.id} · {CATEGORIAS[r.categoria ?? ''] ?? 'Reporte'}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {r.creado ? new Date(r.creado).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : ''}
                                            {r.programado && !r.terminado ? ` · visita el ${new Date(r.programado).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric' })}` : ''}
                                        </p>
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${estado.clase}`}>{estado.texto}</span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {whatsapp && (
                <a href={whatsapp} target="_blank" rel="noreferrer" className={`${TARJETA} flex items-center gap-4`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">Escríbenos por WhatsApp</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{telefono}</p>
                    </div>
                </a>
            )}
        </>
    );
}
