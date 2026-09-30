import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { EnvelopeIcon, EyeIcon, EyeSlashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';

export interface BankEmailConfig {
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

const bankInputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/** Configuración del correo bancario que confirma las transferencias. */
export default function CorreoBancarioConfig() {
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

  useEffect(() => { void loadEmailConfig(); }, [loadEmailConfig]);

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

  if (!emailConfig) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`rounded-xl p-2 ${emailConfig.activo ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
          <EnvelopeIcon className="h-6 w-6" />
        </span>
        <span>
          <span className="block font-black text-slate-900 dark:text-white">Correo bancario</span>
          <span className="block text-xs text-slate-500">
            {emailConfig.activo
              ? `Activo${emailConfig.auto_aprobar ? ' · aprobación automática' : ' · aprobación manual'}`
              : 'Desactivado hasta configurar y probar Gmail'}
          </span>
        </span>
      </div>
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
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void testEmailConnection()} disabled={emailLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                <ShieldCheckIcon className="h-5 w-5" /> {emailLoading ? 'Procesando…' : 'Probar y guardar'}
              </button>
              <button type="button" onClick={() => void saveEmailConfig()} disabled={emailLoading} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Guardar cambios</button>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">Primera configuración: guarda desactivado, prueba la conexión y después activa. Empieza con aprobación automática apagada hasta verificar una transferencia real.</p>
    </div>
  );
}
