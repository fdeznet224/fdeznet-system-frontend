/** Respaldo diario en el Google Drive del propio ISP (lo hace el panel de la nube). */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowPathIcon, CloudArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import client from '@/api/axios';
import { BOTON_ACCION_SECUNDARIO } from '@/components/ui/estilo';

interface EstadoDrive {
  disponible: boolean;
  conectado: boolean;
  correo: string | null;
  carpeta: string;
  dias: number;
  hora: string | null;
  en_curso: boolean;
  ultimo: { fecha: string; tamano: number | null; subido: boolean; error: string | null } | null;
}

const errorMessage = (error: unknown) => {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'No se pudo completar la operación';
};

const fecha = (iso: string) => new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });

export default function RespaldoDrive() {
  const [estado, setEstado] = useState<EstadoDrive | null>(null);
  const [noDisponible, setNoDisponible] = useState(false);
  const [correo, setCorreo] = useState('');
  const [busy, setBusy] = useState('');
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    try {
      const response = await client.get<EstadoDrive>('/configuracion/respaldo-drive');
      setEstado(response.data);
    } catch (error) {
      // Fuera de la nube la API contesta 404: la sección no aplica.
      if ((error as { response?: { status?: number } })?.response?.status === 404) setNoDisponible(true);
      else toast.error(errorMessage(error));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Al volver de Google el panel deja ?drive=ok o el motivo del fallo.
  useEffect(() => {
    const resultado = params.get('drive');
    if (!resultado) return;
    if (resultado === 'ok') toast.success('Google Drive conectado. Ya se está subiendo el primer respaldo.');
    else toast.error(resultado, { duration: 8000 });
    params.delete('drive');
    setParams(params, { replace: true });
  }, [params, setParams]);

  // Mientras se respalda, revisa cada pocos segundos hasta que termine.
  useEffect(() => {
    if (!estado?.en_curso) return;
    const id = window.setTimeout(() => void load(), 4000);
    return () => window.clearTimeout(id);
  }, [estado, load]);

  const conectar = async () => {
    setBusy('conectar');
    try {
      const response = await client.post<{ url: string }>('/configuracion/respaldo-drive/conectar', { correo: correo.trim() });
      window.location.href = response.data.url;
    } catch (error) { toast.error(errorMessage(error)); setBusy(''); }
  };

  const desconectar = async () => {
    if (!window.confirm('¿Dejar de respaldar en este Google Drive? Los respaldos que ya están en tu Drive se quedan ahí.')) return;
    setBusy('desconectar');
    try {
      const response = await client.post<EstadoDrive>('/configuracion/respaldo-drive/desconectar');
      setEstado(response.data);
      toast.success('Google Drive desconectado');
    } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(''); }
  };

  const respaldar = async () => {
    setBusy('respaldar');
    try {
      const response = await client.post<EstadoDrive>('/configuracion/respaldo-drive/respaldar');
      setEstado(response.data);
      toast.success('Respaldando; tarda menos de un minuto');
    } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(''); }
  };

  if (noDisponible || !estado) return null;

  const ultimo = estado.ultimo;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <CloudArrowUpIcon className="h-7 w-7 shrink-0 text-blue-500" />
          <div>
            <h2 className="font-black text-slate-900 dark:text-white">Respaldo en Google Drive</h2>
            <p className="text-xs text-slate-500">
              Cada día{estado.hora ? ` a las ${estado.hora}` : ''} se guarda una copia cifrada de tu sistema (clientes, pagos, VPN y WhatsApp)
              en la carpeta «{estado.carpeta}» de tu Drive. Se conservan {estado.dias} días.
            </p>
          </div>
        </div>
        {estado.conectado && (
          <div className="flex gap-2">
            <button type="button" disabled={!!busy || estado.en_curso} onClick={() => void respaldar()} className={BOTON_ACCION_SECUNDARIO}>
              <ArrowPathIcon className={`h-4 w-4 ${estado.en_curso ? 'animate-spin' : ''}`} /> {estado.en_curso ? 'Respaldando…' : 'Respaldar ahora'}
            </button>
            <button type="button" disabled={!!busy} onClick={() => void desconectar()} className={BOTON_ACCION_SECUNDARIO}>Desconectar</button>
          </div>
        )}
      </div>

      {!estado.disponible ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-950">Pronto podrás conectar tu Google Drive aquí.</p>
      ) : estado.conectado ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Cuenta</p>
            <p className="truncate font-bold text-slate-900 dark:text-white">{estado.correo}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Último respaldo</p>
            {!ultimo ? <p className="font-bold text-slate-500">Todavía ninguno</p>
              : ultimo.subido ? <p className="font-bold text-emerald-600">{fecha(ultimo.fecha)} · en tu Drive</p>
              : <p className="flex items-start gap-1.5 font-bold text-rose-600"><ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  {fecha(ultimo.fecha)} · no se subió{ultimo.error ? `: ${ultimo.error}` : ''}</p>}
          </div>
          {ultimo && !ultimo.subido && (
            <p className="text-xs text-slate-500 sm:col-span-2">Si quitaste el permiso en tu cuenta de Google, desconecta y vuelve a conectar.</p>
          )}
        </div>
      ) : (
        <>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email" value={correo} onChange={(event) => setCorreo(event.target.value)} placeholder="Correo de Gmail (opcional)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-xs"
          />
          <button type="button" disabled={!!busy} onClick={() => void conectar()}
            className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {busy === 'conectar' ? 'Abriendo Google…' : 'Conectar Google Drive'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          En la pantalla de Google marca la casilla <b>«Ver, editar, crear y borrar solo los archivos específicos de Google Drive»</b>;
          sin ella no se puede guardar el respaldo. El sistema no ve ningún otro archivo de tu Drive.
        </p>
        </>
      )}
    </section>
  );
}
