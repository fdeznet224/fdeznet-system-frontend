import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  ShieldCheckIcon,
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
  validacion_correo?: {
    id: number;
    fecha?: string | null;
    monto?: number | null;
    referencia?: string | null;
    autenticado: boolean;
    estado: string;
  } | null;
}

interface BankEmailConfig {
  activo: boolean;
  auto_aprobar: boolean;
  proveedor: string;
  correo?: string | null;
  credencial_configurada: boolean;
  credencial_verificada_en?: string | null;
  remitente_permitido?: string | null;
  cuentas_destino_permitidas?: string | null;
  asunto_filtro?: string | null;
  carpeta: string;
  ventana_dias: number;
  tolerancia_monto: number;
  requiere_dkim: boolean;
  ultima_revision?: string | null;
  ultimo_error?: string | null;
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

function errorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ detail?: unknown }>(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim()) return detail;
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'msg' in item) {
            const location = 'loc' in item && Array.isArray(item.loc)
              ? String(item.loc.at(-1) || '')
              : '';
            const labels: Record<string, string> = {
              correo: 'Cuenta Gmail',
              password_aplicacion: 'Contraseña de aplicación',
              remitente_permitido: 'Remitente bancario',
              cuentas_destino_permitidas: 'Cuentas receptoras',
              ventana_dias: 'Ventana de búsqueda',
              tolerancia_monto: 'Tolerancia de monto',
            };
            return `${labels[location] || location || 'Dato inválido'}: ${String(item.msg)}`;
          }
          return '';
        })
        .filter(Boolean);
      if (messages.length) return messages.join(' · ');
    }
    if (detail && typeof detail === 'object' && 'msg' in detail) {
      return String(detail.msg);
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

const statusStyles: Record<ReviewStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  procesando: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  aprobado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rechazado: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

const bankInputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

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
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailConfig, setEmailConfig] = useState<BankEmailConfig | null>(null);

  const loadEmailConfig = useCallback(async () => {
    try {
      const response = await client.get<BankEmailConfig>('/correo-bancario/configuracion');
      setEmailConfig(response.data);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cargar la configuración bancaria'));
    }
  }, []);

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

  useEffect(() => { void load(); void loadEmailConfig(); }, [load, loadEmailConfig]);

  const updateEmailConfig = <K extends keyof BankEmailConfig>(key: K, value: BankEmailConfig[K]) => {
    setEmailConfig((current) => (current ? { ...current, [key]: value } : current));
  };

  const emailPayload = () => ({
    activo: Boolean(emailConfig?.activo),
    auto_aprobar: Boolean(emailConfig?.auto_aprobar),
    correo: emailConfig?.correo?.trim() || '',
    password_aplicacion: appPassword.replaceAll(' ', '') || null,
    remitente_permitido: emailConfig?.remitente_permitido?.trim() || '',
    cuentas_destino_permitidas: emailConfig?.cuentas_destino_permitidas?.trim() || '',
    asunto_filtro: emailConfig?.asunto_filtro?.trim() || null,
    carpeta: emailConfig?.carpeta?.trim() || 'INBOX',
    ventana_dias: Number(emailConfig?.ventana_dias || 3),
    tolerancia_monto: Number(emailConfig?.tolerancia_monto || 0),
    requiere_dkim: true,
  });

  const validateEmailForm = () => {
    const payload = emailPayload();
    if (!payload.correo.includes('@')) {
      toast.error('Escribe una cuenta de Gmail válida');
      return false;
    }
    if (!payload.remitente_permitido.includes('@')) {
      toast.error('Copia el correo remitente exacto desde un aviso real del banco');
      return false;
    }
    if (!/^\d{4}(\s*,\s*\d{4})*$/.test(payload.cuentas_destino_permitidas)) {
      toast.error('Indica la terminación de 4 dígitos de cada cuenta receptora');
      return false;
    }
    if (!emailConfig?.credencial_configurada && !payload.password_aplicacion) {
      toast.error('Escribe la contraseña de aplicación de Google');
      return false;
    }
    if (payload.password_aplicacion && payload.password_aplicacion.length !== 16) {
      toast.error('La contraseña de aplicación debe tener 16 caracteres');
      return false;
    }
    if (payload.ventana_dias < 1 || payload.ventana_dias > 30) {
      toast.error('La ventana de búsqueda debe estar entre 1 y 30 días');
      return false;
    }
    if (payload.tolerancia_monto < 0 || payload.tolerancia_monto > 100) {
      toast.error('La tolerancia debe estar entre $0.00 y $100.00; recomendamos $0.00');
      return false;
    }
    return true;
  };

  const saveEmailConfig = async () => {
    if (!validateEmailForm()) return;
    setEmailLoading(true);
    try {
      const response = await client.post<BankEmailConfig>(
        '/correo-bancario/configuracion',
        emailPayload(),
      );
      setEmailConfig(response.data);
      setAppPassword('');
      toast.success('Configuración guardada');
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo guardar la configuración'));
    } finally {
      setEmailLoading(false);
    }
  };

  const testEmailConnection = async () => {
    if (!validateEmailForm()) return;
    setEmailLoading(true);
    try {
      const response = await client.post<{
        configuracion: BankEmailConfig;
      }>('/correo-bancario/probar', emailPayload());
      setEmailConfig(response.data.configuracion);
      setAppPassword('');
      toast.success('Conexión verificada y datos guardados');
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo conectar con Gmail'));
    } finally {
      setEmailLoading(false);
    }
  };

  const syncBankEmail = async () => {
    setEmailLoading(true);
    try {
      const response = await client.post<{ nuevos: number; validos: number }>('/correo-bancario/sincronizar');
      await Promise.all([loadEmailConfig(), load()]);
      toast.success(`Correo revisado: ${response.data.nuevos || 0} nuevo(s), ${response.data.validos || 0} válido(s)`);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo sincronizar Gmail'));
    } finally {
      setEmailLoading(false);
    }
  };

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
          <p className="text-sm text-slate-500 dark:text-slate-400">Valida los pagos recibidos por el asistente antes de aplicarlos.</p>
        </div>
        <button onClick={() => void load()} className="app-button-secondary inline-flex items-center justify-center gap-2" disabled={loading}>
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setShowEmailSettings((value) => !value)}
          className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
        >
          <span className="flex items-center gap-3">
            <span className={`rounded-xl p-2 ${emailConfig?.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
              <EnvelopeIcon className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-black text-slate-900 dark:text-white">Validación por correo bancario</span>
              <span className="block text-xs text-slate-500">
                {emailConfig?.activo
                  ? `Activa${emailConfig.auto_aprobar ? ' · aprobación automática' : ' · aprobación manual'}`
                  : 'Desactivada hasta configurar y probar Gmail'}
              </span>
            </span>
          </span>
          <span className="text-xs font-bold text-indigo-600">{showEmailSettings ? 'Cerrar' : 'Configurar'}</span>
        </button>

        {showEmailSettings && emailConfig && (
          <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {['1. Captura los datos', '2. Prueba y guarda', '3. Activa la validación'].map((step, index) => (
                <div key={step} className={`rounded-xl border px-3 py-2 text-xs font-bold ${index === 0 || emailConfig.credencial_verificada_en ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-indigo-200' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}>{step}</div>
              ))}
            </div>
            <div className="flex gap-3 rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
              <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Usa una contraseña de aplicación de Google, no tu contraseña normal. Gmail se consulta en modo de solo lectura y el pago exige coincidencia de referencia, monto, fecha, DKIM y DMARC.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Cuenta de Gmail que recibe los depósitos
                <input type="email" value={emailConfig.correo || ''} onChange={(event) => updateEmailConfig('correo', event.target.value)} placeholder="pagos@gmail.com" className={bankInputClass} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Contraseña de aplicación de Google
                <span className="relative mt-1.5 block">
                  <input type={showPassword ? 'text' : 'password'} value={appPassword} onChange={(event) => setAppPassword(event.target.value)} placeholder={emailConfig.credencial_configurada ? 'Guardada; deja vacío para conservarla' : '16 caracteres de Google'} autoComplete="new-password" className={`${bankInputClass} mt-0 pr-11`} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-indigo-600" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </span>
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Correo remitente de Banco Azteca
                <input type="text" value={emailConfig.remitente_permitido || ''} onChange={(event) => updateEmailConfig('remitente_permitido', event.target.value)} placeholder="Copia el campo De de un correo real" className={bankInputClass} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Terminaciones de cuentas receptoras
                <input type="text" inputMode="numeric" value={emailConfig.cuentas_destino_permitidas || ''} onChange={(event) => updateEmailConfig('cuentas_destino_permitidas', event.target.value)} placeholder="Ej. 1234 o 1234,5678" className={bankInputClass} />
                <span className="mt-1 block font-normal text-slate-400">Solo se aceptan abonos dirigidos a estas cuentas.</span>
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">El asunto contiene (opcional)
                <input value={emailConfig.asunto_filtro || ''} onChange={(event) => updateEmailConfig('asunto_filtro', event.target.value)} placeholder="Transferencia recibida" className={bankInputClass} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Ventana de búsqueda (días)
                <input type="number" min="1" max="30" value={emailConfig.ventana_dias} onChange={(event) => updateEmailConfig('ventana_dias', Number(event.target.value))} className={bankInputClass} />
              </label>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Tolerancia de monto
                <span className="relative block">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 mt-0.5 -translate-y-1/2 text-sm text-slate-400">$</span>
                  <input type="number" min="0" max="100" step="0.01" value={emailConfig.tolerancia_monto} onChange={(event) => updateEmailConfig('tolerancia_monto', Number(event.target.value))} className={`${bankInputClass} pl-7`} />
                </span>
                <span className="mt-1 block font-normal text-slate-400">Diferencia permitida entre captura y banco. Recomendado: $0.00 · Máximo: $100.00.</span>
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-bold dark:border-slate-700">
                Validación activa
                <input type="checkbox" checked={emailConfig.activo} onChange={(event) => updateEmailConfig('activo', event.target.checked)} className="h-5 w-5 rounded" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-bold dark:border-slate-700">
                Aprobar automáticamente
                <input type="checkbox" checked={emailConfig.auto_aprobar} onChange={(event) => updateEmailConfig('auto_aprobar', event.target.checked)} className="h-5 w-5 rounded" />
              </label>
            </div>
            <div className="text-xs text-slate-500">
              <p>Credencial: {emailConfig.credencial_verificada_en ? `verificada ${formatDate(emailConfig.credencial_verificada_en)}` : emailConfig.credencial_configurada ? 'guardada, falta probarla' : 'no configurada'}.</p>
              {emailConfig.ultima_revision && <p>Última revisión: {formatDate(emailConfig.ultima_revision)}.</p>}
              {emailConfig.ultimo_error && <p className="mt-1 text-rose-600">Último error: {emailConfig.ultimo_error}</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => void testEmailConnection()} disabled={emailLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                <ShieldCheckIcon className="h-5 w-5" /> {emailLoading ? 'Procesando…' : 'Probar y guardar'}
              </button>
              <button type="button" onClick={() => void saveEmailConfig()} disabled={emailLoading} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Guardar cambios</button>
              <button type="button" onClick={() => void syncBankEmail()} disabled={emailLoading || !emailConfig.activo} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
                <ArrowPathIcon className={`h-5 w-5 ${emailLoading ? 'animate-spin' : ''}`} /> Sincronizar ahora
              </button>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">Primera configuración: guarda desactivado, prueba la conexión y después activa. Empieza con aprobación automática apagada hasta verificar una transferencia real.</p>
          </div>
        )}
      </section>

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
              {item.validacion_correo && (
                <p className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  Correo bancario autenticado · {item.validacion_correo.referencia} · ${Number(item.validacion_correo.monto || 0).toFixed(2)}
                </p>
              )}
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

              {selected.validacion_correo && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <p className="font-black">Transferencia encontrada en Gmail</p>
                  <p className="mt-1">Referencia {selected.validacion_correo.referencia} · ${Number(selected.validacion_correo.monto || 0).toFixed(2)}{selected.validacion_correo.fecha ? ` · ${formatDate(selected.validacion_correo.fecha)}` : ''}</p>
                </div>
              )}

              {selected.estado === 'pendiente' || selected.estado === 'procesando' ? (
                <div className="space-y-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente por nombre o número de contrato" className="app-input w-full pl-10" />
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
