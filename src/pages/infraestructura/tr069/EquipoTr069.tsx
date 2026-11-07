import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { PowerIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { BOTON_ACCION_SECUNDARIO, TARJETA } from '@/components/ui/estilo';
import { EncabezadoPagina } from '@/components/ui/Pagina';
import { apiErrorMessage } from '@/utils/apiError';
import ConfigEquipo from './ConfigEquipo';
import { hace, type EquipoTr069 } from './tr069';

/** Un módem del ACS: quién es, de qué cliente y su configuración completa. */
export default function EquipoTr069Page() {
    const { deviceId = '' } = useParams();
    const [equipo, setEquipo] = useState<EquipoTr069 | null>(null);
    const [reiniciando, setReiniciando] = useState(false);

    useEffect(() => {
        client.get<EquipoTr069>(`/tr069/equipos/${encodeURIComponent(deviceId)}`)
            .then(({ data }) => setEquipo(data))
            .catch((e) => toast.error(apiErrorMessage(e, 'No se encontró el equipo')));
    }, [deviceId]);

    const reiniciar = async () => {
        if (!window.confirm('¿Reiniciar el equipo? El cliente se queda sin internet un par de minutos.')) return;
        setReiniciando(true);
        try {
            await client.post(`/tr069/equipos/${encodeURIComponent(deviceId)}/reiniciar`, {}, { timeout: 60000 });
            toast.success('Reiniciando el equipo');
        } catch (e) {
            toast.error(apiErrorMessage(e, 'No se pudo reiniciar'));
        } finally {
            setReiniciando(false);
        }
    };

    return (
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
            <EncabezadoPagina
                volver={{ a: '/admin/tr069', texto: 'TR-069' }}
                titulo={equipo?.modelo || 'Equipo'}
                descripcion={equipo ? [equipo.serie, equipo.ip, `reporte ${hace(equipo.ultimo_reporte)}`].filter(Boolean).join(' · ') : 'Leyendo...'}
                acciones={(
                    <button type="button" onClick={() => void reiniciar()} disabled={reiniciando} className={BOTON_ACCION_SECUNDARIO}>
                        <PowerIcon className="h-4 w-4" /> {reiniciando ? 'Reiniciando...' : 'Reiniciar'}
                    </button>
                )}
            />
            {equipo && (
                <div className={`${TARJETA} grid grid-cols-2 gap-3 p-4 text-sm`}>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Cliente</p>
                        {equipo.cliente
                            ? <Link to={`/admin/clientes?revisar=${equipo.cliente.id}`} className="font-semibold text-blue-600 dark:text-blue-400">{equipo.cliente.nombre}</Link>
                            : <p className="font-semibold text-amber-600">Sin cliente</p>}
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Firmware</p>
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{equipo.firmware || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Fabricante</p>
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{equipo.fabricante || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Último arranque</p>
                        <p className="font-semibold text-slate-900 dark:text-white">{hace(equipo.ultimo_arranque)}</p>
                    </div>
                </div>
            )}
            <ConfigEquipo deviceId={deviceId} />
        </div>
    );
}
