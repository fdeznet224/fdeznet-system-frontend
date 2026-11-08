import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { DocumentCheckIcon, PowerIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { BOTON_ACCION_PRIMARIO, BOTON_ACCION_SECUNDARIO, PILDORA, TARJETA } from '@/components/ui/estilo';
import { EncabezadoPagina } from '@/components/ui/Pagina';
import { apiErrorMessage } from '@/utils/apiError';
import ConfigEquipo from './ConfigEquipo';
import { hace, type EquipoTr069, type EstadoPlantilla } from './tr069';

/** Un módem del ACS: quién es, de qué cliente y su configuración completa. */
export default function EquipoTr069Page() {
    const { deviceId = '' } = useParams();
    const [equipo, setEquipo] = useState<EquipoTr069 | null>(null);
    const [reiniciando, setReiniciando] = useState(false);
    const [plantilla, setPlantilla] = useState<EstadoPlantilla | null>(null);
    const [ocupado, setOcupado] = useState<'revisar' | 'aplicar' | null>(null);
    const [version, setVersion] = useState(0);

    const plantillaAccion = async (accion: 'revisar' | 'aplicar') => {
        setOcupado(accion);
        try {
            const { data } = await client.post<EstadoPlantilla>(`/tr069/equipos/${encodeURIComponent(deviceId)}/plantilla/${accion}`, {}, { timeout: 300000 });
            setPlantilla(data);
            if (accion === 'aplicar') {
                toast.success(data.hecho?.length ? `Listo: ${data.hecho.join(', ')}` : 'Ya estaba como la plantilla');
                setVersion((v) => v + 1);
            } else if (!data.plantilla) {
                toast('No hay plantilla para este modelo');
            }
        } catch (e) {
            toast.error(apiErrorMessage(e, accion === 'aplicar' ? 'No se pudo aplicar la plantilla' : 'No se pudo revisar'));
        } finally {
            setOcupado(null);
        }
    };

    useEffect(() => {
        client.get<EquipoTr069>(`/tr069/equipos/${encodeURIComponent(deviceId)}`)
            .then(({ data }) => { setEquipo(data); setPlantilla(data.plantilla); })
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
            <div className={`${TARJETA} space-y-3 p-4`}>
                <div className="flex items-center gap-3">
                    <DocumentCheckIcon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">Plantilla{plantilla?.plantilla?.nombre ? `: ${plantilla.plantilla.nombre}` : ''}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {plantilla?.revisado_en ? `Revisado ${hace(plantilla.revisado_en)}` : 'Sin revisar'}
                            {plantilla?.aplicado_en ? ` · aplicada ${hace(plantilla.aplicado_en)}` : ''}
                        </p>
                    </div>
                    {plantilla?.conforme === true && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILDORA.verde}`}>Conforme</span>}
                    {plantilla?.conforme === false && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PILDORA.ambar}`}>Le falta</span>}
                </div>
                {plantilla?.error && <p className="text-xs text-rose-600">{plantilla.error}</p>}
                {plantilla && plantilla.faltan.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-600 dark:text-slate-300">
                        {plantilla.faltan.map((f) => <li key={f}>{f}</li>)}
                    </ul>
                )}
                <div className="flex gap-2">
                    <button type="button" onClick={() => void plantillaAccion('revisar')} disabled={ocupado !== null} className={`${BOTON_ACCION_SECUNDARIO} flex-1`}>
                        {ocupado === 'revisar' ? 'Revisando...' : 'Revisar'}
                    </button>
                    <button type="button" onClick={() => void plantillaAccion('aplicar')} disabled={ocupado !== null} className={`${BOTON_ACCION_PRIMARIO} flex-1`}>
                        {ocupado === 'aplicar' ? 'Aplicando...' : 'Aplicar plantilla'}
                    </button>
                </div>
            </div>
            <ConfigEquipo key={version} deviceId={deviceId} />
        </div>
    );
}
