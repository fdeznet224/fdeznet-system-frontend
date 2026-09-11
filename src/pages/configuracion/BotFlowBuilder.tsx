import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  ChatBubbleBottomCenterTextIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import client from '@/api/axios';

type BotAction =
  | 'reportar_pago'
  | 'promesa_pago'
  | 'estado_servicio'
  | 'datos_pago'
  | 'diagnostico_tecnico';

interface BotOption {
  id: BotAction;
  label: string;
  enabled: boolean;
}

interface BotFlow {
  activo: boolean;
  palabra_activacion: string;
  minutos_sesion: number;
  inicio_fuera_horario: boolean;
  mensaje_bienvenida: string;
  mensaje_despedida: string;
  opciones: BotOption[];
}

const actionHelp: Record<BotAction, string> = {
  reportar_pago: 'Recibe el comprobante y lo concilia con el correo bancario.',
  promesa_pago: 'Registra una promesa y puede reactivar según la política de cobranza.',
  estado_servicio: 'Muestra plan, estado y saldo únicamente al teléfono registrado.',
  datos_pago: 'Envía la plantilla editable con banco, cuenta, CLABE y referencia.',
  diagnostico_tecnico: 'Consulta en vivo PPPoE, ONU y potencia óptica sin modificar equipos.',
};

const actionIcon: Record<BotAction, string> = {
  reportar_pago: '💳',
  promesa_pago: '⏳',
  estado_servicio: '📊',
  datos_pago: '🏦',
  diagnostico_tecnico: '🛠️',
};

function errorMessage(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })
    ?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => (typeof item?.msg === 'string' ? item.msg : 'Dato inválido'))
      .join('. ');
  }
  return 'No fue posible guardar el flujo';
}

export default function BotFlowBuilder() {
  const navigate = useNavigate();
  const [form, setForm] = useState<BotFlow | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client
      .get<BotFlow>('/configuracion/bot-flujo')
      .then(({ data }) => setForm(data))
      .catch(() => toast.error('No se pudo cargar la configuración del bot'));
  }, []);

  const preview = useMemo(() => {
    if (!form) return '';
    const lines = ['🤖 *Bienvenido al asistente*', form.mensaje_bienvenida, ''];
    form.opciones
      .filter((option) => option.enabled)
      .forEach((option, index) => {
        lines.push(`${index + 1}️⃣ ${actionIcon[option.id]} *${option.label}*`);
      });
    lines.push('', '👉 Responde con el número de la opción.');
    lines.push(`Escribe *${form.palabra_activacion || 'bot'}* o *menú* para volver aquí; *cancelar* para salir.`);
    return lines.join('\n');
  }, [form]);

  const updateOption = (index: number, changes: Partial<BotOption>) => {
    setForm((current) => {
      if (!current) return current;
      const opciones = [...current.opciones];
      opciones[index] = { ...opciones[index], ...changes };
      return { ...current, opciones };
    });
  };

  const moveOption = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      if (!current) return current;
      const target = index + direction;
      if (target < 0 || target >= current.opciones.length) return current;
      const opciones = [...current.opciones];
      [opciones[index], opciones[target]] = [opciones[target], opciones[index]];
      return { ...current, opciones };
    });
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const { data } = await client.put<BotFlow>('/configuracion/bot-flujo', form);
      setForm(data);
      toast.success('Flujo del bot guardado');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!form) {
    return <div className="p-8 text-center text-slate-500">Cargando flujo del bot…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/configuracion')} className="rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Flujo del bot de WhatsApp</h1>
            <p className="text-sm text-slate-500">Configura el comando, el menú y los servicios disponibles.</p>
          </div>
        </div>
        <button disabled={saving} onClick={() => void save()} className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white shadow-lg shadow-emerald-500/20 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar flujo'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111218] md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-black text-slate-900 dark:text-white">Activación y sesión</h2>
                <p className="text-xs text-slate-500">El cliente escribe el comando para abrir este menú.</p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={form.activo} onChange={(event) => setForm({ ...form, activo: event.target.checked })} className="h-5 w-5 rounded text-emerald-600" />
                Bot activo
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Comando de activación
                <input value={form.palabra_activacion} maxLength={30} onChange={(event) => setForm({ ...form, palabra_activacion: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
              </label>
              <label className="space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                Duración de sesión (minutos)
                <input type="number" min={5} max={60} value={form.minutos_sesion} onChange={(event) => setForm({ ...form, minutos_sesion: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
              </label>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <input type="checkbox" checked={form.inicio_fuera_horario} onChange={(event) => setForm({ ...form, inicio_fuera_horario: event.target.checked })} className="mt-0.5 h-5 w-5 rounded text-emerald-600" />
              <span><strong className="block text-sm text-slate-800 dark:text-white">Iniciar automáticamente fuera del horario</strong><span className="text-xs text-slate-500">Atiende mensajes aunque el cliente no escriba el comando.</span></span>
            </label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111218] md:p-6">
            <h2 className="mb-4 font-black text-slate-900 dark:text-white">Mensajes del flujo</h2>
            <label className="block space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              Bienvenida
              <textarea maxLength={500} rows={3} value={form.mensaje_bienvenida} onChange={(event) => setForm({ ...form, mensaje_bienvenida: event.target.value })} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="mt-4 block space-y-2 text-sm font-bold text-slate-700 dark:text-slate-200">
              Despedida al cancelar
              <textarea maxLength={300} rows={2} value={form.mensaje_despedida} onChange={(event) => setForm({ ...form, mensaje_despedida: event.target.value })} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900" />
            </label>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#111218] md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-black text-slate-900 dark:text-white">Opciones del menú</h2><p className="text-xs text-slate-500">Activa, renombra y ordena las funciones disponibles.</p></div>
              <button onClick={() => navigate('/admin/configuracion/mensajes')} className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-sm font-black text-amber-700 dark:text-amber-400"><CreditCardIcon className="h-5 w-5" /> Editar datos de pago</button>
            </div>
            <div className="space-y-3">
              {form.opciones.map((option, index) => (
                <div key={option.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{actionIcon[option.id]}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex gap-2">
                        <input maxLength={80} value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-bold dark:border-slate-700 dark:bg-slate-900" />
                        <button title="Subir" disabled={index === 0} onClick={() => moveOption(index, -1)} className="rounded-lg bg-slate-100 p-2 disabled:opacity-30 dark:bg-slate-800"><ArrowUpIcon className="h-4 w-4" /></button>
                        <button title="Bajar" disabled={index === form.opciones.length - 1} onClick={() => moveOption(index, 1)} className="rounded-lg bg-slate-100 p-2 disabled:opacity-30 dark:bg-slate-800"><ArrowDownIcon className="h-4 w-4" /></button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{actionHelp[option.id]}</p>
                    </div>
                    <input aria-label={`Activar ${option.label}`} type="checkbox" checked={option.enabled} onChange={(event) => updateOption(index, { enabled: event.target.checked })} className="mt-2 h-5 w-5 rounded text-emerald-600" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-3xl bg-[#0b141a] p-5 shadow-xl lg:sticky lg:top-5">
          <div className="mb-4 flex items-center gap-2 text-emerald-400"><ChatBubbleBottomCenterTextIcon className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-widest">Vista previa</span></div>
          <div className="rounded-2xl rounded-tl-sm bg-[#005c4b] p-4 text-sm leading-relaxed text-white shadow whitespace-pre-wrap">{preview}</div>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">Las consultas de saldo, promesas y diagnóstico solo responden cuando el contrato pertenece al teléfono registrado. El diagnóstico es de solo lectura.</p>
        </aside>
      </div>
    </div>
  );
}
