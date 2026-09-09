import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CloudArrowUpIcon,
  KeyIcon,
  PlusIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import client from '@/api/axios';

interface LicenseStatus {
  configurada: boolean;
  instalacion_id: string | null;
  servidor_central: string;
  estado: string;
  mensaje: string;
  version_actual: string;
  version_objetivo: string | null;
  actualizacion_disponible: boolean;
  notas_actualizacion: string | null;
  ultima_revision: string | null;
}

interface Installation {
  id: number;
  instalacion_id: string;
  nombre_isp: string;
  dominio: string | null;
  contacto_email: string | null;
  estado: string;
  plan: string;
  canal: string;
  version_actual: string | null;
  version_objetivo: string | null;
  notas_actualizacion: string | null;
  ultima_conexion: string | null;
  creada_en: string;
}

interface InstallationCreated extends Installation { licencia: string; }
interface Draft { estado: string; version_objetivo: string; notas_actualizacion: string; }

const card = 'rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';
const input = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export default function LicenciasVersiones() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [isCentral, setIsCentral] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newLicense, setNewLicense] = useState<InstallationCreated | null>(null);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get<LicenseStatus>('/configuracion/licencia');
      setStatus(data);
    } catch { toast.error('No se pudo consultar la licencia local'); }
    try {
      const { data } = await client.get<Installation[]>('/control/instalaciones');
      setInstallations(data);
      setIsCentral(true);
      setDrafts(Object.fromEntries(data.map((item) => [item.id, {
        estado: item.estado,
        version_objetivo: item.version_objetivo || '',
        notas_actualizacion: item.notas_actualizacion || '',
      }])));
    } catch { setIsCentral(false); }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const verify = async () => {
    setChecking(true);
    try {
      const { data } = await client.post<LicenseStatus>('/configuracion/licencia/verificar');
      setStatus(data);
      toast.success(data.mensaje);
    } catch { toast.error('No se pudo verificar la licencia'); }
    finally { setChecking(false); }
  };

  const saveInstallation = async (item: Installation) => {
    const draft = drafts[item.id];
    try {
      await client.patch(`/control/instalaciones/${item.id}`, {
        estado: draft.estado,
        version_objetivo: draft.version_objetivo || null,
        notas_actualizacion: draft.notas_actualizacion || null,
      });
      toast.success('Instalación actualizada');
      await load();
    } catch { toast.error('No se pudo actualizar la instalación'); }
  };

  return <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 sm:p-6">
    <div className="flex items-center gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
      <button onClick={() => navigate(-1)} className="rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"><ArrowLeftIcon className="h-6 w-6" /></button>
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl"><ServerStackIcon className="h-6 w-6 text-blue-500" /> Licencias y versiones</h1>
        <p className="text-xs text-slate-500 sm:text-sm">Controla esta VPS y las instalaciones vendidas.</p>
      </div>
      {isCentral && <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white sm:px-4 sm:text-sm"><PlusIcon className="h-5 w-5" /><span className="hidden sm:inline">Nueva instalación</span></button>}
    </div>

    {loading ? <div className="py-20 text-center text-sm font-bold text-slate-500">Cargando control de versiones…</div> : status && <section className={card}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${status.configurada ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}><KeyIcon className="h-7 w-7" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-slate-900 dark:text-white">Esta instalación</h2><StatusBadge value={status.estado} /></div>
          <p className="mt-1 text-sm text-slate-500">Versión instalada: <strong className="text-slate-800 dark:text-slate-200">v{status.version_actual}</strong></p>
          <p className="truncate text-xs text-slate-400">{status.instalacion_id || 'Aún no tiene ID de instalación'}</p>
          {status.actualizacion_disponible && <p className="mt-2 text-sm font-bold text-blue-600">Disponible v{status.version_objetivo}: {status.notas_actualizacion}</p>}
        </div>
        <button disabled={checking || !status.configurada} onClick={() => void verify()} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"><ArrowPathIcon className={`h-5 w-5 ${checking ? 'animate-spin' : ''}`} /> Verificar ahora</button>
      </div>
      {!status.configurada && <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Para activar esta VPS agrega en su archivo <code>.env</code> las variables <strong>FDEZNET_INSTALLATION_ID</strong> y <strong>FDEZNET_LICENSE_KEY</strong>.</div>}
    </section>}

    {isCentral && <section className="space-y-4">
      <div className="flex items-end justify-between"><div><h2 className="text-lg font-black text-slate-900 dark:text-white">Instalaciones registradas</h2><p className="text-xs text-slate-500">{installations.length} ISP registrados</p></div></div>
      {installations.length === 0 ? <div className={`${card} py-12 text-center text-sm text-slate-500`}>Crea la primera instalación para generar sus credenciales.</div> : <div className="grid gap-4 lg:grid-cols-2">
        {installations.map((item) => {
          const draft = drafts[item.id] || { estado: item.estado, version_objetivo: '', notas_actualizacion: '' };
          return <article key={item.id} className={card}>
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-base font-black text-slate-900 dark:text-white">{item.nombre_isp}</h3><p className="truncate text-xs text-slate-500">{item.dominio || item.instalacion_id}</p></div><StatusBadge value={item.estado} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950"><Metric label="Versión instalada" value={item.version_actual ? `v${item.version_actual}` : 'Sin reporte'} /><Metric label="Última conexión" value={formatDate(item.ultima_conexion)} /></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Estado</span><select className={input} value={draft.estado} onChange={(e) => setDrafts((all) => ({ ...all, [item.id]: { ...draft, estado: e.target.value } }))}><option value="activa">Activa</option><option value="suspendida">Suspendida</option><option value="revocada">Revocada</option></select></label>
              <label><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Enviar versión</span><input className={input} placeholder="2.4.0" value={draft.version_objetivo} onChange={(e) => setDrafts((all) => ({ ...all, [item.id]: { ...draft, version_objetivo: e.target.value } }))} /></label>
            </div>
            <label className="mt-3 block"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Nota de actualización</span><textarea rows={2} className={input} placeholder="Cambios incluidos…" value={draft.notas_actualizacion} onChange={(e) => setDrafts((all) => ({ ...all, [item.id]: { ...draft, notas_actualizacion: e.target.value } }))} /></label>
            <button onClick={() => void saveInstallation(item)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white dark:bg-blue-600"><CloudArrowUpIcon className="h-5 w-5" /> Guardar y enviar aviso</button>
          </article>;
        })}
      </div>}
    </section>}

    {showCreate && <CreateDialog onClose={() => setShowCreate(false)} onCreated={(created) => { setNewLicense(created); setShowCreate(false); void load(); }} />}
    {newLicense && <CredentialDialog installation={newLicense} onClose={() => setNewLicense(null)} />}
  </div>;
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (value: InstallationCreated) => void }) {
  const [form, setForm] = useState({ nombre_isp: '', dominio: '', contacto_email: '', plan: 'estandar' });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { const { data } = await client.post<InstallationCreated>('/control/instalaciones', form); onCreated(data); }
    catch { toast.error('No se pudo crear la instalación'); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center"><form onSubmit={(e) => void submit(e)} className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><h2 className="text-xl font-black text-slate-900 dark:text-white">Nueva instalación</h2><label className="block text-xs font-bold text-slate-500">Nombre del ISP<input required className={`${input} mt-1`} value={form.nombre_isp} onChange={(e) => setForm({ ...form, nombre_isp: e.target.value })} /></label><label className="block text-xs font-bold text-slate-500">Dominio<input className={`${input} mt-1`} placeholder="https://isp.com" value={form.dominio} onChange={(e) => setForm({ ...form, dominio: e.target.value })} /></label><label className="block text-xs font-bold text-slate-500">Correo de contacto<input type="email" className={`${input} mt-1`} value={form.contacto_email} onChange={(e) => setForm({ ...form, contacto_email: e.target.value })} /></label><div className="flex gap-3"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black text-slate-600 dark:border-slate-700">Cancelar</button><button disabled={saving} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white">{saving ? 'Creando…' : 'Crear licencia'}</button></div></form></div>;
}

function CredentialDialog({ installation, onClose }: { installation: InstallationCreated; onClose: () => void }) {
  const copy = async (value: string) => { await navigator.clipboard.writeText(value); toast.success('Copiado'); };
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm"><div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"><CheckCircleIcon className="h-12 w-12 text-emerald-500" /><h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">Licencia creada</h2><p className="mt-1 text-sm text-slate-500">Guarda estos datos ahora. La llave no volverá a mostrarse.</p><Credential label="FDEZNET_INSTALLATION_ID" value={installation.instalacion_id} onCopy={copy} /><Credential label="FDEZNET_LICENSE_KEY" value={installation.licencia} onCopy={copy} /><button onClick={onClose} className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white">Ya guardé las credenciales</button></div></div>;
}

function Credential({ label, value, onCopy }: { label: string; value: string; onCopy: (value: string) => Promise<void> }) { return <div className="mt-4"><span className="text-[10px] font-black text-slate-400">{label}</span><button onClick={() => void onCopy(value)} className="mt-1 flex w-full items-center gap-2 rounded-xl bg-slate-100 p-3 text-left dark:bg-slate-950"><code className="min-w-0 flex-1 break-all text-xs text-slate-700 dark:text-slate-200">{value}</code><ClipboardDocumentIcon className="h-5 w-5 shrink-0 text-blue-500" /></button></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">{value}</p></div>; }
function StatusBadge({ value }: { value: string }) { const color = value === 'activa' ? 'bg-emerald-500/10 text-emerald-600' : value === 'sin_configurar' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${color}`}>{value.replace('_', ' ')}</span>; }
function formatDate(value: string | null) { return value ? new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Nunca'; }
