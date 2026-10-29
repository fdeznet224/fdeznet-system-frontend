import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronRightIcon, ClipboardDocumentIcon, TicketIcon } from '@heroicons/react/24/outline';

import portalClient from '@/api/portal';
import { apiErrorMessage } from '@/utils/apiError';
import type { FichaComprada, FichaNueva, PerfilFicha } from './tipos';
import { BOTON, BOTON_SUAVE, TARJETA_LISTA, dinero } from './ui';

/** Fichas de internet que se suman a su factura (si el ISP tiene sistema de fichas). */
export default function ServiciosPortal({ color }: { color: string }) {
    const [abierto, setAbierto] = useState(false);
    const [perfiles, setPerfiles] = useState<PerfilFicha[] | null>(null);
    const [disponible, setDisponible] = useState(false);
    const [compradas, setCompradas] = useState<FichaComprada[]>([]);
    const [elegido, setElegido] = useState<PerfilFicha | null>(null);
    const [comprando, setComprando] = useState(false);
    const [nueva, setNueva] = useState<FichaNueva | null>(null);

    useEffect(() => {
        portalClient.get<{ disponible: boolean; perfiles: PerfilFicha[]; compradas: FichaComprada[] }>('/portal/fichas')
            .then(({ data }) => { setDisponible(Boolean(data?.disponible)); setPerfiles(data?.perfiles ?? []); setCompradas(data?.compradas ?? []); })
            .catch(() => setPerfiles([]));
    }, []);

    const comprar = async () => {
        if (!elegido) return;
        setComprando(true);
        try {
            const { data } = await portalClient.post<FichaNueva>('/portal/fichas', { perfil_id: elegido.id });
            setNueva(data);
            setElegido(null);
            setCompradas((c) => [{ concepto: `Ficha de internet · ${data.perfil}`, codigo: data.codigo, precio: data.precio, fecha: null, facturada: false }, ...c]);
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo generar la ficha'));
        } finally {
            setComprando(false);
        }
    };

    const copiar = async (codigo: string) => {
        try {
            await navigator.clipboard.writeText(codigo);
            toast.success('Código copiado');
        } catch {
            toast.error('Cópialo a mano');
        }
    };

    // Sin sistema de fichas (y sin fichas compradas) no hay servicios que ofrecer.
    if (!disponible && compradas.length === 0) return null;

    return (
        <section className={`${TARJETA_LISTA} divide-y divide-slate-100 dark:divide-slate-800`}>
            <p className="px-5 pb-2 pt-4 text-xs font-medium text-slate-500 dark:text-slate-400">Servicios</p>

            <div className="px-5 py-4">
                    <button type="button" onClick={() => setAbierto((a) => !a)} className="flex w-full items-center gap-4 text-left" aria-expanded={abierto}>
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${color}1a`, color }}>
                            <TicketIcon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">Fichas de internet</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">Fichas de internet; se suman a tu factura</span>
                        </span>
                        <ChevronRightIcon className={`h-4 w-4 text-slate-400 transition ${abierto ? 'rotate-90' : ''}`} />
                    </button>
                    {abierto && (
                        <div className="mt-4 space-y-3">
                            {nueva && (
                                <div className="rounded-2xl bg-emerald-500/10 p-4 text-center" data-testid="ficha-nueva">
                                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Tu ficha de {nueva.perfil}</p>
                                    <p className="my-1 font-mono text-3xl font-semibold tracking-widest">{nueva.codigo}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">También te la mandamos por WhatsApp. Se suma {dinero(nueva.precio)} a tu próxima factura.</p>
                                    <button type="button" onClick={() => void copiar(nueva.codigo)} className={`${BOTON_SUAVE} mx-auto mt-3`}>
                                        <ClipboardDocumentIcon className="h-4 w-4" /> Copiar código
                                    </button>
                                </div>
                            )}
                            {disponible && perfiles && (
                                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Elige tu ficha">
                                    {perfiles.map((p) => {
                                        const activa = elegido?.id === p.id;
                                        return (
                                            <button key={p.id} type="button" role="radio" aria-checked={activa} onClick={() => setElegido(p)}
                                                className={`rounded-2xl p-3 text-left ring-1 transition ${activa ? 'ring-2' : 'ring-slate-200 dark:ring-slate-700'}`}
                                                style={activa ? { boxShadow: `0 0 0 2px ${color}` } : undefined}>
                                                <span className="block text-sm font-medium">{p.nombre}</span>
                                                <span className="block text-xs text-slate-500 dark:text-slate-400">{dinero(p.precio)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {elegido && (
                                <button type="button" onClick={() => void comprar()} disabled={comprando} className={BOTON} style={{ background: color }}>
                                    {comprando ? 'Generando…' : `Comprar ${elegido.nombre} · ${dinero(elegido.precio)}`}
                                </button>
                            )}
                            {compradas.length > 0 && (
                                <ul className="space-y-1 pt-1">
                                    {compradas.slice(0, 3).map((f, n) => (
                                        <li key={n} className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                            <span>{f.concepto.replace(/^Ficha (Zona FdezNet|de internet) · /, '')}{f.codigo ? ` · ${f.codigo}` : ''}</span>
                                            <span>{dinero(f.precio)}{f.facturada ? ' · facturada' : ''}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
            </div>
        </section>
    );
}
