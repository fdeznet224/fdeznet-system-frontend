import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardDocumentIcon, PhotoIcon } from '@heroicons/react/24/outline';

import { useBrand } from '@/context/brand/useBrand';
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, ETIQUETA_CAMPO, TARJETA } from '@/pages/technician/estilo';
import CalendarioCobro from './CalendarioCobro';
import { compartirImagen, fechaCorta, imagenCobro, pesos, type Cobro } from './imagenCobro';

interface Props {
    cobro: Cobro;
    /** Encabezado de la imagen: "Así sería tu cobro", el nombre del cliente... */
    titulo: string;
    subtitulo?: string | null;
    archivo: string;
    inicio?: string;
}

const tarjeta = `${TARJETA} space-y-4 p-4`;

/**
 * Montos, calendario y explicación del cobro de un cliente nuevo, con la
 * imagen lista para mandarle por WhatsApp.
 */
export default function ResumenCobro({ cobro, titulo, subtitulo, archivo, inicio }: Props) {
    const { brand } = useBrand();
    const [creando, setCreando] = useState(false);

    const copiar = () => {
        void navigator.clipboard?.writeText(cobro.explicacion.join('\n'));
        toast.success('Copiado');
    };

    const enviarImagen = async () => {
        setCreando(true);
        try {
            const blob = await imagenCobro({
                cobro,
                empresa: brand.empresa_nombre,
                color: brand.color_primario,
                titulo,
                subtitulo,
                telefono: brand.empresa_telefono,
            });
            const resultado = await compartirImagen(blob, `${archivo}.png`, cobro.explicacion.join('\n'));
            if (resultado === 'descargada') toast.success('Imagen descargada: mándala por WhatsApp');
        } catch {
            toast.error('No se pudo crear la imagen');
        } finally {
            setCreando(false);
        }
    };

    return (
        <>
            <div className={tarjeta}>
                <p className={ETIQUETA_CAMPO}>Calendario de cobro</p>
                <div className="grid grid-cols-2 gap-2">
                    {cobro.prorrateo && (
                        <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-500/10">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Prorrateo</p>
                            <p className="text-lg font-black">{pesos(cobro.prorrateo.total)}</p>
                            <p className="text-[11px] text-slate-500">{fechaCorta(cobro.prorrateo.desde)} – {fechaCorta(cobro.prorrateo.hasta)}</p>
                        </div>
                    )}
                    <div className={`rounded-2xl bg-slate-50 p-3 dark:bg-slate-800 ${cobro.prorrateo ? '' : 'col-span-2'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mensualidad</p>
                        <p className="text-lg font-black">{pesos(cobro.mensualidad)}</p>
                    </div>
                    <div className="col-span-2 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Primer pago · {fechaCorta(cobro.primer_pago.fecha)}</p>
                        <p className="text-2xl font-black">{pesos(cobro.primer_pago.total)}</p>
                    </div>
                </div>
                <CalendarioCobro fechas={cobro} inicio={inicio} />
            </div>
            <div className={tarjeta}>
                <p className={ETIQUETA_CAMPO}>Explicación para el cliente</p>
                <ul className="space-y-2 text-sm leading-snug text-slate-700 dark:text-slate-300">
                    {cobro.explicacion.map((linea) => (
                        <li key={linea} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{linea}</li>
                    ))}
                </ul>
                <button type="button" onClick={() => void enviarImagen()} disabled={creando} className={`${BOTON_PRIMARIO} h-11`}>
                    <PhotoIcon className="h-4 w-4" /> {creando ? 'Creando imagen...' : 'Enviar imagen al cliente'}
                </button>
                <button type="button" onClick={copiar} className={`${BOTON_SECUNDARIO} h-11 w-full`}>
                    <ClipboardDocumentIcon className="h-4 w-4" /> Copiar explicación
                </button>
            </div>
        </>
    );
}
