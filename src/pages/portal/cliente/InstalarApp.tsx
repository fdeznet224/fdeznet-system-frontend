import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

import { useInstalacion } from './instalacion';
import { BOTON_SUAVE, TARJETA } from './ui';

/** "Instala la app": en Android con el aviso del navegador; en iPhone, con los pasos de Safari. */
export default function InstalarApp({ color }: { color: string }) {
    const { disponible, iphone, instalar } = useInstalacion();
    const [verPasos, setVerPasos] = useState(false);
    if (!disponible) return null;
    return (
        <section className={`${TARJETA} space-y-3`}>
            <div className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${color}1a`, color }}>
                    <ArrowDownTrayIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">Instala la app</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Ten tu cuenta a un toque desde tu pantalla de inicio.</p>
                </div>
                <button type="button" onClick={() => (iphone ? setVerPasos((v) => !v) : void instalar())} className={BOTON_SUAVE}>Instalar</button>
            </div>
            {iphone && verPasos && (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                    En Safari toca el botón <strong>Compartir</strong> (el cuadro con la flecha) y luego <strong>Agregar a inicio</strong>.
                </p>
            )}
        </section>
    );
}
