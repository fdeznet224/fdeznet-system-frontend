import { useEffect, useState } from 'react';
import { DevicePhoneMobileIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

import client from '@/api/axios';
import { apiErrorMessage } from '@/utils/apiError';

interface PagosCodi {
  activo: boolean;
  tiene_api_key: boolean;
  tiene_webhook_secreto: boolean;
  url_webhook: string | null;
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/**
 * Cobro CoDi con pey.mx: el agente de WhatsApp manda el cobro a la app del
 * banco del cliente y el pago se aplica solo cuando lo acepta.
 */
export default function PagosCodiConfig() {
  const [config, setConfig] = useState<PagosCodi | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [secreto, setSecreto] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    client.get<PagosCodi>('/configuracion/pagos-codi')
      .then(({ data }) => setConfig(data))
      .catch(() => toast.error('No se pudo cargar el cobro por CoDi'));
  }, []);

  const guardar = async (activo: boolean) => {
    setGuardando(true);
    try {
      const { data } = await client.put<PagosCodi>('/configuracion/pagos-codi', {
        activo,
        api_key: apiKey.trim() || null,
        webhook_secreto: secreto.trim() || null,
      });
      setConfig(data);
      setApiKey('');
      setSecreto('');
      toast.success(data.activo ? 'Cobro por CoDi activo' : 'Cobro por CoDi guardado (apagado)');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo guardar'));
    } finally {
      setGuardando(false);
    }
  };

  const copiar = async () => {
    if (!config?.url_webhook) return;
    try {
      await navigator.clipboard.writeText(config.url_webhook);
      toast.success('Dirección copiada');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  if (!config) return <p className="text-sm text-slate-500">Cargando cobro por CoDi…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
          <DevicePhoneMobileIcon className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-black text-slate-900 dark:text-white">Cobro por CoDi (pey.mx)</span>
          <span className="block text-xs text-slate-500">
            El agente de WhatsApp le manda el cobro a la app del banco del cliente; al aceptarlo, el pago se aplica solo y le llega su recibo.
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${config.activo ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-slate-500/10 text-slate-500'}`}>
          {config.activo ? 'Activo' : 'Apagado'}
        </span>
      </div>

      <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-500">
        <li>Regístrate en portal.mipey.mx y vincula la cuenta del banco donde recibes los pagos.</li>
        <li>En Desarrollador crea una API key y pégala abajo.</li>
        <li>En el engrane de esa API key crea el webhook con la dirección de abajo y pega aquí el secreto que te muestra.</li>
      </ol>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">API key
          <input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={config.tiene_api_key ? 'Guardada · escribe otra para cambiarla' : 'Pega la API key de pey'} className={inputClass} />
        </label>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Secreto del webhook
          <input type="password" autoComplete="off" value={secreto} onChange={(e) => setSecreto(e.target.value)}
            placeholder={config.tiene_webhook_secreto ? 'Guardado · escribe otro para cambiarlo' : 'Pega el secreto (whsec_…)'} className={inputClass} />
        </label>
      </div>

      <div className="text-xs font-bold text-slate-600 dark:text-slate-300">Dirección del webhook
        {config.url_webhook ? (
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-xl bg-slate-100 px-3.5 py-2.5 font-mono text-xs font-normal text-slate-700 dark:bg-slate-900 dark:text-slate-300">{config.url_webhook}</code>
            <button type="button" onClick={() => void copiar()} aria-label="Copiar dirección del webhook"
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <ClipboardDocumentIcon className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <span className="mt-1 block font-normal text-amber-600">Falta PUBLIC_URL en el servidor para saber la dirección pública.</span>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => void guardar(!config.activo)} disabled={guardando}
          className={`w-full rounded-xl px-4 py-3 text-sm font-black text-white shadow-sm transition disabled:opacity-50 sm:w-auto ${config.activo ? 'bg-slate-600 hover:bg-slate-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
          {guardando ? 'Guardando…' : config.activo ? 'Apagar cobro por CoDi' : 'Guardar y activar'}
        </button>
        {config.activo && (apiKey || secreto) && (
          <button type="button" onClick={() => void guardar(true)} disabled={guardando}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            Guardar llaves
          </button>
        )}
      </div>
    </div>
  );
}
