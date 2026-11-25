import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

import type { Falla } from './tipos';

function haceCuanto(desde: string) {
    const minutos = Math.max(0, Math.round((Date.now() - new Date(desde).getTime()) / 60000));
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.floor(minutos / 60);
    return `hace ${horas} h ${minutos % 60} min`;
}

/**
 * El punto de falla de la red (el equipo caído más alto): ahí es el corte de luz
 * o el equipo dañado. Al tocarlo lleva a ese equipo en el mapa.
 */
export default function AvisoFallas({ fallas, onElegir, enlace = false }: { fallas: Falla[]; onElegir?: (clave: string) => void; enlace?: boolean }) {
    if (!fallas.length) return null;
    return (
        <div className="rounded-2xl bg-rose-50 p-3 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:ring-rose-500/30" data-testid="aviso-fallas" role="alert">
            {fallas.map((f) => {
                const texto = (
                    <>
                        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                        <span className="min-w-0 flex-1 text-sm text-rose-800 dark:text-rose-200">
                            <span className="font-bold">Sin respuesta: {f.tipo_nombre !== 'OLT' ? `${f.tipo_nombre} ` : ''}{f.nombre}</span>
                            {f.ip ? ` (${f.ip})` : ''} {haceCuanto(f.desde)} · <span className="font-semibold">{f.clientes_afectados} clientes afectados</span> · posible corte de luz o falla del equipo
                        </span>
                    </>
                );
                const clase = 'flex w-full items-start gap-2 rounded-xl p-1.5 text-left hover:bg-rose-100/70 dark:hover:bg-rose-500/10';
                return enlace ? (
                    <Link key={f.clave} to={`/admin/topologia?foco=${f.clave}`} className={clase}>{texto}</Link>
                ) : (
                    <button key={f.clave} type="button" onClick={() => onElegir?.(f.clave)} className={clase}>{texto}</button>
                );
            })}
        </div>
    );
}
