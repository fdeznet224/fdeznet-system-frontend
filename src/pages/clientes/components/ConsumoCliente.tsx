import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronLeftIcon, ChevronRightIcon, PhotoIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { useBrand } from '@/context/brand/useBrand';
import { BOTON_ACCION_PRIMARIO, BOTON_ICONO, TARJETA } from '@/components/ui/estilo';
import { apiErrorMessage } from '@/utils/apiError';
import {
    compartirImagen, datos, diasRegistrados, estadoDia, horas, hoyIso, imagenConsumo,
    moverMes, nombreMes, type ConsumoMes, type EstadoDia,
} from './consumo';

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const CELDA: Record<EstadoDia, string> = {
    uso: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
    sin_uso: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
    sin_registro: 'bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500',
    futuro: 'text-slate-300 dark:text-slate-600',
};

/**
 * Los datos que usó el cliente cada día del mes, sacados del MikroTik. Sirve
 * para mostrarle qué días sí tuvo internet cuando reclama un cobro.
 */
export default function ConsumoCliente({ clienteId, nombre }: { clienteId: number; nombre: string }) {
    const { brand } = useBrand();
    const [mes, setMes] = useState(() => hoyIso().slice(0, 7));
    const [consumo, setConsumo] = useState<ConsumoMes | null>(null);
    const [cargando, setCargando] = useState(true);
    const [creando, setCreando] = useState(false);
    const [elegido, setElegido] = useState<string | null>(null);

    useEffect(() => {
        let vigente = true;
        setCargando(true);
        setElegido(null);
        client.get<ConsumoMes>(`/clientes/${clienteId}/consumo`, { params: { mes } })
            .then(({ data }) => { if (vigente) setConsumo(data); })
            .catch((error) => { if (vigente) { setConsumo(null); toast.error(apiErrorMessage(error, 'No se pudo leer el consumo')); } })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, [clienteId, mes]);

    const enviarImagen = async () => {
        if (!consumo) return;
        setCreando(true);
        try {
            const blob = await imagenConsumo({
                consumo, cliente: nombre, empresa: brand.empresa_nombre,
                color: brand.color_primario, telefono: brand.empresa_telefono,
            });
            const texto = `Uso de internet de ${nombre} en ${nombreMes(consumo.mes).toLowerCase()}: ${consumo.dias_con_uso} días con uso.`;
            const resultado = await compartirImagen(blob, `consumo-${consumo.mes}-${clienteId}.png`, texto);
            if (resultado === 'descargada') toast.success('Imagen descargada: mándala por WhatsApp');
        } catch {
            toast.error('No se pudo crear la imagen');
        } finally {
            setCreando(false);
        }
    };

    const esteMes = hoyIso().slice(0, 7);
    const [anio, numero] = mes.split('-').map(Number);
    const huecos = (new Date(anio, numero - 1, 1).getDay() + 6) % 7;
    const dia = consumo?.dias.find((d) => d.fecha === elegido);
    const registrados = consumo ? diasRegistrados(consumo) : 0;
    const minutos = consumo?.dias.reduce((total, d) => total + d.minutos, 0) ?? 0;

    return (
        <div className={`${TARJETA} space-y-4 p-4`}>
            <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => setMes(moverMes(mes, -1))} aria-label="Mes anterior" className={BOTON_ICONO}>
                    <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <div className="text-center">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Consumo de {nombreMes(mes).toLowerCase()}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Datos tomados del MikroTik cada 5 minutos</p>
                </div>
                <button type="button" onClick={() => setMes(moverMes(mes, 1))} disabled={mes >= esteMes} aria-label="Mes siguiente" className={`${BOTON_ICONO} disabled:opacity-40`}>
                    <ChevronRightIcon className="h-4 w-4" />
                </button>
            </div>

            {cargando && <p className="py-8 text-center text-sm text-slate-400">Cargando...</p>}

            {!cargando && consumo && (
                <>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Días con uso</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{consumo.dias_con_uso}<span className="text-sm font-semibold text-slate-400"> / {registrados}</span></p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Datos</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{datos(consumo.total_bajada + consumo.total_subida)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">En línea</p>
                            <p className="text-lg font-bold text-slate-900 dark:text-white">{horas(minutos)}</p>
                        </div>
                    </div>

                    {(!consumo.registro_desde || consumo.registro_desde > consumo.dias[consumo.dias.length - 1].fecha) ? (
                        <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                            {consumo.registro_desde
                                ? `Este mes no tiene registro: el sistema guarda el consumo desde el ${new Date(`${consumo.registro_desde}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                                : 'Todavía no hay consumo registrado de este cliente. Se guarda desde que se conecta por PPPoE.'}
                        </p>
                    ) : (
                        <>
                            <div className="grid grid-cols-7 gap-1 text-center" data-testid="calendario-consumo">
                                {DIAS_SEMANA.map((d, n) => <span key={n} className="pb-1 text-[11px] font-semibold text-slate-400">{d}</span>)}
                                {Array.from({ length: huecos }, (_, n) => <span key={`h${n}`} />)}
                                {consumo.dias.map((d) => {
                                    const estado = estadoDia(d, consumo.registro_desde);
                                    return (
                                        <button
                                            key={d.fecha}
                                            type="button"
                                            disabled={estado === 'futuro'}
                                            onClick={() => setElegido(d.fecha === elegido ? null : d.fecha)}
                                            className={`flex aspect-square min-h-11 flex-col items-center justify-center rounded-lg text-sm font-bold transition ${CELDA[estado]} ${elegido === d.fecha ? 'ring-2 ring-blue-500' : ''}`}
                                        >
                                            {Number(d.fecha.slice(8))}
                                            {estado === 'uso' && <span className="hidden text-[10px] font-semibold opacity-80 sm:block">{datos(d.bajada + d.subida)}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            {dia ? (
                                <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                                    <span className="font-semibold">{new Date(`${dia.fecha}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}:</span>{' '}
                                    {dia.bajada + dia.subida > 0
                                        ? `bajó ${datos(dia.bajada)} y subió ${datos(dia.subida)}; en línea ${horas(dia.minutos)}.`
                                        : estadoDia(dia, consumo.registro_desde) === 'sin_uso' ? 'no se conectó.' : 'sin registro.'}
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-200 dark:bg-emerald-500/40" />Usó internet</span>
                                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-200 dark:bg-rose-500/40" />Sin uso</span>
                                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />Sin registro</span>
                                </div>
                            )}
                            <button type="button" onClick={enviarImagen} disabled={creando} className={`${BOTON_ACCION_PRIMARIO} w-full`}>
                                <PhotoIcon className="h-4 w-4" /> {creando ? 'Creando imagen...' : 'Mandar imagen al cliente'}
                            </button>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
