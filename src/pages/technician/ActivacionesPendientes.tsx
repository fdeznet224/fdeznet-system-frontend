import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { listarActivacionesPendientes, type ActivacionPendiente } from './activacionesPendientes';

/** Clientes recién activados cuya explicación el técnico no ha terminado. */
export default function ActivacionesPendientes() {
    const navigate = useNavigate();
    const [pendientes, setPendientes] = useState<ActivacionPendiente[]>([]);

    useEffect(() => {
        void listarActivacionesPendientes().then(setPendientes);
    }, []);

    if (!pendientes.length) return null;
    return (
        <div className="flex flex-col gap-2">
            {pendientes.map((activacion) => (
                <button
                    key={activacion.ordenId}
                    type="button"
                    onClick={() => navigate(`/tech/activar/${activacion.ordenId}`)}
                    className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left transition active:scale-[0.98] dark:border-emerald-500/20 dark:bg-emerald-500/10"
                >
                    <CheckCircleIcon className="h-8 w-8 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">Cliente activado · instalación sin terminar</p>
                        <p className="truncate font-bold text-slate-900 dark:text-white">{activacion.nombre}</p>
                        <p className="text-xs text-slate-500">Ver PPPoE, cobro y explicación · {activacion.contrato}</p>
                    </div>
                    <ChevronRightIcon className="h-5 w-5 shrink-0 text-emerald-600" />
                </button>
            ))}
        </div>
    );
}
