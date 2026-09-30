import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { SparklesIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import AgenteSugerencias from './AgenteSugerencias';

type Modo = 'apagado' | 'sugerencia' | 'automatico';

interface Configuracion {
  modo: Modo;
  url: string;
  modelo: string;
  tiene_clave: boolean;
  conocimiento: string;
  mes: { por_estado: Record<string, number>; costo_usd: number };
}

const MODOS: { valor: Modo; titulo: string; descripcion: string }[] = [
  { valor: 'apagado', titulo: 'Apagado', descripcion: 'Contesta el bot de menú de siempre.' },
  { valor: 'sugerencia', titulo: 'Sugerencia', descripcion: 'El agente redacta y un asesor aprueba antes de enviar.' },
  { valor: 'automatico', titulo: 'Automático', descripcion: 'El agente contesta solo, las 24 horas.' },
];

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Por revisar',
  aprobada: 'Aprobadas sin cambios',
  editada: 'Editadas',
  descartada: 'Descartadas',
  enviada: 'Enviadas solas',
  error: 'Con error',
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export default function AgenteIA() {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    const { data } = await client.get<Configuracion>('/agente-ia/configuracion');
    setConfig(data);
  };

  useEffect(() => {
    cargar().catch(() => toast.error('No se pudo cargar el agente'));
  }, []);

  const guardar = async () => {
    if (!config) return;
    setGuardando(true);
    try {
      await client.put('/agente-ia/configuracion', {
        modo: config.modo,
        url: config.url,
        modelo: config.modelo,
        conocimiento: config.conocimiento,
        api_key: apiKey.trim() || null,
      });
      setApiKey('');
      toast.success('Agente actualizado');
      await cargar();
    } catch (error) {
      const detalle = axios.isAxiosError<{ detail?: string }>(error) ? error.response?.data?.detail : null;
      toast.error(detalle || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  if (!config) return <div className="p-8 text-slate-500">Cargando…</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-violet-100 p-2 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
          <SparklesIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Agente de IA</h1>
          <p className="text-sm text-slate-500">Atiende WhatsApp consultando el sistema: cuenta, conexión, promesas y comprobantes.</p>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-3">
          {MODOS.map((m) => (
            <button
              key={m.valor}
              type="button"
              aria-pressed={config.modo === m.valor}
              onClick={() => setConfig({ ...config, modo: m.valor })}
              className={`rounded-xl border p-4 text-left transition-colors ${config.modo === m.valor ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/10' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
            >
              <span className="block font-black text-slate-900 dark:text-white">{m.titulo}</span>
              <span className="mt-1 block text-xs text-slate-500">{m.descripcion}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-xs font-bold text-slate-500">
            Clave de API {config.tiene_clave ? '(guardada)' : '(falta)'}
            <input
              type="password"
              autoComplete="off"
              className={`${inputClass} mt-1`}
              placeholder={config.tiene_clave ? 'Déjalo vacío para conservarla' : 'Pega la clave de DeepSeek'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Modelo
            <input className={`${inputClass} mt-1`} value={config.modelo} onChange={(e) => setConfig({ ...config, modelo: e.target.value })} />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Servidor (compatible con OpenAI)
            <input className={`${inputClass} mt-1`} value={config.url} onChange={(e) => setConfig({ ...config, url: e.target.value })} />
          </label>
        </div>

        <label className="block text-xs font-bold text-slate-500">
          Conocimiento del negocio (planes, fichas, puntos de pago, reglas). El agente solo afirma lo que está aquí o en el sistema.
          <textarea
            rows={14}
            className={`${inputClass} mt-1 font-mono text-xs`}
            value={config.conocimiento}
            onChange={(e) => setConfig({ ...config, conocimiento: e.target.value })}
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Este mes: <b>US${config.mes.costo_usd.toFixed(2)}</b>
            {Object.entries(config.mes.por_estado).map(([estado, n]) => (
              <span key={estado}> · {ETIQUETA_ESTADO[estado] ?? estado}: {n}</span>
            ))}
          </p>
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={guardando}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Sugerencias por revisar</h2>
        <p className="text-xs text-slate-500">Incluye las de números que todavía no dan su contrato.</p>
        <AgenteSugerencias />
      </section>
    </div>
  );
}
