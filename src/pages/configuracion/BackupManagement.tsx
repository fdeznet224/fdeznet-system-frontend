import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArchiveBoxArrowDownIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  CircleStackIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

import client from '@/api/axios';

interface BackupPolicy {
  activo: boolean;
  frecuencia_dias: number;
  retencion_dias: number;
  incluir_configuracion: boolean;
  incluir_archivos_estaticos: boolean;
  incluir_evidencias_ordenes: boolean;
  incluir_sesion_whatsapp: boolean;
  incluir_archivos_whatsapp: boolean;
  incluir_wireguard: boolean;
}

interface BackupItem {
  archivo: string;
  creado_en: string;
  bytes: number;
  checksum_disponible: boolean;
}

interface BackupDashboard {
  politica: BackupPolicy;
  respaldos: BackupItem[];
  proximo_respaldo: string | null;
  estado: { estado?: string; mensaje?: string; fecha?: string } | null;
}

const formatBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString('es-MX') : 'Pendiente';

const errorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } })
      .response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return 'No se pudo completar la operación';
};

export default function BackupManagement() {
  const navigate = useNavigate();
  const [data, setData] = useState<BackupDashboard | null>(null);
  const [policy, setPolicy] = useState<BackupPolicy | null>(null);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await client.get<BackupDashboard>('/configuracion/respaldos');
      setData(response.data);
      setPolicy(response.data.politica);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const savePolicy = async () => {
    if (!policy) return;
    setBusy('policy');
    try {
      await client.put('/configuracion/respaldos/politica', policy);
      toast.success('Programación de respaldos guardada');
      await load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const createBackup = async () => {
    setBusy('create');
    try {
      await client.post('/configuracion/respaldos/crear');
      toast.success('Respaldo iniciado en segundo plano');
      window.setTimeout(() => void load(), 5000);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const verifyBackup = async (item: BackupItem) => {
    setBusy(`verify:${item.archivo}`);
    try {
      await client.post(`/configuracion/respaldos/${encodeURIComponent(item.archivo)}/verificar`);
      toast.success('Verificación iniciada');
      window.setTimeout(() => void load(), 5000);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const restoreBackup = async (item: BackupItem) => {
    const phrase = `RESTAURAR ${item.archivo}`;
    const confirmation = window.prompt(
      `El sistema volverá al estado de ${formatDate(item.creado_en)} y se reiniciará. Los cambios posteriores podrían perderse. Escribe exactamente:\n\n${phrase}`,
    );
    if (confirmation === null) return;
    if (confirmation !== phrase) {
      toast.error('La frase de confirmación no coincide');
      return;
    }
    setBusy(`restore:${item.archivo}`);
    try {
      await client.post(
        `/configuracion/respaldos/${encodeURIComponent(item.archivo)}/restaurar`,
        { confirmacion: confirmation },
      );
      toast.success('Restauración iniciada. El sistema se desconectará temporalmente.', { duration: 8000 });
    } catch (error) {
      toast.error(errorMessage(error));
      setBusy('');
    }
  };

  if (!data || !policy) {
    return <div className="flex h-80 items-center justify-center"><ArrowPathIcon className="h-9 w-9 animate-spin text-violet-500" /></div>;
  }

  const inclusions: Array<[keyof BackupPolicy, string]> = [
    ['incluir_configuracion', 'Configuración del sistema'],
    ['incluir_archivos_estaticos', 'Marca, recibos y archivos estáticos'],
    ['incluir_evidencias_ordenes', 'Evidencias de órdenes'],
    ['incluir_sesion_whatsapp', 'Sesión de WhatsApp'],
    ['incluir_archivos_whatsapp', 'Archivos recibidos por WhatsApp'],
    ['incluir_wireguard', 'Configuración WireGuard'],
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><ArrowLeftIcon className="h-5 w-5" /></button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Respaldos y recuperación</h1>
            <p className="text-sm text-slate-500">Programa, verifica y restaura respaldos cifrados.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold dark:border-slate-700"><ArrowPathIcon className="h-4 w-4" /> Actualizar</button>
          <button type="button" disabled={busy !== ''} onClick={() => void createBackup()} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><CircleStackIcon className="h-5 w-5" /> {busy === 'create' ? 'Iniciando…' : 'Respaldar ahora'}</button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <InfoCard icon={ArchiveBoxArrowDownIcon} label="Respaldos disponibles" value={String(data.respaldos.length)} />
        <InfoCard icon={ClockIcon} label="Próximo respaldo" value={policy.activo ? formatDate(data.proximo_respaldo) : 'Desactivado'} />
        <InfoCard icon={CheckBadgeIcon} label="Último estado" value={data.estado?.mensaje || 'Sin actividad'} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-black text-slate-900 dark:text-white">Programación</h2><p className="text-xs text-slate-500">La base de datos siempre se incluye. La revisión diaria se realiza alrededor de las 3:20 a. m.</p></div>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={policy.activo} onChange={(event) => setPolicy({ ...policy, activo: event.target.checked })} className="h-5 w-5 rounded" /> Respaldos automáticos</label>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-500">Respaldar cada cuántos días<input type="number" min={1} max={30} value={policy.frecuencia_dias} onChange={(event) => setPolicy({ ...policy, frecuencia_dias: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
          <label className="text-xs font-bold text-slate-500">Conservar respaldos durante (días)<input type="number" min={3} max={365} value={policy.retencion_dias} onChange={(event) => setPolicy({ ...policy, retencion_dias: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">✓ Base de datos completa (obligatoria)</div>
          {inclusions.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-bold dark:bg-slate-950"><input type="checkbox" checked={Boolean(policy[key])} onChange={(event) => setPolicy({ ...policy, [key]: event.target.checked })} className="h-5 w-5 rounded" /> {label}</label>
          ))}
        </div>
        <div className="mt-5 flex justify-end"><button type="button" disabled={busy !== ''} onClick={() => void savePolicy()} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy === 'policy' ? 'Guardando…' : 'Guardar programación'}</button></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-black text-slate-900 dark:text-white">Puntos de recuperación</h2>
        <p className="mt-1 text-xs text-slate-500">Puedes verificar un respaldo sin modificar datos o restaurar el sistema a ese momento.</p>
        {data.respaldos.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">Todavía no hay respaldos disponibles.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Fecha</th><th>Archivo</th><th>Tamaño</th><th>Integridad</th><th className="text-right">Acciones</th></tr></thead>
              <tbody>{data.respaldos.map((item) => (
                <tr key={item.archivo} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-3 font-bold">{formatDate(item.creado_en)}</td>
                  <td className="font-mono text-xs">{item.archivo}</td>
                  <td>{formatBytes(item.bytes)}</td>
                  <td className={item.checksum_disponible ? 'font-bold text-emerald-600' : 'font-bold text-amber-600'}>{item.checksum_disponible ? 'Checksum disponible' : 'Sin checksum'}</td>
                  <td><div className="flex justify-end gap-2"><button type="button" disabled={busy !== ''} onClick={() => void verifyBackup(item)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black dark:border-slate-700">{busy === `verify:${item.archivo}` ? 'Iniciando…' : 'Verificar'}</button><button type="button" disabled={busy !== '' || !item.checksum_disponible} onClick={() => void restoreBackup(item)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-black text-rose-600 disabled:opacity-40">{busy === `restore:${item.archivo}` ? 'Restaurando…' : 'Restaurar'}</button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><ExclamationTriangleIcon className="h-6 w-6 shrink-0" /><p><strong>Importante:</strong> restaurar reemplaza la base de datos y el código por el estado elegido. Antes de hacerlo, el sistema crea automáticamente un respaldo completo del estado actual.</p></div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof ClockIcon; label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><Icon className="mb-3 h-7 w-7 text-violet-500" /><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-black text-slate-900 dark:text-white">{value}</p></div>;
}
