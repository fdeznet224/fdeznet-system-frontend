import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { FingerPrintIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';
import { activarHuella, huellaActivadaAqui, huellaPosible, nombreDeEsteCelular, olvidarHuellaAqui } from '@/utils/huella';

interface Llave {
    id: number;
    nombre: string | null;
    creado: string;
    ultimo_uso: string | null;
}

const fecha = (iso: string | null) => (iso
    ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'nunca');

/** Botón de la huella para quien ya entró: activarla en este celular y ver o quitar sus celulares.
 * `boton` cambia cómo se ve lo que lo abre (una fila de la lista de Más, por ejemplo). */
export default function HuellaBoton({ usuario, className = '', boton }: { usuario: string; className?: string; boton?: (abrir: () => void) => ReactNode }) {
    const [abierto, setAbierto] = useState(false);
    const [posible, setPosible] = useState(false);
    const [aqui, setAqui] = useState(Boolean(huellaActivadaAqui()));
    const [llaves, setLlaves] = useState<Llave[] | null>(null);
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => { void huellaPosible().then(setPosible); }, []);

    const cargar = useCallback(async () => {
        try {
            const { data } = await client.get<Llave[]>('/auth/huella');
            setLlaves(data);
            if (!data.length) { olvidarHuellaAqui(); setAqui(false); }
        } catch {
            setLlaves([]);
        }
    }, []);

    useEffect(() => { if (abierto) void cargar(); }, [abierto, cargar]);

    const activar = async () => {
        setOcupado(true);
        try {
            await activarHuella(usuario, nombreDeEsteCelular());
            setAqui(true);
            toast.success('Listo: la próxima vez entra con tu huella');
            await cargar();
        } catch (error) {
            if (!(error instanceof DOMException && error.name === 'NotAllowedError')) {
                toast.error(apiErrorMessage(error, 'No se pudo activar la huella'));
            }
        } finally {
            setOcupado(false);
        }
    };

    const quitar = async (llave: Llave) => {
        if (!confirm(`¿Quitar la huella de «${llave.nombre || 'ese celular'}»? Ahí tendrás que entrar con tu contraseña.`)) return;
        try {
            await client.delete(`/auth/huella/${llave.id}`);
            toast.success('Huella quitada');
            await cargar();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'No se pudo quitar'));
        }
    };

    if (!posible && !aqui) return null;
    return (
        <>
            {boton ? boton(() => setAbierto(true)) : (
                <button type="button" onClick={() => setAbierto(true)} title="Entrar con huella" aria-label="Entrar con huella" className={className}>
                    <FingerPrintIcon className="h-5 w-5" />
                </button>
            )}
            {abierto && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Entrar con huella">
                    <div className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-5 text-slate-900 shadow-xl dark:bg-slate-900 dark:text-white">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"><FingerPrintIcon className="h-6 w-6" /></span>
                                <div>
                                    <p className="font-bold">Entrar con huella</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{aqui ? 'Activada en este celular' : 'Sin activar en este celular'}</p>
                                </div>
                            </div>
                            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><XMarkIcon className="h-5 w-5" /></button>
                        </div>
                        {!aqui && posible && (
                            <button type="button" disabled={ocupado} onClick={() => void activar()} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-70">
                                <FingerPrintIcon className="h-5 w-5" />{ocupado ? 'Activando…' : 'Activar en este celular'}
                            </button>
                        )}
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tus celulares con huella</p>
                            {llaves === null ? (
                                <p className="text-sm text-slate-400">Cargando…</p>
                            ) : llaves.length === 0 ? (
                                <p className="text-sm text-slate-500 dark:text-slate-400">Todavía ninguno.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {llaves.map((llave) => (
                                        <li key={llave.id} className="flex items-center justify-between gap-3 py-2.5">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold">{llave.nombre || 'Celular'}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Último uso: {fecha(llave.ultimo_uso)}</p>
                                            </div>
                                            <button type="button" onClick={() => void quitar(llave)} aria-label={`Quitar ${llave.nombre || 'celular'}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"><TrashIcon className="h-5 w-5" /></button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tu huella o tu cara no salen del teléfono. Tu contraseña sigue sirviendo.</p>
                    </div>
                </div>
            )}
        </>
    );
}
