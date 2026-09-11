import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArchiveBoxIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  CircleStackIcon,
  CloudArrowDownIcon,
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import client from '@/api/axios';

interface StoragePolicy {
  limpieza_automatica: boolean;
  hora_limpieza: string;
  comprobantes_rechazados_dias: number;
  comprobantes_aprobados_dias: number;
  recibos_pdf_dias: number;
  archivos_whatsapp_dias: number;
  respaldos_dias: number;
  cierre_mensual_automatico: boolean;
  dia_cierre: number;
  ultima_limpieza?: string | null;
  ultimo_cierre?: string | null;
}

interface StorageDashboard {
  disco: { total_bytes: number; usado_bytes: number; libre_bytes: number; porcentaje_usado: number };
  categorias: Array<{ clave: string; nombre: string; archivos: number; bytes: number; accesible: boolean; protegido: boolean }>;
  tablas_principales: Array<{ nombre: string; bytes: number }>;
  comprobantes: { pendientes: number; aprobados: number; rechazados: number; archivados: number; imagenes_eliminadas: number };
  politica: StoragePolicy;
  cierres: Array<{ id: number; periodo: string; tipo: string; aprobados: number; rechazados: number; pendientes: number; bytes_comprobantes: number; bytes_liberados: number; cerrado_en: string }>;
}

const formatBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[index]}`;
};

const previousMonth = () => {
  const date = new Date();
  date.setDate(0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const errorMessage = (error: unknown) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown } } }).response;
    const detail = response?.data?.detail;
    if (typeof detail === 'string') return detail;
  }
  return 'No se pudo completar la operación';
};

export default function StorageManagement() {
  const navigate = useNavigate();
  const [data, setData] = useState<StorageDashboard | null>(null);
  const [policy, setPolicy] = useState<StoragePolicy | null>(null);
  const [period, setPeriod] = useState(previousMonth());
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await client.get<StorageDashboard>('/configuracion/almacenamiento');
      setData(response.data);
      setPolicy(response.data.politica);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const largest = useMemo(() => Math.max(...(data?.categorias.map((item) => item.bytes) || [1]), 1), [data]);

  const savePolicy = async () => {
    if (!policy) return;
    setBusy('save');
    try {
      await client.put('/configuracion/almacenamiento/politica', policy);
      toast.success('Política de almacenamiento guardada');
      await load();
    } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(''); }
  };

  const closeMonth = async () => {
    if (!window.confirm(`¿Cerrar y archivar el periodo ${period}? Los pendientes no se eliminarán.`)) return;
    setBusy('close');
    try {
      const response = await client.post(`/configuracion/almacenamiento/cierres/${period}`);
      toast.success(`Periodo cerrado: ${response.data.aprobado || 0} aprobados y ${response.data.rechazado || 0} rechazados`);
      await load();
    } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(''); }
  };

  const cleanNow = async () => {
    if (!window.confirm('¿Ejecutar ahora la política de limpieza? Se conservarán los registros antifraude y los pendientes.')) return;
    setBusy('clean');
    try {
      const response = await client.post('/configuracion/almacenamiento/limpiar');
      toast.success(`Limpieza terminada: ${formatBytes(response.data.bytes_liberados)} liberados`);
      await load();
    } catch (error) { toast.error(errorMessage(error)); } finally { setBusy(''); }
  };

  if (!data || !policy) return <div className="flex h-80 items-center justify-center"><ArrowPathIcon className="h-9 w-9 animate-spin text-cyan-500" /></div>;

  const policyNumber = (key: keyof StoragePolicy, min: number, max: number) => (
    <input type="number" min={min} max={max} value={Number(policy[key])} onChange={(event) => setPolicy({ ...policy, [key]: Number(event.target.value) })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold text-slate-900 outline-none focus:border-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-24 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><ArrowLeftIcon className="h-5 w-5" /></button>
          <div><h1 className="text-2xl font-black text-slate-900 dark:text-white">Almacenamiento y cierres</h1><p className="text-sm text-slate-500">Control de espacio, archivo mensual y limpieza segura.</p></div>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-700"><ArrowPathIcon className="h-4 w-4" /> Actualizar</button>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Disco utilizado', `${data.disco.porcentaje_usado}%`, ServerStackIcon, 'text-cyan-500'],
          ['Espacio libre', formatBytes(data.disco.libre_bytes), CircleStackIcon, 'text-emerald-500'],
          ['Pendientes protegidos', String(data.comprobantes.pendientes), ShieldCheckIcon, 'text-amber-500'],
          ['Comprobantes archivados', String(data.comprobantes.archivados), ArchiveBoxIcon, 'text-violet-500'],
        ].map(([label, value, Icon, color]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><Icon className={`mb-3 h-7 w-7 ${color}`} /><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{value}</p></div>)}
      </section>

      <section className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <div><h2 className="font-black text-slate-900 dark:text-white">¿Dónde se usa el espacio?</h2><p className="text-xs text-slate-500">Ordenado de mayor a menor. Las evidencias y datos protegidos no se eliminan automáticamente.</p></div>
          {data.categorias.map((item) => <div key={item.clave}>
            <div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-bold text-slate-700 dark:text-slate-200">{item.nombre}{item.protegido && <span className="ml-2 text-[10px] text-emerald-500">PROTEGIDO</span>}</span><span className="font-mono text-slate-500">{formatBytes(item.bytes)} · {item.archivos}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={{ width: `${Math.max((item.bytes / largest) * 100, item.bytes ? 2 : 0)}%` }} /></div>
          </div>)}
          {data.tablas_principales.length > 0 && <details className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">Desglose de la base de datos</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{data.tablas_principales.map((table) => <div key={table.nombre} className="flex justify-between gap-3 text-xs"><span className="truncate font-mono text-slate-600 dark:text-slate-300">{table.nombre}</span><span className="shrink-0 font-bold">{formatBytes(table.bytes)}</span></div>)}</div></details>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h2 className="font-black text-slate-900 dark:text-white">Cierre manual del mes</h2><p className="mt-1 text-xs leading-5 text-slate-500">Archiva aprobados y rechazados. Los pendientes permanecen activos y los folios nunca se borran.</p>
          <input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-bold dark:border-slate-700 dark:bg-slate-950" />
          <button disabled={busy !== ''} onClick={closeMonth} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-black text-white disabled:opacity-50"><ArchiveBoxIcon className="h-5 w-5" />{busy === 'close' ? 'Cerrando…' : 'Cerrar y archivar'}</button>
          <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><ExclamationTriangleIcon className="mr-2 inline h-4 w-4" />Cerrar no borra archivos inmediatamente; los hace elegibles cuando cumplen la retención configurada.</div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-slate-900 dark:text-white">Política de limpieza</h2><p className="text-xs text-slate-500">Los días se cuentan desde la recepción o generación del archivo.</p></div><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={policy.limpieza_automatica} onChange={(event) => setPolicy({ ...policy, limpieza_automatica: event.target.checked })} className="h-5 w-5 rounded" /> Limpieza automática</label></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-500">Hora diaria<input type="time" value={policy.hora_limpieza} onChange={(event) => setPolicy({ ...policy, hora_limpieza: event.target.value })} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold dark:border-slate-700 dark:bg-slate-950" /></label>
          <label className="text-xs font-bold text-slate-500">Rechazados (días){policyNumber('comprobantes_rechazados_dias', 30, 3650)}</label>
          <label className="text-xs font-bold text-slate-500">Aprobados (días){policyNumber('comprobantes_aprobados_dias', 90, 3650)}</label>
          <label className="text-xs font-bold text-slate-500">Recibos PDF (días){policyNumber('recibos_pdf_dias', 30, 3650)}</label>
          <label className="text-xs font-bold text-slate-500">Otros archivos WhatsApp (días){policyNumber('archivos_whatsapp_dias', 30, 3650)}</label>
          <label className="text-xs font-bold text-slate-500">Respaldos (días){policyNumber('respaldos_dias', 3, 365)}</label>
          <label className="text-xs font-bold text-slate-500">Día del cierre mensual{policyNumber('dia_cierre', 1, 28)}</label>
          <label className="flex items-center gap-2 self-end rounded-xl bg-slate-50 p-3 text-sm font-bold dark:bg-slate-950"><input type="checkbox" checked={policy.cierre_mensual_automatico} onChange={(event) => setPolicy({ ...policy, cierre_mensual_automatico: event.target.checked })} className="h-5 w-5 rounded" /> Cierre automático</label>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3"><button disabled={busy !== ''} onClick={cleanNow} className="flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-black text-rose-600 disabled:opacity-50"><TrashIcon className="h-5 w-5" />{busy === 'clean' ? 'Limpiando…' : 'Limpiar ahora'}</button><button disabled={busy !== ''} onClick={savePolicy} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"><DocumentCheckIcon className="h-5 w-5" />{busy === 'save' ? 'Guardando…' : 'Guardar política'}</button></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-black text-slate-900 dark:text-white">Historial de cierres</h2>{data.cierres.length === 0 ? <p className="mt-4 text-sm text-slate-500">Todavía no hay meses cerrados.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Periodo</th><th>Tipo</th><th>Aprobados</th><th>Rechazados</th><th>Pendientes</th><th>Tamaño</th></tr></thead><tbody>{data.cierres.map((item) => <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800"><td className="py-3 font-black">{item.periodo}</td><td className="capitalize">{item.tipo}</td><td>{item.aprobados}</td><td>{item.rechazados}</td><td className={item.pendientes ? 'font-bold text-amber-500' : ''}>{item.pendientes}</td><td>{formatBytes(item.bytes_comprobantes)}</td></tr>)}</tbody></table></div>}</section>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"><CloudArrowDownIcon className="h-6 w-6 shrink-0" /><p><strong>Protección:</strong> la limpieza nunca elimina pagos, facturas, folios bancarios, hashes antifraude, pendientes, evidencia de órdenes ni respaldos recientes. Solo retira archivos que ya cumplieron su periodo de conservación.</p></div>
    </div>
  );
}
