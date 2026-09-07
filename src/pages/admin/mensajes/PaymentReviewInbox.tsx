import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import client from '@/api/axios';

type ReviewStatus = 'pendiente' | 'procesando' | 'aprobado' | 'rechazado';

interface ReviewItem {
  id: number;
  estado: ReviewStatus;
  cliente_id?: number | null;
  cliente_nombre?: string | null;
  cliente_cedula?: string | null;
  telefono: string;
  monto_detectado?: number | null;
  folio_detectado?: string | null;
  cedula_detectada?: string | null;
  motivo_revision: string;
  notas_revision?: string | null;
  fecha_recepcion: string;
  fecha_revision?: string | null;
  revisado_por?: string | null;
  pago_id?: number | null;
  factura_sugerida?: {
    id: number;
    saldo_pendiente: number;
    fecha_vencimiento: string;
  } | null;
  archivo_url: string;
}

interface ReviewResponse {
  items: ReviewItem[];
  total: number;
  pagina: number;
  limite: number;
}

interface ClientResult {
  id: number;
  nombre: string;
  cedula: string;
  telefono?: string | null;
  estado: string;
  total_deuda: number;
}

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail || fallback;
  }
  return fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

const statusStyles: Record<ReviewStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  procesando: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  aprobado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rechazado: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export default function PaymentReviewInbox() {
  const [status, setStatus] = useState<ReviewStatus | 'todos'>('pendiente');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientLabel, setClientLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ClientResult[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await client.get<ReviewResponse>(
        `/whatsapp/comprobantes-revision?estado=${status}&limite=100`,
      );
      setItems(response.data.items);
      setSelected((current) => (
        current
          ? response.data.items.find((item) => item.id === current.id) || null
          : null
      ));
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cargar la bandeja'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    setClientId(selected.cliente_id || null);
    setClientLabel(
      selected.cliente_nombre
        ? `${selected.cliente_nombre} · ${selected.cliente_cedula || 'sin cédula'}`
        : '',
    );
    setAmount(selected.monto_detectado ? String(selected.monto_detectado) : '');
    setReference(selected.folio_detectado || '');
    setSearch('');
    setResults([]);
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setImageUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    void client.get(selected.archivo_url, { responseType: 'blob' })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        if (active) setImageUrl(objectUrl);
      })
      .catch(() => { if (active) setImageUrl(null); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected]);

  useEffect(() => {
    const value = search.trim();
    if (value.length < 3) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void client.get<ClientResult[]>(`/clients/buscar?query=${encodeURIComponent(value)}`)
        .then((response) => setResults(response.data))
        .catch(() => setResults([]));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const approve = async () => {
    if (!selected || !clientId || !amount) {
      toast.error('Selecciona el cliente y confirma el monto');
      return;
    }
    setWorking(true);
    try {
      await client.post(`/whatsapp/comprobantes-revision/${selected.id}/aprobar`, {
        cliente_id: clientId,
        factura_id: (
          clientId === selected.cliente_id
            ? selected.factura_sugerida?.id || null
            : null
        ),
        monto: Number(amount),
        referencia: reference.trim() || null,
      });
      toast.success('Pago aprobado y procesado');
      setSelected(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo aprobar el comprobante'));
    } finally {
      setWorking(false);
    }
  };

  const reject = async () => {
    if (!selected) return;
    const reason = window.prompt('Motivo del rechazo para informar al cliente:');
    if (!reason?.trim()) return;
    setWorking(true);
    try {
      await client.post(`/whatsapp/comprobantes-revision/${selected.id}/rechazar`, {
        motivo: reason.trim(),
      });
      toast.success('Comprobante rechazado y cliente notificado');
      setSelected(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo rechazar el comprobante'));
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Comprobantes por revisar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Valida los pagos recibidos por FdezBot antes de aplicarlos.</p>
        </div>
        <button onClick={() => void load()} className="app-button-secondary inline-flex items-center justify-center gap-2" disabled={loading}>
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['pendiente', 'procesando', 'aprobado', 'rechazado', 'todos'] as const).map((value) => (
          <button
            key={value}
            onClick={() => { setStatus(value); setSelected(null); }}
            className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${status === value ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.9fr)]">
        <section className="space-y-3">
          {!loading && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-emerald-500" />
              <p className="mt-3 font-bold text-slate-700 dark:text-slate-200">No hay comprobantes en este estado.</p>
            </div>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={`w-full rounded-2xl border p-4 text-left transition ${selected?.id === item.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900 dark:text-white">{item.cliente_nombre || 'Cliente sin identificar'}</p>
                  <p className="text-xs text-slate-500">{item.cliente_cedula || item.telefono}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusStyles[item.estado]}`}>{item.estado}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-bold">{item.monto_detectado ? `$${Number(item.monto_detectado).toFixed(2)}` : 'Monto no detectado'}</span>
                <span className="inline-flex items-center gap-1"><ClockIcon className="h-4 w-4" /> {formatDate(item.fecha_recepcion)}</span>
              </div>
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{item.motivo_revision.replaceAll('_', ' ')}</p>
            </button>
          ))}
        </section>

        <aside className="lg:sticky lg:top-5 lg:self-start">
          {!selected ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
              <PhotoIcon className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">Selecciona un comprobante para revisarlo.</p>
            </div>
          ) : (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
              <div className="overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950">
                {imageUrl ? <img src={imageUrl} alt="Comprobante recibido" className="max-h-[28rem] w-full object-contain" /> : <div className="flex h-48 items-center justify-center text-sm text-slate-500">Imagen no disponible</div>}
              </div>

              {selected.estado === 'pendiente' || selected.estado === 'procesando' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente por nombre o cédula" className="app-input w-full pl-10" />
                    {results.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                        {results.map((result) => (
                          <button key={result.id} onClick={() => { setClientId(result.id); setClientLabel(`${result.nombre} · ${result.cedula}`); setSearch(''); setResults([]); }} className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700">
                            <span className="block font-bold text-slate-800 dark:text-white">{result.nombre}</span>
                            <span className="text-xs text-slate-500">{result.cedula} · Deuda ${Number(result.total_deuda).toFixed(2)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {clientLabel && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">Cliente: {clientLabel}</p>}
                  <label className="block text-xs font-bold text-slate-500">Monto confirmado<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="app-input mt-1 w-full" /></label>
                  <label className="block text-xs font-bold text-slate-500">Folio o referencia<input value={reference} onChange={(event) => setReference(event.target.value)} className="app-input mt-1 w-full" /></label>
                  {selected.factura_sugerida && <p className="text-xs text-slate-500">Factura sugerida #{selected.factura_sugerida.id} · Saldo ${Number(selected.factura_sugerida.saldo_pendiente).toFixed(2)}</p>}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button onClick={() => void reject()} disabled={working} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-100 px-4 py-3 font-bold text-rose-700 disabled:opacity-50 dark:bg-rose-950/40 dark:text-rose-300"><XCircleIcon className="h-5 w-5" /> Rechazar</button>
                    <button onClick={() => void approve()} disabled={working} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-50"><CheckCircleIcon className="h-5 w-5" /> Aprobar</button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
                  <p className="font-bold capitalize text-slate-800 dark:text-white">{selected.estado}</p>
                  <p className="mt-1 text-slate-500">{selected.notas_revision || 'Sin notas'} {selected.revisado_por ? `· ${selected.revisado_por}` : ''}</p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
