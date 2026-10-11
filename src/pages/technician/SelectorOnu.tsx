import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircleIcon, QrCodeIcon } from '@heroicons/react/24/outline';

import EscanerCodigo from '@/components/escaner/EscanerCodigo';
import { CAMPO, ETIQUETA_CAMPO } from './estilo';
import { SERIE_MINIMA, normalizarSerie } from './onu';

export interface OnuDisponible {
    id: number;
    identificador: string;
    modelo?: string | null;
}

/**
 * Buscar la ONU en el inventario disponible, elegirla de la lista o escanear
 * su código. Si no está en el inventario, se registra al guardar (`al`).
 */
export default function SelectorOnu({ onus, valor, elegida, onCambiar, etiqueta = 'ONU instalada', al = 'activar' }: {
    onus: OnuDisponible[];
    valor: string;
    elegida?: OnuDisponible;
    onCambiar: (valor: string) => void;
    etiqueta?: string;
    al?: string;
}) {
    const [escaneando, setEscaneando] = useState(false);
    const [abierta, setAbierta] = useState(false);
    const busqueda = normalizarSerie(valor);
    const coincidencias = onus.filter((o) => !busqueda || normalizarSerie(o.identificador).includes(busqueda)).slice(0, 30);

    const alEscanear = (codigo: string) => {
        setEscaneando(false);
        const leido = normalizarSerie(codigo);
        const onu = onus.find((o) => normalizarSerie(o.identificador) === leido)
            || onus.find((o) => leido.includes(normalizarSerie(o.identificador)));
        onCambiar(onu ? onu.identificador : codigo.trim().toUpperCase());
        if (onu) toast.success(`ONU ${onu.identificador}`);
        else toast(`ONU nueva: se registrará en el inventario al ${al}`, { icon: '📦' });
    };

    return (
        <div>
            <span className={ETIQUETA_CAMPO}>{etiqueta} ({onus.length} disponibles)</span>
            <div className="flex gap-2">
                <input
                    aria-label={etiqueta}
                    value={valor}
                    onFocus={() => setAbierta(true)}
                    onChange={(e) => { onCambiar(e.target.value); setAbierta(true); }}
                    placeholder="Busca por serial o MAC"
                    className={`${CAMPO} min-h-11 font-mono uppercase`}
                />
                <button type="button" aria-label="Escanear código de la ONU" onClick={() => setEscaneando(true)}
                    className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white transition active:scale-95 dark:bg-white dark:text-slate-900">
                    <QrCodeIcon className="h-5 w-5" /> Escanear
                </button>
            </div>
            {elegida ? (
                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircleIcon className="h-4 w-4" /> {elegida.identificador}{elegida.modelo ? ` · ${elegida.modelo}` : ''}</p>
            ) : busqueda.length >= SERIE_MINIMA && coincidencias.length === 0 ? (
                <p className="mt-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                    No está en el inventario: se registrará como ONU nueva ({busqueda}) al {al}. Revisa que el serial o MAC esté completo.
                </p>
            ) : valor && coincidencias.length === 0 ? (
                <p className="mt-1 text-xs font-bold text-amber-600">Sigue escribiendo el serial o MAC completo.</p>
            ) : null}
            {abierta && !elegida && coincidencias.length > 0 && (
                <ul role="listbox" aria-label="ONUs disponibles" className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                    {coincidencias.map((o) => (
                        <li key={o.id}>
                            <button type="button" role="option" aria-selected={false} onClick={() => { onCambiar(o.identificador); setAbierta(false); }}
                                className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800">
                                <span className="font-mono text-sm font-semibold">{o.identificador}</span>
                                <span className="text-[11px] text-slate-500">{o.modelo || ''}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {escaneando && (
                <EscanerCodigo
                    titulo="Apunta al código de barras o QR de la ONU"
                    onLeido={alEscanear}
                    onCerrar={() => setEscaneando(false)}
                    onError={(mensaje) => { toast.error(mensaje, { duration: 6000 }); setEscaneando(false); }}
                />
            )}
        </div>
    );
}
