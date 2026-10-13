import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import type { ClientService } from '@/types/services';
import { apiErrorMessage } from '@/utils/apiError';

/** IP libres de la red del servicio, ya sin las que el MikroTik usa por fuera del sistema. */
interface UsoIps {
  red: string;
  cidr: string;
  disponibles: string[];
  fuera_del_sistema: { ip: string; origen: string }[];
  mikrotik_verificado: boolean;
  error: string | null;
}

interface Props {
  service: ClientService;
  onClose: () => void;
  onChanged: () => void;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export default function CambiarIpModal({ service, onClose, onChanged }: Props) {
  const [uso, setUso] = useState<UsoIps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ip, setIp] = useState('');
  const [guardando, setGuardando] = useState(false);
  const instalado = ['activo', 'suspendido'].includes(service.estado);

  useEffect(() => {
    let vivo = true;
    if (!service.red_id) {
      setError('Este servicio no tiene una red de IP asignada.');
      return;
    }
    client
      .get<UsoIps>(`/network/redes/${service.red_id}/uso-ips`, { params: { servicio_id: service.id } })
      .then(({ data }) => {
        if (!vivo) return;
        setUso(data);
        setIp(data.disponibles[0] ?? '');
      })
      .catch((e) => vivo && setError(apiErrorMessage(e, 'No se pudieron leer las IP de la red')));
    return () => { vivo = false; };
  }, [service.id, service.red_id]);

  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ip) return;
    setGuardando(true);
    try {
      const { data } = await client.put<{ mensaje: string }>(`/servicios/${service.id}/ip`, { ip });
      toast.success(data.mensaje);
      onChanged();
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'No se pudo cambiar la IP'));
    } finally {
      setGuardando(false);
    }
  };

  // Con el servicio instalado hace falta el MikroTik para aplicar el cambio.
  const bloqueado = instalado && uso != null && !uso.mikrotik_verificado;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cambiar IP del servicio"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f1115]"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Cambiar IP de {service.alias}</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              IP actual: <span className="font-mono font-bold">{service.ip_asignada || 'Sin asignar'}</span>
              {uso && <> · Red {uso.red} ({uso.cidr})</>}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">{error}</p>}
        {!error && !uso && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-slate-500">
            <ArrowPathIcon className="h-5 w-5 animate-spin" /> Revisando la red y el MikroTik…
          </div>
        )}

        {uso && (
          <form onSubmit={guardar} className="flex min-h-0 flex-col gap-4">
            <label className="block text-xs font-black text-slate-500">
              IP libre ({uso.disponibles.length})
              <select value={ip} onChange={(e) => setIp(e.target.value)} className={`${inputClass} mt-2`} required>
                {uso.disponibles.length === 0 && <option value="">No hay IP libres</option>}
                {uso.disponibles.map((libre) => <option key={libre} value={libre}>{libre}</option>)}
              </select>
            </label>

            {uso.mikrotik_verificado ? (
              uso.fuera_del_sistema.length > 0 && (
                <div className="min-h-0 overflow-y-auto rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  <p className="font-black">
                    {uso.fuera_del_sistema.length} IP en uso en el MikroTik sin cliente en el sistema (no se ofrecen):
                  </p>
                  <ul className="mt-2 space-y-1">
                    {uso.fuera_del_sistema.map((f) => (
                      <li key={f.ip}><span className="font-mono font-bold">{f.ip}</span> — {f.origen}</li>
                    ))}
                  </ul>
                </div>
              )
            ) : (
              <p className="flex gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
                <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
                {uso.error}. {instalado ? 'Sin el MikroTik no se puede cambiar la IP.' : 'No se pudo revisar si alguna IP está en uso fuera del sistema.'}
              </p>
            )}

            {instalado && (
              <p className="rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                Se cambia en el MikroTik y se corta la sesión PPPoE para que la ONU tome la IP nueva
                (el cliente se queda sin internet unos segundos).
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold dark:bg-slate-800">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando || !ip || bloqueado}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {guardando ? 'Aplicando…' : 'Cambiar IP'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
