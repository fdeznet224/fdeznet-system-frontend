import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ClipboardDocumentIcon, ServerStackIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { BOTON_ACCION_PRIMARIO, TARJETA } from '@/components/ui/estilo';
import { CuadroIcono } from '@/components/ui/Pagina';
import { apiErrorMessage } from '@/utils/apiError';

export interface DatosAcs {
    en_la_nube: boolean;
    activo: boolean;
    url: string | null;
    usuario: string | null;
    clave: string | null;
    intervalo: number;
}

function copiar(texto: string) {
    void navigator.clipboard?.writeText(texto).then(() => toast.success('Copiado')).catch(() => toast.error('No se pudo copiar'));
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
    return (
        <div className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{etiqueta}</p>
                <p className="break-all font-mono text-sm font-bold text-slate-900 dark:text-white">{valor}</p>
            </div>
            <button type="button" aria-label={`Copiar ${etiqueta}`} onClick={() => copiar(valor)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
                <ClipboardDocumentIcon className="h-4 w-4" />
            </button>
        </div>
    );
}

/** En la nube cada ISP tiene su propio ACS: se activa aquí y da los datos para el módem. */
export default function AcsDelIsp({ onCambio }: { onCambio: (acs: DatosAcs) => void }) {
    const [acs, setAcs] = useState<DatosAcs | null>(null);
    const [activando, setActivando] = useState(false);

    const leer = useCallback(async () => {
        try {
            const { data } = await client.get<DatosAcs>('/tr069/acs');
            setAcs(data);
            onCambio(data);
            return data;
        } catch {
            return null; // La API se reinicia al activar el ACS.
        }
    }, [onCambio]);

    useEffect(() => {
        const t = window.setTimeout(() => void leer(), 0);
        return () => window.clearTimeout(t);
    }, [leer]);

    // Mientras se crea, se pregunta cada 10 s hasta que quede.
    useEffect(() => {
        if (!activando) return undefined;
        const intervalo = window.setInterval(() => {
            void leer().then((datos) => {
                if (datos?.activo) {
                    setActivando(false);
                    toast.success('Tu ACS quedó activo');
                }
            });
        }, 10000);
        return () => window.clearInterval(intervalo);
    }, [activando, leer]);

    if (!acs?.en_la_nube) return null;

    const activar = async () => {
        setActivando(true);
        try {
            await client.post('/tr069/acs/activar');
        } catch (error) {
            setActivando(false);
            toast.error(apiErrorMessage(error, 'No se pudo activar el ACS'));
        }
    };

    if (!acs.activo) {
        return (
            <div className={`${TARJETA} space-y-3 p-4`} data-testid="acs-del-isp">
                <div className="flex gap-3">
                    <CuadroIcono icono={ServerStackIcon} tono="azul" />
                    <div className="min-w-0 space-y-1 text-sm">
                        <p className="font-bold text-slate-900 dark:text-white">Activa tu ACS (TR-069)</p>
                        <p className="text-slate-600 dark:text-slate-300">
                            Es el servidor al que se reportan tus módems para ver y cambiar su WiFi, su PPPoE y su configuración desde aquí, y para que las plantillas se apliquen solas.
                            Se crea uno solo para ti, con su usuario y contraseña.
                        </p>
                    </div>
                </div>
                <button type="button" disabled={activando} onClick={() => void activar()} className={`${BOTON_ACCION_PRIMARIO} w-full`}>
                    {activando ? 'Activando… tarda 1 o 2 minutos' : 'Activar mi ACS'}
                </button>
            </div>
        );
    }

    return (
        <details className={`${TARJETA} group p-4`} data-testid="acs-del-isp">
            <summary className="flex cursor-pointer list-none items-center gap-3">
                <CuadroIcono icono={ServerStackIcon} tono="verde" />
                <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold text-slate-900 dark:text-white">Tu ACS está activo</p>
                    <p className="text-slate-500 dark:text-slate-400">Toca para ver los datos que se ponen en el módem.</p>
                </div>
            </summary>
            <div className="mt-3 space-y-3 text-sm">
                <div className="divide-y divide-slate-100 rounded-xl bg-slate-50 px-3 dark:divide-white/10 dark:bg-white/5">
                    {acs.url && <Dato etiqueta="URL del ACS" valor={acs.url} />}
                    {acs.usuario && <Dato etiqueta="Usuario" valor={acs.usuario} />}
                    {acs.clave && <Dato etiqueta="Contraseña" valor={acs.clave} />}
                    <Dato etiqueta="Reporte periódico (segundos)" valor={String(acs.intervalo)} />
                </div>
                <ul className="list-disc space-y-1 pl-5 text-slate-600 dark:text-slate-300">
                    <li>En el módem (TR-069 / ACS): pon la URL, el usuario y la contraseña, y activa el reporte periódico.</li>
                    <li>La WAN con internet debe tener el servicio TR069 (Huawei: <span className="font-mono">TR069_INTERNET</span>).</li>
                    <li>Al reportarse por primera vez, el sistema le pone lo demás (usuario y clave para llamarlo y el reporte cada 5 minutos).</li>
                    <li>Para que el sistema llame al módem al momento, la red de tus clientes debe ir en las subredes de la VPN de tu MikroTik.</li>
                </ul>
            </div>
        </details>
    );
}
