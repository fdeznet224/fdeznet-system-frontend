import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { DocumentTextIcon, WifiIcon } from '@heroicons/react/24/outline';

import client from '../../api/axios';
import { cachedRequest, getCachedValue, setCachedValue } from '../../offline/db';
import { apiErrorMessage } from '@/utils/apiError';

interface ContratoApartado {
    codigo: string;
    reservado_en: string;
    vence_en: string;
}

interface RespuestaApartados {
    apartados: ContratoApartado[];
}

const CLAVE_CACHE = 'contratos-apartados';

/**
 * El siguiente contrato que el técnico escribe con plumón en el conector de la
 * caja NAP. Se guarda en el celular para verlo aunque no haya internet.
 */
export default function ContratosApartados() {
    const [apartados, setApartados] = useState<ContratoApartado[]>([]);
    const [sinInternet, setSinInternet] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [descartando, setDescartando] = useState(false);

    const cargar = useCallback(async () => {
        // Primero lo guardado en el celular (al instante, aun sin señal) y
        // luego lo del servidor si hay internet.
        const guardados = await getCachedValue<RespuestaApartados>(CLAVE_CACHE).catch(() => null);
        if (guardados) {
            setApartados(Array.isArray(guardados.apartados) ? guardados.apartados : []);
            setCargando(false);
        }
        try {
            const { data, fromCache } = await cachedRequest<RespuestaApartados>(
                CLAVE_CACHE,
                async () => (await client.get<RespuestaApartados>('/contratos/apartados')).data,
            );
            setApartados(Array.isArray(data?.apartados) ? data.apartados : []);
            setSinInternet(fromCache);
        } catch {
            if (guardados) setSinInternet(true);
            else setApartados([]);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        // Que el celular no borre los contratos guardados por falta de espacio.
        void navigator.storage?.persist?.().catch(() => undefined);
        const inicial = window.setTimeout(() => void cargar(), 0);
        return () => window.clearTimeout(inicial);
    }, [cargar]);

    const descartar = async (codigo: string) => {
        if (!window.confirm(`¿Descartar el contrato ${codigo}?\n\nÚsalo solo si NO lo escribiste en ningún conector o la instalación no se hizo.`)) return;
        setDescartando(true);
        try {
            const { data } = await client.post<RespuestaApartados>(`/contratos/apartados/${codigo}/descartar`);
            setApartados(Array.isArray(data?.apartados) ? data.apartados : []);
            await setCachedValue(CLAVE_CACHE, data);
            toast.success(`Contrato ${codigo} descartado`);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Necesitas internet para descartar un contrato'));
        } finally {
            setDescartando(false);
        }
    };

    if (cargando) return null;
    const [siguiente, ...resto] = apartados;

    return (
        <section aria-label="Contratos apartados" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                    <DocumentTextIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Siguiente contrato</p>
                    {siguiente ? (
                        <p className="font-mono text-2xl font-black leading-tight tracking-[0.2em] text-slate-900 dark:text-white">{siguiente.codigo}</p>
                    ) : (
                        <p className="text-xs font-semibold text-slate-500">Conéctate a internet para recibir tus contratos.</p>
                    )}
                </div>
                {siguiente && (
                    <button
                        type="button"
                        onClick={() => void descartar(siguiente.codigo)}
                        disabled={descartando || sinInternet}
                        className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-bold text-slate-400 hover:text-rose-600 active:scale-95 disabled:opacity-40"
                    >
                        Descartar
                    </button>
                )}
            </div>
            {siguiente && (
                <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    Escríbelo en el conector de la caja NAP; se usa al dar de alta al cliente.
                    {resto.length > 0 && (
                        <> Después: <span className="font-mono font-bold tracking-wider text-slate-600 dark:text-slate-300">{resto.map((a) => a.codigo).join(' · ')}</span></>
                    )}
                </p>
            )}
            {sinInternet && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                    <WifiIcon className="h-3.5 w-3.5 shrink-0" /> Sin internet: estos son los que tienes guardados en tu celular.
                </p>
            )}
        </section>
    );
}
