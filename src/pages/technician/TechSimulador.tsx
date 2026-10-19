import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import client from '../../api/axios';
import { cachedRequest } from '../../offline/db';
import { apiErrorMessage } from '@/utils/apiError';
import ResumenCobro from '@/components/cobro/ResumenCobro';
import { pesos, type Cobro } from '@/components/cobro/imagenCobro';
import { CAMPO, ETIQUETA_CAMPO, TARJETA } from './estilo';

interface ZonaSimulador {
    id: number;
    nombre: string;
    plantilla?: { nombre: string; dia_pago?: number | null; dias_tolerancia: number } | null;
    planes: { id: number; nombre: string; precio: number; velocidad_bajada?: number | null }[];
}

interface Simulacion extends Cobro {
    zona: string;
    plan: string;
    velocidad_bajada?: number | null;
}

const campo = `${CAMPO} min-h-11`;
const tarjeta = `${TARJETA} space-y-4 p-4`;

const hoyLocal = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
};

const megas = (kbps?: number | null) => (kbps ? `${Math.round(kbps / 1024)} Mbps` : null);

/**
 * El cliente pregunta cuánto y cuándo pagaría: el técnico elige zona, plan y
 * día de instalación y le manda la imagen, sin dar de alta nada.
 */
export default function TechSimulador() {
    const navigate = useNavigate();
    const [zonas, setZonas] = useState<ZonaSimulador[]>([]);
    const [zonaId, setZonaId] = useState('');
    const [planId, setPlanId] = useState('');
    const [fecha, setFecha] = useState(hoyLocal);
    const [mesesGratis, setMesesGratis] = useState(1);
    const [simulacion, setSimulacion] = useState<Simulacion | null>(null);
    const [calculando, setCalculando] = useState(false);

    useEffect(() => {
        cachedRequest<ZonaSimulador[]>('simulador-cobro', async () => (
            await client.get<ZonaSimulador[]>('/zonas/simulador-cobro')
        ).data)
            .then(({ data, fromCache }) => {
                setZonas(data);
                if (fromCache) toast('Sin internet: zonas y planes guardados en tu celular');
            })
            .catch(() => toast.error('Ábrelo una vez con internet para cargar zonas y planes'));
    }, []);

    const zona = zonas.find((z) => String(z.id) === zonaId);

    useEffect(() => {
        if (!zonaId || !planId || !fecha) return;
        let vigente = true;
        const consulta = new URLSearchParams({ plan_id: planId, fecha, meses_gratis: String(mesesGratis) });
        const calcular = window.setTimeout(() => {
            setCalculando(true);
            client.get<Simulacion>(`/zonas/${zonaId}/simular-cobro?${consulta}`)
                .then(({ data }) => { if (vigente) setSimulacion(data); })
                .catch((error) => { if (vigente) toast.error(apiErrorMessage(error, 'Se necesita internet para calcular')); })
                .finally(() => { if (vigente) setCalculando(false); });
        }, 0);
        return () => {
            vigente = false;
            window.clearTimeout(calcular);
        };
    }, [zonaId, planId, fecha, mesesGratis]);

    const elegirZona = (valor: string) => {
        setZonaId(valor);
        setPlanId('');
        setSimulacion(null);
    };

    const elegirPlan = (valor: string) => {
        setPlanId(valor);
        if (!valor) setSimulacion(null);
    };

    const fechaLarga = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
    const resultado = simulacion && planId ? simulacion : null;

    return (
        <div className="min-h-screen bg-slate-50 pb-16 text-slate-900 dark:bg-slate-950 dark:text-white">
            <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-xl dark:border-slate-800 dark:bg-[#11151f]/95">
                <button type="button" aria-label="Volver" onClick={() => navigate('/tech/dashboard')} className="-ml-1 rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 active:scale-90 dark:text-slate-400 dark:hover:bg-slate-800">
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-500">Simular cobro</p>
                    <p className="truncate text-base font-bold">¿Cuánto pagaría el cliente?</p>
                </div>
            </div>
            <div className="mx-auto max-w-lg space-y-4 p-4">
                <div className={tarjeta}>
                    <label className="block"><span className={ETIQUETA_CAMPO}>Zona</span>
                        <select value={zonaId} onChange={(e) => elegirZona(e.target.value)} className={campo}>
                            <option value="">Elige la zona</option>
                            {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                        </select>
                        {zona && (
                            <span className="mt-1 block text-[11px] text-slate-500">
                                {zona.plantilla?.dia_pago
                                    ? `Pagan el día ${zona.plantilla.dia_pago} de cada mes`
                                    : 'Esta zona no tiene plantilla de cobro'}
                                {zona.plantilla?.dias_tolerancia ? ` · ${zona.plantilla.dias_tolerancia} días de tolerancia` : ''}
                            </span>
                        )}
                    </label>
                    <label className="block"><span className={ETIQUETA_CAMPO}>Plan</span>
                        <select value={planId} onChange={(e) => elegirPlan(e.target.value)} disabled={!zona} className={campo}>
                            <option value="">{zona && zona.planes.length === 0 ? 'La zona no tiene planes' : 'Elige el plan'}</option>
                            {zona?.planes.map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre} · {pesos(p.precio)}</option>
                            ))}
                        </select>
                    </label>
                    <label className="block"><span className={ETIQUETA_CAMPO}>Día de instalación</span>
                        <input type="date" value={fecha} min={hoyLocal()} onChange={(e) => setFecha(e.target.value || hoyLocal())} className={campo} />
                    </label>
                    <div>
                        <span className={ETIQUETA_CAMPO}>¿Qué tipo de alta es?</span>
                        <div className="grid grid-cols-2 gap-2">
                            {([
                                [1, 'Instalación nueva', '1 mes gratis'],
                                [0, 'Cambio de compañía', 'Paga desde que se instala'],
                            ] as const).map(([valor, titulo, detalle]) => {
                                const activo = mesesGratis === valor;
                                return (
                                    <button
                                        key={valor}
                                        type="button"
                                        aria-pressed={activo}
                                        onClick={() => setMesesGratis(valor)}
                                        className={`rounded-xl border px-3 py-2.5 text-left transition ${activo
                                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-500/10'
                                            : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'}`}
                                    >
                                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{titulo}</span>
                                        <span className={`block text-[11px] ${activo ? 'font-semibold text-blue-700 dark:text-blue-300' : 'text-slate-500'}`}>{detalle}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {calculando && !resultado && <p className="text-center text-sm text-slate-500">Calculando...</p>}
                {resultado && (
                    <div className={`space-y-4 transition-opacity ${calculando ? 'opacity-60' : ''}`}>
                        <ResumenCobro
                            cobro={resultado}
                            titulo="Así sería tu cobro"
                            subtitulo={[`Plan ${resultado.plan}`, megas(resultado.velocidad_bajada), `instalando el ${fechaLarga}`].filter(Boolean).join(' · ')}
                            archivo={`cobro-${resultado.plan}-${fecha}`.replace(/[^\w-]+/g, '-')}
                            inicio="Día de instalación"
                        />
                        <p className="px-1 text-center text-xs text-slate-500">
                            Es una simulación: no se da de alta al cliente ni se genera ningún cobro.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
