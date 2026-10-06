import { useEffect, useState } from 'react';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';

interface PagosCaptura {
  cuentas_destino_permitidas: string;
  ventana_dias: number;
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/**
 * Cómo valida el agente las capturas de transferencia. Lo que no puede
 * validar solo pasa a un asesor, que lo registra en la Terminal de Cobro.
 */
export default function PagosCapturaConfig() {
  const [config, setConfig] = useState<PagosCaptura | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    client.get<PagosCaptura>('/configuracion/pagos-captura')
      .then(({ data }) => setConfig(data))
      .catch(() => toast.error('No se pudo cargar la configuración de pagos'));
  }, []);

  const guardar = async () => {
    if (!config) return;
    setGuardando(true);
    try {
      const { data } = await client.put<PagosCaptura>('/configuracion/pagos-captura', {
        cuentas_destino_permitidas: config.cuentas_destino_permitidas.trim(),
        ventana_dias: Number(config.ventana_dias || 3),
      });
      setConfig(data);
      toast.success('Configuración de pagos guardada');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo guardar'));
    } finally {
      setGuardando(false);
    }
  };

  if (!config) return <p className="text-sm text-slate-500">Cargando pagos por captura…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <BanknotesIcon className="h-6 w-6" />
        </span>
        <span>
          <span className="block font-black text-slate-900 dark:text-white">Pagos por captura</span>
          <span className="block text-xs text-slate-500">
            El agente aplica solo los pagos que puede validar con la captura. Los demás los pasa a un asesor para registrarlos en la Terminal de Cobro.
          </span>
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Terminaciones de las cuentas que reciben pagos
          <input
            type="text"
            inputMode="numeric"
            value={config.cuentas_destino_permitidas}
            onChange={(event) => setConfig({ ...config, cuentas_destino_permitidas: event.target.value })}
            placeholder="Ej. 6342,5265"
            className={inputClass}
          />
          <span className="mt-1 block font-normal text-slate-400">Un comprobante de transferencia a otra cuenta no se acepta.</span>
        </label>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Antigüedad máxima de la transferencia (días)
          <input
            type="number"
            min="1"
            max="30"
            value={config.ventana_dias}
            onChange={(event) => setConfig({ ...config, ventana_dias: Number(event.target.value) })}
            className={inputClass}
          />
          <span className="mt-1 block font-normal text-slate-400">Una captura más vieja la registra un asesor.</span>
        </label>
      </div>
      <button
        type="button"
        onClick={() => void guardar()}
        disabled={guardando}
        className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
      >
        {guardando ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}
