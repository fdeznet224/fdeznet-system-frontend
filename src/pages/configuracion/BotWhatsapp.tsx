import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, SparklesIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import AgenteIA, { type ConfiguracionAgente, type ModoAgente } from '@/pages/admin/mensajes/AgenteIA';
import BotFlowBuilder from './BotFlowBuilder';

const OPCIONES: { valor: ModoAgente; titulo: string; descripcion: string }[] = [
  { valor: 'automatico', titulo: 'Agente de IA', descripcion: 'Contesta solo, las 24 horas, consultando el sistema: cuenta, conexión, promesas y comprobantes.' },
  { valor: 'sugerencia', titulo: 'Agente de IA con aprobación', descripcion: 'El agente redacta y un asesor aprueba cada respuesta antes de enviarla.' },
  { valor: 'apagado', titulo: 'Bot de flujo (menú)', descripcion: 'Contesta el menú de opciones que armas en «Flujo del bot».' },
];

type Pestana = 'agente' | 'flujo';

export default function BotWhatsapp() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [modo, setModo] = useState<ModoAgente | null>(null);
  const [tieneClave, setTieneClave] = useState(false);
  const [cambiando, setCambiando] = useState(false);
  const pestana: Pestana = params.get('tab') === 'flujo' ? 'flujo' : 'agente';

  useEffect(() => {
    client.get<ConfiguracionAgente>('/agente-ia/configuracion')
      .then(({ data }) => { setModo(data.modo); setTieneClave(data.tiene_clave); })
      .catch(() => toast.error('No se pudo cargar quién contesta'));
  }, []);

  const elegir = async (valor: ModoAgente) => {
    if (valor === modo || cambiando) return;
    setCambiando(true);
    try {
      await client.put('/agente-ia/configuracion', { modo: valor });
      setModo(valor);
      toast.success(valor === 'apagado' ? 'Ahora contesta el bot de flujo' : 'Ahora contesta el agente de IA');
    } catch (error) {
      const detalle = axios.isAxiosError<{ detail?: string }>(error) ? error.response?.data?.detail : null;
      toast.error(detalle || 'No se pudo cambiar');
    } finally {
      setCambiando(false);
    }
  };

  const verPestana = (valor: Pestana) => setParams(valor === 'agente' ? {} : { tab: valor }, { replace: true });

  return (
    <div className="mx-auto max-w-[1700px] space-y-6 p-4 pb-10 md:p-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/configuracion')} className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800" aria-label="Regresar">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Bot de WhatsApp</h1>
          <p className="text-sm text-slate-500">Elige quién contesta a los clientes y configúralo.</p>
        </div>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-500">¿Quién contesta a los clientes?</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {OPCIONES.map((opcion) => {
            const activo = modo === opcion.valor;
            const sinClave = opcion.valor !== 'apagado' && !tieneClave;
            return (
              <button
                key={opcion.valor}
                type="button"
                aria-pressed={activo}
                disabled={modo === null || cambiando || (sinClave && !activo)}
                onClick={() => void elegir(opcion.valor)}
                className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed ${activo ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'} ${sinClave && !activo ? 'opacity-50' : ''}`}
              >
                <span className="block font-black text-slate-900 dark:text-white">{opcion.titulo}</span>
                <span className="mt-1 block text-xs text-slate-500">{opcion.descripcion}</span>
                {sinClave && <span className="mt-2 block text-[11px] font-bold text-amber-700 dark:text-amber-300">Falta la clave de IA en Integraciones y claves</span>}
              </button>
            );
          })}
        </div>
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <WrenchScrewdriverIcon className="mt-0.5 h-4 w-4 shrink-0" />
          El bot técnico del personal funciona siempre, elijas lo que elijas: se abre con su comando y responde solo a los usuarios autorizados.
        </p>
      </section>

      <div className="flex gap-2">
        {([['agente', 'Agente de IA', SparklesIcon], ['flujo', 'Flujo del bot', ChatBubbleLeftRightIcon]] as const).map(([valor, titulo, Icono]) => (
          <button
            key={valor}
            type="button"
            onClick={() => verPestana(valor)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${pestana === valor ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            <Icono className="h-4 w-4" /> {titulo}
          </button>
        ))}
      </div>

      {pestana === 'flujo' && modo && modo !== 'apagado' && (
        <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          Ahora contesta el agente de IA: el flujo «Bot clientes» no se usa hasta que elijas «Bot de flujo». El «Bot técnico» sí funciona.
        </p>
      )}

      {pestana === 'agente' ? <AgenteIA /> : <BotFlowBuilder incrustado />}
    </div>
  );
}
