import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, TagIcon } from '@heroicons/react/24/outline';

import client from '../../api/axios';
import { apiErrorMessage } from '@/utils/apiError';
import type { Revision } from './revision';
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CAMPO, ETIQUETA_CAMPO } from './estilo';

interface Caja {
    id: number;
    nombre: string;
    capacidad: number;
    distancia_m?: number | null;
}

const fecha = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/**
 * Con el láser (VFL) el técnico ve en qué puerto de la caja está el cliente,
 * lo confirma aquí y etiqueta el conector con su contrato. Así, visita por
 * visita, toda la red queda identificada y la siguiente revisión es más rápida.
 */
export default function IdentificarNap({ ordenId, revision, latitud, longitud, onGuardado }: {
    ordenId: number;
    revision: Revision;
    latitud?: number | null;
    longitud?: number | null;
    onGuardado: () => void;
}) {
    const identificacion = revision.identificacion;
    const actual = revision.nap;
    const [abierto, setAbierto] = useState(!identificacion?.identificado_en);
    const [cajas, setCajas] = useState<Caja[]>(actual ? [{ id: actual.id, nombre: actual.nombre, capacidad: actual.capacidad || 16 }] : []);
    const [cajaId, setCajaId] = useState<number | null>(actual?.id ?? null);
    const [puerto, setPuerto] = useState<number | null>(actual?.puerto ?? null);
    const [ocupantes, setOcupantes] = useState<Record<number, string>>({});
    const [etiquetado, setEtiquetado] = useState(false);
    const [conflicto, setConflicto] = useState<string | null>(null);
    const [guardando, setGuardando] = useState(false);

    // Cajas cercanas al domicilio (también las llenas: su caja casi siempre lo está).
    useEffect(() => {
        if (!abierto || latitud == null || longitud == null) return;
        let vigente = true;
        client.get<Caja[]>(`/infraestructura/naps/cercanas?latitud=${latitud}&longitud=${longitud}&limite=5`)
            .then(({ data }) => {
                if (!vigente) return;
                setCajas((previas) => [...previas, ...data.filter((c) => !previas.some((p) => p.id === c.id))]);
            })
            .catch(() => undefined);
        return () => { vigente = false; };
    }, [abierto, latitud, longitud]);

    // Quién está registrado en cada puerto, para que el técnico compare con lo que ve.
    useEffect(() => {
        if (!abierto || !cajaId) return;
        let vigente = true;
        client.get<{ nombre: string; cedula?: string | null; puerto_nap?: number | null }[]>(`/infraestructura/naps/${cajaId}/detalles`)
            .then(({ data }) => {
                if (!vigente) return;
                const mapa: Record<number, string> = {};
                for (const o of data) if (o.puerto_nap) mapa[o.puerto_nap] = o.nombre;
                setOcupantes(mapa);
            })
            .catch(() => { if (vigente) setOcupantes({}); });
        return () => { vigente = false; };
    }, [abierto, cajaId]);

    const caja = cajas.find((c) => c.id === cajaId);

    const guardar = async (quitarAOtro = false) => {
        if (!cajaId || !puerto) {
            toast.error('Elige la caja y el puerto que marcó el láser');
            return;
        }
        setGuardando(true);
        try {
            await client.post(`/ordenes/${ordenId}/identificar-nap`, {
                caja_nap_id: cajaId, puerto, etiquetado, quitar_a_otro: quitarAOtro,
            });
            toast.success(etiquetado ? 'Cliente identificado y conector etiquetado' : 'Cliente identificado');
            setConflicto(null);
            setAbierto(false);
            onGuardado();
        } catch (error) {
            if (isAxiosError(error) && error.response?.status === 409) {
                setConflicto(apiErrorMessage(error, 'El puerto está registrado a otro cliente'));
            } else {
                toast.error(apiErrorMessage(error, 'No se pudo guardar la identificación'));
            }
        } finally {
            setGuardando(false);
        }
    };

    const avance = revision.avance;
    return (
        <div className="space-y-2 rounded-xl border border-blue-100 p-3 dark:border-blue-500/20">
            <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300"><TagIcon className="h-4 w-4" /> Identificar en la caja NAP</p>
                {avance && avance.total > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400">Red identificada: {avance.identificados} de {avance.total}</span>
                )}
            </div>

            {identificacion?.identificado_en && !abierto ? (
                <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        <CheckCircleIcon className="h-4 w-4" />
                        Identificado el {fecha(identificacion.identificado_en)}{actual ? ` · ${actual.nombre} P${actual.puerto ?? '?'}` : ''}
                        {identificacion.etiquetado ? ' · etiquetado' : ' · sin etiqueta'}
                    </p>
                    <button type="button" onClick={() => setAbierto(true)} className="shrink-0 text-[11px] font-semibold text-blue-600 dark:text-blue-400">Volver a identificar</button>
                </div>
            ) : (
                <>
                    <ol className="list-decimal space-y-0.5 pl-4 text-xs text-slate-600 dark:text-slate-300">
                        <li>Conecta el láser en el conector del cliente.</li>
                        <li>En la caja NAP mira qué puerto se ilumina.</li>
                        <li>Elige aquí la caja y ese puerto.</li>
                        <li>Etiqueta el conector con el contrato <span className="font-mono font-bold">{identificacion?.contrato || ''}</span>.</li>
                    </ol>
                    <div className="grid grid-cols-2 gap-2">
                        <label>
                            <span className={ETIQUETA_CAMPO}>Caja</span>
                            <select aria-label="Caja NAP" value={cajaId ?? ''} onChange={(e) => { setCajaId(Number(e.target.value) || null); setPuerto(null); setConflicto(null); }} className={CAMPO}>
                                <option value="">Elige…</option>
                                {cajas.map((c) => (
                                    <option key={c.id} value={c.id}>{c.nombre}{c.id === actual?.id ? ' (registrada)' : c.distancia_m != null ? ` · ${c.distancia_m} m` : ''}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            <span className={ETIQUETA_CAMPO}>Puerto</span>
                            <select aria-label="Puerto que marcó el láser" value={puerto ?? ''} disabled={!caja} onChange={(e) => { setPuerto(Number(e.target.value) || null); setConflicto(null); }} className={CAMPO}>
                                <option value="">Elige…</option>
                                {Array.from({ length: caja?.capacidad || 0 }, (_, i) => i + 1).map((n) => (
                                    <option key={n} value={n}>P{n}{ocupantes[n] ? ` · ${ocupantes[n]}` : ' · libre'}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                        <input type="checkbox" checked={etiquetado} onChange={(e) => setEtiquetado(e.target.checked)} className="h-4 w-4" />
                        Etiqueté el conector con el contrato {identificacion?.contrato || ''}
                    </label>
                    {conflicto ? (
                        <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                            <p>{conflicto}</p>
                            <button type="button" disabled={guardando} onClick={() => void guardar(true)} className={`${BOTON_SECUNDARIO} w-full text-amber-800 dark:text-amber-200`}>
                                Sí, el láser marca este puerto: quitárselo
                            </button>
                        </div>
                    ) : (
                        <button type="button" disabled={guardando || !cajaId || !puerto} onClick={() => void guardar()} className={BOTON_PRIMARIO}>
                            <TagIcon className="h-4 w-4" /> {guardando ? 'Guardando…' : 'Guardar identificación'}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
