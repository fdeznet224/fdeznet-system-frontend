import { useEffect, useState } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';

interface MesEmbudo {
    mes: string;
    contactos_nuevos: number;
    solicitudes: number;
    por_agente: number;
    instaladas: number;
    canceladas: number;
    abiertas: number;
    dias_a_instalar: number | null;
}

const nombreMes = (mes: string) => {
    const [anio, numero] = mes.split('-').map(Number);
    const texto = new Date(anio, numero - 1, 1).toLocaleDateString('es-MX', { month: 'short' });
    return texto.charAt(0).toUpperCase() + texto.slice(1).replace('.', '');
};

/** De quien escribe por WhatsApp a quien queda instalado, mes por mes. */
export default function EmbudoVentas() {
    const [meses, setMeses] = useState<MesEmbudo[] | null>(null);

    useEffect(() => {
        let vigente = true;
        client.get<MesEmbudo[]>('/dashboard/embudo?meses=6')
            .then(({ data }) => { if (vigente) setMeses(data); })
            .catch(() => { if (vigente) setMeses([]); });
        return () => { vigente = false; };
    }, []);

    if (!meses || meses.length === 0) return null;
    const maximo = Math.max(1, ...meses.map((m) => m.solicitudes));

    return (
        <div className="app-card flex-none p-4 md:p-5">
            <div className="mb-3 flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-indigo-500" />
                <h2 className="font-black text-slate-800 dark:text-white">Ventas: de WhatsApp a instalado</h2>
            </div>
            <div className="-mx-1 overflow-x-auto px-1">
                <table className="w-full min-w-[560px] text-left text-xs">
                    <thead className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        <tr>
                            <th className="py-2">Mes</th>
                            <th className="py-2" title="Números que escribieron por primera vez ese mes (prospectos y clientes)">Escribieron</th>
                            <th className="py-2">Solicitudes</th>
                            <th className="py-2">Instaladas</th>
                            <th className="py-2">Canceladas</th>
                            <th className="py-2">Abiertas</th>
                            <th className="py-2">Días a instalar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-bold text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                        {meses.map((m) => (
                            <tr key={m.mes}>
                                <td className="py-2.5 font-black">{nombreMes(m.mes)}</td>
                                <td className="py-2.5">{m.contactos_nuevos}</td>
                                <td className="py-2.5">
                                    <span className="flex items-center gap-2">
                                        <span className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.max(4, (m.solicitudes / maximo) * 64)}px` }} />
                                        {m.solicitudes}
                                        {m.por_agente > 0 && <span className="text-[10px] font-semibold text-slate-400">({m.por_agente} del agente)</span>}
                                    </span>
                                </td>
                                <td className="py-2.5 text-emerald-600 dark:text-emerald-400">{m.instaladas}</td>
                                <td className="py-2.5 text-rose-600 dark:text-rose-400">{m.canceladas}</td>
                                <td className="py-2.5">{m.abiertas}</td>
                                <td className="py-2.5">{m.dias_a_instalar == null ? '—' : m.dias_a_instalar}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
