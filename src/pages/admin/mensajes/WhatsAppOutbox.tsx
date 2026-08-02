import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  QueueListIcon,
  SignalIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

import client from '@/api/axios';

type OutboxStatus =
  | 'pendiente'
  | 'procesando'
  | 'enviado'
  | 'entregado'
  | 'leido'
  | 'fallido'
  | 'incierto';

interface OutboxMessage {
  id: number;
  cliente_id?: number | null;
  cliente?: { id: number; nombre: string } | null;
  telefono: string;
  mensaje: string;
  tipo_mensaje?: string | null;
  tipo_evento?: string | null;
  lote_id?: string | null;
  estado_envio: OutboxStatus;
  ack?: number | null;
  wa_id?: string | null;
  intentos: number;
  max_intentos: number;
  reintentos_manuales: number;
  ultimo_error?: string | null;
  fecha: string;
  ultima_tentativa_en?: string | null;
  proximo_intento_en?: string | null;
  enviado_en?: string | null;
  entregado_en?: string | null;
  leido_en?: string | null;
  ruta_archivo?: string | null;
  creado_por?: { id: number; nombre?: string | null } | null;
  ultimo_reintento_por?: { id: number; nombre?: string | null } | null;
}

interface OutboxResponse {
  items: OutboxMessage[];
  total: number;
  pagina: number;
  limite: number;
  resumen: Record<OutboxStatus | 'total', number>;
  cola_memoria: number;
}

interface WhatsAppStatus {
  connected: boolean;
  active: boolean;
}

interface CatalogOption { id: number; nombre: string }

const statuses: Array<{ value: '' | OutboxStatus; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'fallido', label: 'Fallidos' },
  { value: 'incierto', label: 'Inciertos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'procesando', label: 'Procesando' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'entregado', label: 'Entregados' },
  { value: 'leido', label: 'Leídos' },
];

const retryable = new Set<OutboxStatus>(['fallido', 'incierto']);

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail || fallback;
  }
  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function statusStyles(status: OutboxStatus) {
  const styles: Record<OutboxStatus, string> = {
    pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    procesando: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    enviado: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    entregado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    leido: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
    fallido: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    incierto: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  };
  return styles[status];
}

export default function WhatsAppOutbox() {
  const navigate = useNavigate();
  const [data, setData] = useState<OutboxResponse | null>(null);
  const [connection, setConnection] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | OutboxStatus>('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignTarget, setCampaignTarget] = useState<'zona' | 'router'>('zona');
  const [campaignTargetId, setCampaignTargetId] = useState('');
  const [campaignInterval, setCampaignInterval] = useState('60');
  const [zones, setZones] = useState<CatalogOption[]>([]);
  const [routers, setRouters] = useState<CatalogOption[]>([]);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const limit = 30;

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        pagina: String(page),
        limite: String(limit),
      });
      if (status) params.set('estado', status);
      if (appliedSearch) params.set('busqueda', appliedSearch);
      if (from) params.set('desde', from);
      if (to) params.set('hasta', to);

      const [outboxResponse, statusResponse] = await Promise.all([
        client.get<OutboxResponse>(`/whatsapp/salidas?${params.toString()}`),
        client.get<WhatsAppStatus>('/whatsapp/status').catch(() => ({ data: { connected: false, active: false } })),
      ]);
      setData(outboxResponse.data);
      setConnection(statusResponse.data);
    } catch (error) {
      if (!silent) toast.error(errorMessage(error, 'No se pudo cargar la bandeja'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [appliedSearch, from, page, status, to]);

  useEffect(() => {
    void fetchData();
    const interval = window.setInterval(() => void fetchData(true), 10000);
    return () => window.clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    void Promise.all([
      client.get<CatalogOption[]>('/zonas/'),
      client.get<CatalogOption[]>('/network/routers/'),
    ]).then(([zonesResponse, routersResponse]) => {
      setZones(zonesResponse.data);
      setRouters(routersResponse.data);
    }).catch(() => undefined);
  }, []);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  const retryOne = async (message: OutboxMessage) => {
    setRetryingId(message.id);
    try {
      await client.post(`/whatsapp/salidas/${message.id}/reintentar`);
      toast.success(`Mensaje #${message.id} reenviado a la cola`);
      await fetchData(true);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo reintentar el mensaje'));
    } finally {
      setRetryingId(null);
    }
  };

  const retryAll = async () => {
    const visibleIds = data?.items.filter((item) => retryable.has(item.estado_envio)).map((item) => item.id) || [];
    if (visibleIds.length === 0) {
      toast.error('No hay mensajes fallidos o inciertos en esta página');
      return;
    }
    if (!window.confirm(`¿Reencolar ${visibleIds.length} mensaje(s) de esta página?`)) return;
    setRetryingAll(true);
    try {
      const response = await client.post<{ total: number }>('/whatsapp/salidas/reintentar-fallidos', {
        ids: visibleIds,
        limite: visibleIds.length,
      });
      toast.success(`${response.data.total} mensaje(s) enviados nuevamente a la cola`);
      await fetchData(true);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudieron reintentar los mensajes'));
    } finally {
      setRetryingAll(false);
    }
  };

  const deleteOne = async (message: OutboxMessage) => {
    if (!window.confirm(`¿Borrar el mensaje #${message.id} del historial?`)) return;
    setDeletingId(message.id);
    try {
      await client.delete(`/whatsapp/salidas/${message.id}`);
      toast.success('Mensaje retirado del historial');
      await fetchData(true);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo borrar el mensaje'));
    } finally {
      setDeletingId(null);
    }
  };

  const sendCampaign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!campaignTargetId || !campaignMessage.trim()) {
      toast.error('Selecciona el destino y escribe el mensaje');
      return;
    }
    setCampaignLoading(true);
    try {
      const payload = {
        mensaje: campaignMessage.trim(),
        zona_id: campaignTarget === 'zona' ? Number(campaignTargetId) : null,
        router_id: campaignTarget === 'router' ? Number(campaignTargetId) : null,
        intervalo_segundos: Number(campaignInterval),
      };
      const response = await client.post<{ total_mensajes: number; intervalo_segundos: number }>('/whatsapp/enviar-campana', payload);
      toast.success(`${response.data.total_mensajes} mensajes encolados; uno cada ${response.data.intervalo_segundos} s`);
      setCampaignMessage('');
      setCampaignTargetId('');
      setCampaignOpen(false);
      await fetchData(true);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo crear la campaña'));
    } finally {
      setCampaignLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / limit));
  const failedVisible = useMemo(
    () => data?.items.filter((item) => retryable.has(item.estado_envio)).length || 0,
    [data],
  );

  return (
    <div className="min-h-full space-y-5 bg-slate-50 p-4 text-slate-900 dark:bg-[#0f1219] dark:text-white md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 dark:border-slate-700 dark:bg-slate-900">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black">Bandeja de WhatsApp</h1>
            <p className="text-sm text-slate-500">Entrega, errores, cola e intentos de todos los mensajes salientes.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCampaignOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white">
            <PaperAirplaneIcon className="h-4 w-4" /> Mensaje masivo
          </button>
          <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black ${connection?.connected ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'}`}>
            <SignalIcon className="h-4 w-4" />
            {connection?.connected ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
          </span>
          <button type="button" onClick={() => void fetchData()} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 dark:border-slate-700 dark:bg-slate-900" aria-label="Actualizar">
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {campaignOpen && (
        <form onSubmit={sendCampaign} className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm dark:border-blue-900/50 dark:bg-blue-950/20">
          <div><h2 className="text-sm font-black">Nueva campaña</h2><p className="text-xs text-slate-500">Se enviará de forma secuencial, respetando el intervalo indicado.</p></div>
          <div className="grid gap-3 md:grid-cols-4">
            <select value={campaignTarget} onChange={(event) => { setCampaignTarget(event.target.value as 'zona' | 'router'); setCampaignTargetId(''); }} className="rounded-xl border border-slate-200 bg-white p-3 text-xs font-black dark:border-slate-700 dark:bg-slate-950">
              <option value="zona">Por zona</option><option value="router">Por router</option>
            </select>
            <select required value={campaignTargetId} onChange={(event) => setCampaignTargetId(event.target.value)} className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-950">
              <option value="">Selecciona destino…</option>
              {(campaignTarget === 'zona' ? zones : routers).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-950"><span className="font-bold">Cada</span><input required min="1" max="3600" type="number" value={campaignInterval} onChange={(event) => setCampaignInterval(event.target.value)} className="w-full bg-transparent py-3 outline-none" /><span className="font-bold">seg.</span></label>
            <button disabled={campaignLoading} className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50">{campaignLoading ? 'Encolando…' : 'Encolar campaña'}</button>
          </div>
          <textarea required maxLength={10000} value={campaignMessage} onChange={(event) => setCampaignMessage(event.target.value)} placeholder="Escribe el mensaje. Puedes usar {nombre}." rows={3} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950" />
        </form>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <SummaryCard label="Total" value={data?.resumen.total || 0} icon={PaperAirplaneIcon} />
        <SummaryCard label="En cola" value={(data?.resumen.pendiente || 0) + (data?.resumen.procesando || 0)} icon={QueueListIcon} />
        <SummaryCard label="Entregados" value={data?.resumen.entregado || 0} icon={CheckCircleIcon} />
        <SummaryCard label="Leídos" value={data?.resumen.leido || 0} icon={CheckCircleIcon} />
        <SummaryCard label="Fallidos" value={data?.resumen.fallido || 0} icon={ExclamationTriangleIcon} danger />
        <SummaryCard label="Inciertos" value={data?.resumen.incierto || 0} icon={ClockIcon} warning />
        <SummaryCard label="Procesando" value={data?.resumen.procesando || 0} icon={ArrowPathIcon} />
        <SummaryCard label="Cola actual" value={data?.cola_memoria || 0} icon={QueueListIcon} />
      </section>

      <form onSubmit={applyFilters} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:grid-cols-6">
        <label className="relative md:col-span-2">
          <MagnifyingGlassIcon className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cliente, teléfono o texto…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <select value={status} onChange={(event) => { setStatus(event.target.value as '' | OutboxStatus); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none dark:border-slate-700 dark:bg-slate-950">
          {statuses.map((item) => <option key={item.value || 'all'} value={item.value}>{item.label}</option>)}
        </select>
        <input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-950" aria-label="Desde" />
        <input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs outline-none dark:border-slate-700 dark:bg-slate-950" aria-label="Hasta" />
        <button type="submit" className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white">Buscar</button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">{data?.total || 0} resultado(s) · Página {page} de {totalPages}</p>
        <button type="button" onClick={() => void retryAll()} disabled={retryingAll || failedVisible === 0} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
          <ArrowPathIcon className={`h-4 w-4 ${retryingAll ? 'animate-spin' : ''}`} />
          Reintentar fallidos visibles ({failedVisible})
        </button>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="p-4">Fecha / ID</th>
                <th className="p-4">Destinatario</th>
                <th className="p-4">Mensaje</th>
                <th className="p-4">Intentos</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data?.items.map((message) => (
                <MessageRow key={message.id} message={message} expanded={expandedId === message.id} onExpand={() => setExpandedId(expandedId === message.id ? null : message.id)} onRetry={retryOne} onDelete={deleteOne} retrying={retryingId === message.id} deleting={deletingId === message.id} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {data?.items.map((message) => (
            <MessageCard key={message.id} message={message} onRetry={retryOne} onDelete={deleteOne} retrying={retryingId === message.id} deleting={deletingId === message.id} />
          ))}
        </div>

        {!loading && data?.items.length === 0 && (
          <div className="p-12 text-center text-sm font-bold text-slate-500">No hay mensajes con estos filtros.</div>
        )}
      </section>

      <nav className="flex items-center justify-center gap-3">
        <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-xl border border-slate-200 bg-white p-2.5 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="text-xs font-black">{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-slate-200 bg-white p-2.5 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </nav>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, danger = false, warning = false }: { label: string; value: number; icon: typeof PaperAirplaneIcon; danger?: boolean; warning?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${danger ? 'border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-950/20' : warning ? 'border-orange-200 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'}`}>
      <Icon className={`h-5 w-5 ${danger ? 'text-rose-500' : warning ? 'text-orange-500' : 'text-blue-500'}`} />
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
    </div>
  );
}

function RetryButton({ message, onRetry, retrying }: { message: OutboxMessage; onRetry: (message: OutboxMessage) => void; retrying: boolean }) {
  if (!retryable.has(message.estado_envio)) return <span className="text-[10px] text-slate-400">—</span>;
  return (
    <button type="button" disabled={retrying} onClick={() => void onRetry(message)} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">
      <ArrowPathIcon className={`h-3.5 w-3.5 ${retrying ? 'animate-spin' : ''}`} />
      Reintentar
    </button>
  );
}

function MessageRow({ message, expanded, onExpand, onRetry, onDelete, retrying, deleting }: { message: OutboxMessage; expanded: boolean; onExpand: () => void; onRetry: (message: OutboxMessage) => void; onDelete: (message: OutboxMessage) => void; retrying: boolean; deleting: boolean }) {
  return (
    <>
      <tr className="align-top hover:bg-slate-50 dark:hover:bg-slate-800/30">
        <td className="p-4"><p className="font-mono font-black">#{message.id}</p><p className="mt-1 text-[10px] text-slate-500">{formatDate(message.fecha)}</p></td>
        <td className="p-4"><p className="font-black">{message.cliente?.nombre || 'Sin cliente vinculado'}</p><p className="mt-1 font-mono text-[10px] text-slate-500">{message.telefono}</p></td>
        <td className="max-w-sm p-4"><button type="button" onClick={onExpand} className={`text-left leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>{message.mensaje}</button>{message.ultimo_error && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-[10px] font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{message.ultimo_error}</p>}</td>
        <td className="p-4"><p className="font-black">{message.intentos}/{message.max_intentos}</p><p className="mt-1 text-[10px] text-slate-500">Manual: {message.reintentos_manuales}</p></td>
        <td className="p-4 text-center"><span className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${statusStyles(message.estado_envio)}`}>{message.estado_envio}</span><p className="mt-2 text-[9px] text-slate-400">ACK {message.ack ?? 0}</p></td>
        <td className="p-4 text-right"><div className="flex justify-end gap-2"><RetryButton message={message} onRetry={onRetry} retrying={retrying} /><DeleteButton message={message} onDelete={onDelete} deleting={deleting} /></div></td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50 dark:bg-slate-950/50">
          <td colSpan={6} className="px-4 py-3 text-[10px] text-slate-500">
            Evento: {message.tipo_evento || 'manual'} · Último intento: {formatDate(message.ultima_tentativa_en)} · Entregado: {formatDate(message.entregado_en)} · Leído: {formatDate(message.leido_en)} · WA ID: {message.wa_id || '—'}
          </td>
        </tr>
      )}
    </>
  );
}

function MessageCard({ message, onRetry, onDelete, retrying, deleting }: { message: OutboxMessage; onRetry: (message: OutboxMessage) => void; onDelete: (message: OutboxMessage) => void; retrying: boolean; deleting: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-black">{message.cliente?.nombre || message.telefono}</p><p className="mt-1 text-[10px] text-slate-500">#{message.id} · {formatDate(message.fecha)}</p></div>
        <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${statusStyles(message.estado_envio)}`}>{message.estado_envio}</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{message.mensaje}</p>
      {message.ultimo_error && <p className="mt-3 rounded-lg bg-rose-100 p-2 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{message.ultimo_error}</p>}
      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
        <span className="text-[10px] font-bold text-slate-500">Intentos {message.intentos}/{message.max_intentos}</span>
        <div className="flex gap-2"><RetryButton message={message} onRetry={onRetry} retrying={retrying} /><DeleteButton message={message} onDelete={onDelete} deleting={deleting} /></div>
      </div>
    </article>
  );
}

function DeleteButton({ message, onDelete, deleting }: { message: OutboxMessage; onDelete: (message: OutboxMessage) => void; deleting: boolean }) {
  if (message.estado_envio === 'procesando') return null;
  return <button type="button" disabled={deleting} onClick={() => void onDelete(message)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-[10px] font-black text-rose-600 disabled:opacity-50 dark:border-rose-900"><TrashIcon className="h-3.5 w-3.5" />{deleting ? 'Borrando…' : 'Borrar'}</button>;
}
