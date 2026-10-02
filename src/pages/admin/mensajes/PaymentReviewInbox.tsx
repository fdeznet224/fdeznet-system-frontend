import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  ArrowsPointingOutIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  UserIcon,
  XCircleIcon,
  XMarkIcon,
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
  validacion_correo?: {
    id: number;
    fecha?: string | null;
    monto?: number | null;
    referencia?: string | null;
    autenticado: boolean;
    estado: string;
  } | null;
}


interface Deposito {
  id: number;
  monto: number;
  referencia?: string | null;
  concepto: string;
  cuenta_destino?: string | null;
  fecha?: string | null;
  coincide_hora: boolean;
  coincide_referencia: boolean;
  ligado: boolean;
  titular: string[];
}

const SENAL_TITULAR: Record<string, string> = {
  nombre: 'Su nombre',
  contrato: 'Su contrato',
  concepto: 'Mismo concepto',
  cuenta_origen: 'Misma cuenta de origen',
};

// Solo se preselecciona cuando no hay duda: mismo folio, o el único con hora
// cercana en el que además coincide algo del titular. Si no, elige la persona.
function depositoSugerido(depositos: Deposito[]): number | null {
  const porFolio = depositos.filter((d) => d.coincide_referencia);
  if (porFolio.length === 1) return porFolio[0].id;
  const delTitular = depositos.filter((d) => d.coincide_hora && d.titular.length > 0);
  return delTitular.length === 1 ? delTitular[0].id : null;
}

interface ReviewResponse {
  items: ReviewItem[];
  total: number;
  pagina: number;
  limite: number;
  validar_pagos_con?: 'correo' | 'captura';
}

interface ClientResult {
  id: number;
  nombre: string;
  cedula: string;
  telefono?: string | null;
  estado: string;
  total_deuda: number;
}

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ detail?: unknown }>(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : String(item || '')))
        .filter(Boolean);
      if (messages.length) return messages.join(' · ');
    }
  }
  return fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

const money = (value?: number | null) => `$${Number(value || 0).toFixed(2)}`;

const statusStyles: Record<ReviewStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  procesando: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  aprobado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rechazado: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const MOTIVOS: Record<string, string> = {
  esperando_confirmacion: 'Esperando el correo del banco',
  sin_referencia: 'La captura no trae folio',
  ocr_no_legible: 'No se pudo leer la captura',
  pago_adelantado: 'Pago adelantado: se aplica el día 1',
  multiples_correos_coincidentes: 'Varios depósitos cuadran: elige uno',
  titular_no_coincide: 'El depósito no parece del cliente',
  correo_bancario_no_encontrado: 'Todavía no llega el correo del banco',
  correo_confirmado_cliente_no_identificado: 'Falta indicar el cliente',
  correo_confirmado_revision_manual: 'Confirmado por el banco: falta aprobar',
  monto_no_coincide: 'El monto no cubre la deuda',
  beneficiario_no_es_del_isp: 'El comprobante es de una transferencia a otra cuenta',
  verificado_en_banco_sin_correo: 'Aprobado: verificado en el banco sin correo',
  aprobado_por_captura: 'Aprobado con los datos de la captura',
  aprobado_en_panel_por_captura: 'Aprobado en el panel con la captura',
  captura_ya_utilizada: 'Esa captura ya se usó en otro pago',
  captura_antigua: 'La transferencia es de hace varios días',
  fecha_de_captura_invalida: 'La fecha de la captura no cuadra',
  captura_incompleta: 'Falta el folio o la fecha y hora en la captura',
  sin_deuda_pendiente: 'El cliente ya no tenía deuda',
  monto_mayor_al_normal: 'Monto mayor a lo normal: revisa antes de aplicar',
  segundo_pago_del_mes: 'Segundo pago por captura este mes',
  muchas_capturas_hoy: 'El mismo chat mandó varias capturas hoy',
};

const motivo = (valor: string) => MOTIVOS[valor] ?? valor.replaceAll('_', ' ');

function esAdministrador(): boolean {
  try {
    const usuario = JSON.parse(localStorage.getItem('user') || '{}') as { rol?: string };
    return usuario.rol === 'admin';
  } catch {
    return false;
  }
}

export default function PaymentReviewInbox() {
  const [status, setStatus] = useState<ReviewStatus | 'todos'>('pendiente');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [selected, setSelected] = useState<ReviewItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFull, setImageFull] = useState(false);
  const [esPdf, setEsPdf] = useState(false);
  const [sinArchivo, setSinArchivo] = useState(false);
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientLabel, setClientLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<ClientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [depositoId, setDepositoId] = useState<number | null>(null);
  const [cargandoDepositos, setCargandoDepositos] = useState(false);
  const [verificadoEnBanco, setVerificadoEnBanco] = useState(false);
  const [notaVerificacion, setNotaVerificacion] = useState('');
  // En modo captura el depósito del banco es opcional: fuera de horario o de
  // Azteca a Azteca no llega correo.
  const [modoCaptura, setModoCaptura] = useState(false);
  const admin = esAdministrador();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await client.get<ReviewResponse>(
        `/whatsapp/comprobantes-revision?estado=${status}&limite=100`,
      );
      setItems(response.data.items);
      setModoCaptura(response.data.validar_pagos_con === 'captura');
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
        ? `${selected.cliente_nombre} · ${selected.cliente_cedula || 'sin número de contrato'}`
        : '',
    );
    setAmount(selected.monto_detectado ? String(selected.monto_detectado) : '');
    setReference(selected.folio_detectado || '');
    setSearch('');
    setResults([]);
    setImageFull(false);
    setVerificadoEnBanco(false);
    setNotaVerificacion('');
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setImageUrl(null);
      return;
    }
    let active = true;
    let objectUrl: string | null = null;
    setImageUrl(null);
    setSinArchivo(false);
    void client.get<Blob>(selected.archivo_url, { responseType: 'blob' })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        if (!active) return;
        setEsPdf(response.data.type === 'application/pdf');
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (!active) return;
        setImageUrl(null);
        setSinArchivo(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected]);

  const pendiente = selected?.estado === 'pendiente' || selected?.estado === 'procesando';
  const montoParaBuscar = selected?.monto_detectado ? '' : amount;

  useEffect(() => {
    setDepositos([]);
    setDepositoId(null);
    if (!selected || !pendiente) return;
    if (!selected.monto_detectado && !(Number(montoParaBuscar) > 0)) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setCargandoDepositos(true);
      const query = montoParaBuscar ? `?monto=${encodeURIComponent(montoParaBuscar)}` : '';
      void client.get<{ depositos: Deposito[] }>(`/whatsapp/comprobantes-revision/${selected.id}/depositos${query}`)
        .then((response) => {
          if (!active) return;
          setDepositos(response.data.depositos);
          setDepositoId(depositoSugerido(response.data.depositos));
        })
        .catch(() => { if (active) setDepositos([]); })
        .finally(() => { if (active) setCargandoDepositos(false); });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [selected, pendiente, montoParaBuscar]);

  useEffect(() => {
    const value = search.trim();
    if (value.length < 3) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void client.get<ClientResult[]>('/clientes/buscar', { params: { query: value } })
        .then((response) => { if (active) setResults(response.data); })
        .catch(() => { if (active) setResults([]); })
        .finally(() => { if (active) setSearching(false); });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search]);

  const elegirCliente = (result: ClientResult) => {
    setClientId(result.id);
    setClientLabel(`${result.nombre} · ${result.cedula}`);
    setSearch('');
    setResults([]);
  };

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
        transaccion_correo_id: verificadoEnBanco ? null : depositoId,
        verificado_en_banco: verificadoEnBanco,
        notas: verificadoEnBanco ? notaVerificacion.trim() : null,
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

  const variosCuadran = depositos.filter((d) => d.coincide_hora || d.coincide_referencia).length > 1;

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Comprobantes por revisar</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Los que el sistema no pudo confirmar solo. Revisa la captura, el cliente y el depósito del banco.</p>
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

      <div className="grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <section className={`space-y-2 ${selected ? 'hidden xl:block' : ''}`}>
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
              className={`w-full rounded-2xl border p-3 text-left transition ${selected?.id === item.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900 dark:text-white">{item.cliente_nombre || 'Cliente sin identificar'}</p>
                  <p className="truncate text-xs text-slate-500">{item.cliente_cedula || item.telefono}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${statusStyles[item.estado]}`}>{item.estado}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-black">{item.monto_detectado ? money(item.monto_detectado) : 'Monto no leído'}</span>
                <span className="inline-flex items-center gap-1 text-xs"><ClockIcon className="h-4 w-4" /> {formatDate(item.fecha_recepcion)}</span>
              </div>
              <p className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-300">{motivo(item.motivo_revision)}</p>
            </button>
          ))}
        </section>

        {!selected ? (
          <div className="hidden rounded-2xl border border-slate-200 bg-white p-16 text-center dark:border-slate-800 dark:bg-slate-900 xl:block">
            <PhotoIcon className="mx-auto h-14 w-14 text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">Selecciona un comprobante para revisarlo.</p>
          </div>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-slate-900 dark:text-white">
                  Comprobante #{selected.id} · {selected.monto_detectado ? money(selected.monto_detectado) : 'monto no leído'}
                </p>
                <p className="text-xs text-slate-500">
                  Recibido {formatDate(selected.fecha_recepcion)} · {selected.telefono}
                  {selected.folio_detectado ? ` · Folio leído ${selected.folio_detectado}` : ' · Sin folio'}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Cerrar">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:p-5">
              <div className="space-y-3">
                {imageUrl && esPdf ? (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-10 text-center dark:border-slate-700 dark:bg-slate-950">
                    <PhotoIcon className="h-12 w-12 text-slate-400" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">El cliente mandó el comprobante en PDF</p>
                    <a href={imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-500">
                      <ArrowsPointingOutIcon className="h-5 w-5" /> Abrir PDF
                    </a>
                  </div>
                ) : (
                <button
                  type="button"
                  onClick={() => imageUrl && setImageFull(true)}
                  className="group relative block w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-950"
                  disabled={!imageUrl}
                >
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt="Comprobante recibido" className="max-h-[70vh] w-full object-contain" />
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                        <ArrowsPointingOutIcon className="h-4 w-4" /> Ver completa
                      </span>
                    </>
                  ) : (
                    <span className="flex h-64 items-center justify-center text-sm text-slate-500">{sinArchivo ? 'Archivo no disponible' : 'Cargando comprobante…'}</span>
                  )}
                </button>
                )}
                {selected.validacion_correo && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                    <p className="font-black">Transferencia encontrada en el correo del banco</p>
                    <p className="mt-1">Ref. {selected.validacion_correo.referencia} · {money(selected.validacion_correo.monto)}{selected.validacion_correo.fecha ? ` · ${formatDate(selected.validacion_correo.fecha)}` : ''}</p>
                  </div>
                )}
              </div>

              {pendiente ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">1. Cliente</p>
                    {clientId && clientLabel ? (
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-indigo-50 px-3 py-2.5 dark:bg-indigo-950/30">
                        <span className="inline-flex min-w-0 items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
                          <UserIcon className="h-5 w-5 shrink-0" /> <span className="truncate">{clientLabel}</span>
                        </span>
                        <button onClick={() => { setClientId(null); setClientLabel(''); }} className="shrink-0 text-xs font-bold text-indigo-600 underline dark:text-indigo-300">Cambiar</button>
                      </div>
                    ) : (
                      <div>
                        <div className="relative">
                          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
                          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, contrato o teléfono (mínimo 3 letras)" className="app-input w-full pl-10" />
                        </div>
                        {searching && <p className="mt-2 text-xs text-slate-500">Buscando…</p>}
                        {!searching && search.trim().length >= 3 && results.length === 0 && (
                          <p className="mt-2 text-xs text-slate-500">Sin resultados.</p>
                        )}
                        {results.length > 0 && (
                          <div className="mt-2 max-h-64 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
                            {results.map((result) => (
                              <button key={result.id} type="button" onClick={() => elegirCliente(result)} className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-slate-800">
                                <span className="min-w-0">
                                  <span className="block truncate font-bold text-slate-800 dark:text-white">{result.nombre}</span>
                                  <span className="text-xs text-slate-500">Contrato {result.cedula} · {result.estado}</span>
                                </span>
                                <span className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">Debe {money(result.total_deuda)}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {selected.factura_sugerida && clientId === selected.cliente_id && (
                      <p className="text-xs text-slate-500">Factura #{selected.factura_sugerida.id} · saldo {money(selected.factura_sugerida.saldo_pendiente)} · vence {selected.factura_sugerida.fecha_vencimiento}</p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-500">2. Monto<input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="app-input mt-1 w-full text-base font-bold normal-case tracking-normal" /></label>
                    <label className="block text-xs font-black uppercase tracking-wide text-slate-500">Folio o referencia<input value={reference} onChange={(event) => setReference(event.target.value)} className="app-input mt-1 w-full normal-case tracking-normal" /></label>
                  </div>

                  <fieldset className="space-y-2">
                    <legend className="text-xs font-black uppercase tracking-wide text-slate-500">3. Depósito del banco{modoCaptura ? ' (opcional)' : ''}</legend>
                    {cargandoDepositos && <p className="text-xs text-slate-500">Buscando depósitos…</p>}
                    {!cargandoDepositos && depositos.length === 0 && (
                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-800">
                        {selected.monto_detectado || Number(amount) > 0
                          ? 'No hay depósitos libres de ese monto en los días de búsqueda.'
                          : 'Escribe el monto para buscar el depósito.'}
                      </p>
                    )}
                    {!cargandoDepositos && variosCuadran && !depositoId && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        Varios depósitos cuadran con la captura. Compara el concepto y la cuenta antes de elegir.
                      </p>
                    )}
                    <div className="grid gap-2 2xl:grid-cols-2">
                      {depositos.map((deposito) => (
                        <label
                          key={deposito.id}
                          className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-xs ${depositoId === deposito.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 dark:bg-emerald-950/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'}`}
                        >
                          <input type="radio" name="deposito" className="mt-0.5" checked={depositoId === deposito.id} onChange={() => { setDepositoId(deposito.id); setVerificadoEnBanco(false); }} />
                          <span className="min-w-0 space-y-0.5">
                            <span className="block text-sm font-black text-slate-800 dark:text-white">
                              {money(deposito.monto)} · cuenta {deposito.cuenta_destino || '—'}
                            </span>
                            {deposito.fecha && <span className="block text-slate-500">{formatDate(deposito.fecha)}</span>}
                            <span className="block break-words text-slate-700 dark:text-slate-200">{deposito.concepto || 'Sin concepto'}</span>
                            <span className="block break-all text-slate-400">Ref. {deposito.referencia || '—'}</span>
                            <span className="flex flex-wrap gap-1 pt-1">
                              {deposito.coincide_referencia && <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Mismo folio</span>}
                              {deposito.coincide_hora && <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">Hora cercana</span>}
                              {deposito.titular.map((senal) => (
                                <span key={senal} className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{SENAL_TITULAR[senal] ?? senal}</span>
                              ))}
                              {deposito.coincide_hora && deposito.titular.length === 0 && !deposito.coincide_referencia && (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">Nada del titular coincide</span>
                              )}
                              {deposito.ligado && <span className="rounded-full bg-slate-200 px-2 py-0.5 font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">Apartado para este</span>}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {modoCaptura && !depositoId && (
                      <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                        Opcional: puedes aprobar con la captura aunque el banco no haya mandado correo. El folio queda bloqueado para otro pago.
                      </p>
                    )}
                    {admin && !modoCaptura && (
                      <div className="space-y-2 rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
                        <label className="flex cursor-pointer items-start gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                          <input
                            type="checkbox"
                            className="mt-0.5"
                            checked={verificadoEnBanco}
                            onChange={(event) => { setVerificadoEnBanco(event.target.checked); if (event.target.checked) setDepositoId(null); }}
                          />
                          El correo del banco no llegó: lo verifiqué en la app del banco
                        </label>
                        {verificadoEnBanco && (
                          <>
                            <input
                              value={notaVerificacion}
                              onChange={(event) => setNotaVerificacion(event.target.value)}
                              placeholder="Dónde lo viste, ej.: app Azteca, 30/09 08:58, $300"
                              className="app-input w-full text-sm"
                            />
                            <p className="text-[11px] text-slate-500">Se registra con tu usuario, el folio ya no se podrá usar en otro pago y se avisa a los administradores.</p>
                          </>
                        )}
                      </div>
                    )}
                  </fieldset>

                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">{motivo(selected.motivo_revision)}{selected.notas_revision ? ` · ${selected.notas_revision}` : ''}</p>

                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => void reject()} disabled={working} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-100 px-4 py-3 font-bold text-rose-700 disabled:opacity-50 dark:bg-rose-950/40 dark:text-rose-300"><XCircleIcon className="h-5 w-5" /> Rechazar</button>
                    <button onClick={() => void approve()} disabled={working || !clientId || (verificadoEnBanco ? notaVerificacion.trim().length < 5 : !depositoId && !modoCaptura)} title={!clientId ? 'Elige el cliente' : verificadoEnBanco ? 'Escribe dónde lo verificaste' : !depositoId && !modoCaptura ? 'Elige el depósito del banco' : undefined} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white disabled:opacity-50"><CheckCircleIcon className="h-5 w-5" /> Aprobar</button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
                  <p className="font-bold capitalize text-slate-800 dark:text-white">{selected.estado}</p>
                  <p className="mt-1 text-slate-500">{selected.notas_revision || 'Sin notas'} {selected.revisado_por ? `· ${selected.revisado_por}` : ''}</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {imageFull && imageUrl && !esPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setImageFull(false)} role="dialog" aria-modal="true">
          <img src={imageUrl} alt="Comprobante completo" className="max-h-full max-w-full object-contain" />
          <button onClick={() => setImageFull(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Cerrar">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}
