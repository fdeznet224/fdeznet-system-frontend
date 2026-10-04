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
        <section aria-label="Contratos apartados" className="rounded-3xl border border-blue-200 bg-white p-5 shadow-md dark:border-blue-500/30 dark:bg-[#1a1f2e]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                        <DocumentTextIcon className="h-4 w-4" /> Siguiente contrato
                    </span>
                    {siguiente ? (
                        <p className="mt-1 font-mono text-5xl font-black tracking-widest text-slate-900 dark:text-white">{siguiente.codigo}</p>
                    ) : (
                        <p className="mt-2 text-sm font-bold text-slate-500">Conéctate a internet para recibir tus contratos.</p>
                    )}
                </div>
                {siguiente && (
                    <button
                        type="button"
                        onClick={() => void descartar(siguiente.codigo)}
                        disabled={descartando || sinInternet}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-black text-slate-500 active:scale-95 disabled:opacity-40 dark:border-slate-700"
                    >
                        Descartar
                    </button>
                )}
            </div>
            {siguiente && (
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Escríbelo en el conector de la caja NAP. Al dar de alta al cliente, se usa este número.
                </p>
            )}
            {resto.length > 0 && (
                <p className="mt-3 text-[11px] font-bold text-slate-400">
                    Después: <span className="font-mono tracking-wider">{resto.map((a) => a.codigo).join(' · ')}</span>
                </p>
            )}
            {sinInternet && (
                <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    <WifiIcon className="h-4 w-4" /> Sin internet: estos son los que tienes guardados en tu celular.
                </p>
            )}
        </section>
    );
}
