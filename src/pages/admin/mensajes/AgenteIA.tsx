import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import client from '@/api/axios';
import AgenteSugerencias from './AgenteSugerencias';

export type ModoAgente = 'apagado' | 'sugerencia' | 'automatico';

export interface ConfiguracionAgente {
  modo: ModoAgente;
  url: string;
  modelo: string;
  tiene_clave: boolean;
  conocimiento: string;
  mes: { por_estado: Record<string, number>; costo_usd: number };
}

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Por revisar',
  aprobada: 'Aprobadas sin cambios',
  editada: 'Editadas',
  descartada: 'Descartadas',
  enviada: 'Enviadas solas',
  error: 'Con error',
};

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/** Conocimiento, consumo y sugerencias del agente. El modo se elige en Bot de WhatsApp. */
export default function AgenteIA() {
  const [config, setConfig] = useState<ConfiguracionAgente | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    const { data } = await client.get<ConfiguracionAgente>('/agente-ia/configuracion');
    setConfig(data);
  };

  useEffect(() => {
    cargar().catch(() => toast.error('No se pudo cargar el agente'));
  }, []);

  const guardar = async () => {
    if (!config) return;
    setGuardando(true);
    try {
      // Solo el conocimiento: el modo lo cambia el selector de arriba.
      await client.put('/agente-ia/configuracion', { conocimiento: config.conocimiento });
      toast.success('Conocimiento guardado');
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
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className={`rounded-xl p-3 text-xs font-bold ${config.tiene_clave ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'}`}>
          {config.tiene_clave
            ? `Conectado a ${config.modelo}. `
            : 'Falta la clave de IA; sin ella el agente no se puede encender. '}
          <Link to="/admin/configuracion/integraciones" className="underline">Configurar en Integraciones y claves</Link>
        </p>

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
            {guardando ? 'Guardando…' : 'Guardar conocimiento'}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Sugerencias por revisar</h2>
        <p className="text-xs text-slate-500">Solo en el modo «Agente de IA con aprobación». Incluye las de números que todavía no dan su contrato.</p>
        <AgenteSugerencias />
      </section>
    </div>
  );
}
