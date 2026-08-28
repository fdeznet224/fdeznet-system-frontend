import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  HomeModernIcon,
  MapPinIcon,
  PauseCircleIcon,
  PencilSquareIcon,
  PlusIcon,
  SignalIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import client from '@/api/axios';
import type { ClientService } from '@/types/services';
import IpAccessModal from './IpAccessModal';

interface Props {
  clientId: number;
  onChanged?: () => void;
}

interface NamedCatalog {
  id: number;
  nombre: string;
}

interface PlanCatalog extends NamedCatalog {
  precio: number | string;
  router_id?: number | null;
}

interface TechnicianCatalog extends NamedCatalog {
  usuario?: string;
  nombre_completo?: string;
  rol?: string;
}

interface NewServiceForm {
  alias: string;
  direccion: string;
  zona_id: string;
  router_id: string;
  plan_id: string;
  plantilla_id: string;
  tecnico_id: string;
  tipo_facturacion: 'prepago' | 'postpago';
  ciclo_facturacion: 'calendario' | 'aniversario';
  meses_gratis: string;
  crear_orden: boolean;
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

const initialForm = (): NewServiceForm => ({
  alias: '',
  direccion: '',
  zona_id: '',
  router_id: '',
  plan_id: '',
  plantilla_id: '',
  tecnico_id: '',
  tipo_facturacion: 'prepago',
  ciclo_facturacion: 'calendario',
  meses_gratis: '0',
  crear_orden: true,
});

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail || fallback;
  }
  return fallback;
}

function statusClass(status: string) {
  if (status === 'activo') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
  if (status === 'suspendido') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }
  if (status === 'pendiente_instalacion') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  }
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    activo: 'Activo',
    suspendido: 'Suspendido',
    pendiente_instalacion: 'Pendiente de instalación',
    cancelado: 'Cancelado',
    retirado: 'Retirado',
    eliminado: 'Eliminado',
  };
  return labels[status] || status.replaceAll('_', ' ');
}

export default function ClientServicesPanel({ clientId, onChanged }: Props) {
  const [services, setServices] = useState<ClientService[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState<number | null>(null);
  const [form, setForm] = useState<NewServiceForm>(initialForm);
  const [routers, setRouters] = useState<NamedCatalog[]>([]);
  const [plans, setPlans] = useState<PlanCatalog[]>([]);
  const [zones, setZones] = useState<NamedCatalog[]>([]);
  const [templates, setTemplates] = useState<NamedCatalog[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianCatalog[]>([]);
  const [planService, setPlanService] = useState<ClientService | null>(null);
  const [planOptions, setPlanOptions] = useState<PlanCatalog[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [remoteService, setRemoteService] = useState<ClientService | null>(null);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await client.get<ClientService[]>(`/servicios/cliente/${clientId}`);
      setServices(response.data);
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudieron cargar los servicios'));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchServices();
  }, [fetchServices]);

  const loadCatalogs = async () => {
    try {
      const [routerResponse, zoneResponse, templateResponse, usersResponse] = await Promise.all([
        client.get<NamedCatalog[]>('/network/routers/'),
        client.get<NamedCatalog[]>('/zonas/'),
        client.get<NamedCatalog[]>('/configuracion/plantillas-facturacion/'),
        client.get<TechnicianCatalog[]>('/usuarios'),
      ]);
      setRouters(routerResponse.data);
      setZones(zoneResponse.data);
      setTemplates(templateResponse.data);
      setTechnicians(usersResponse.data.filter((item) => item.rol === 'tecnico'));
    } catch {
      toast.error('No se pudieron cargar los catálogos');
    }
  };

  const openCreate = () => {
    setForm(initialForm());
    setPlans([]);
    setShowCreate(true);
    void loadCatalogs();
  };

  const changeRouter = async (routerId: string) => {
    setForm((current) => ({ ...current, router_id: routerId, plan_id: '' }));
    if (!routerId) {
      setPlans([]);
      return;
    }
    try {
      const response = await client.get<PlanCatalog[]>(`/planes/router/${routerId}`);
      setPlans(response.data);
    } catch {
      setPlans([]);
      toast.error('No se pudieron cargar los planes del router');
    }
  };

  const openPlanChange = async (service: ClientService) => {
    if (!service.router_id) {
      toast.error('Este servicio no tiene un MikroTik asignado');
      return;
    }
    setPlanService(service);
    setSelectedPlanId(service.plan_id ? String(service.plan_id) : '');
    setPlanOptions([]);
    try {
      const response = await client.get<PlanCatalog[]>(
        `/planes/router/${service.router_id}`,
      );
      setPlanOptions(response.data);
    } catch {
      setPlanService(null);
      toast.error('No se pudieron cargar los planes de este MikroTik');
    }
  };

  const savePlanChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!planService || !selectedPlanId) {
      toast.error('Selecciona un plan');
      return;
    }
    setSavingPlan(true);
    try {
      const response = await client.put<{
        mikrotik_sincronizado: boolean | null;
        mensaje: string;
      }>(`/servicios/${planService.id}/plan`, {
        plan_id: Number(selectedPlanId),
      });
      if (response.data.mikrotik_sincronizado === false) {
        toast(response.data.mensaje, { icon: '⚠️' });
      } else {
        toast.success(response.data.mensaje);
      }
      setPlanService(null);
      await fetchServices();
      onChanged?.();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo cambiar el plan'));
    } finally {
      setSavingPlan(false);
    }
  };

  const createService = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.alias.trim().length < 2 || form.direccion.trim().length < 5) {
      toast.error('Indica un alias y la dirección completa');
      return;
    }
    setSaving(true);
    try {
      await client.post('/servicios/', {
        cliente_id: clientId,
        alias: form.alias.trim(),
        direccion: form.direccion.trim(),
        zona_id: form.zona_id ? Number(form.zona_id) : null,
        router_id: form.router_id ? Number(form.router_id) : null,
        plan_id: form.plan_id ? Number(form.plan_id) : null,
        plantilla_id: form.plantilla_id ? Number(form.plantilla_id) : null,
        tecnico_id: form.tecnico_id ? Number(form.tecnico_id) : null,
        tipo_facturacion: form.tipo_facturacion,
        ciclo_facturacion: form.ciclo_facturacion,
        meses_gratis: Number(form.meses_gratis || 0),
        crear_orden: form.crear_orden,
      });
      toast.success(form.crear_orden ? 'Servicio y orden de instalación creados' : 'Servicio creado');
      setShowCreate(false);
      await fetchServices();
      onChanged?.();
    } catch (error) {
      toast.error(errorMessage(error, 'No se pudo crear el servicio'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (service: ClientService) => {
    const nextStatus = service.estado === 'suspendido' ? 'activo' : 'suspendido';
    const action = nextStatus === 'activo' ? 'reactivar' : 'suspender';
    if (!window.confirm(`¿Deseas ${action} solo “${service.alias}”?`)) return;
    setChangingId(service.id);
    try {
      await client.put(`/servicios/${service.id}/estado`, { estado: nextStatus });
      toast.success(nextStatus === 'activo' ? 'Servicio reactivado' : 'Servicio suspendido');
      await fetchServices();
      onChanged?.();
    } catch (error) {
      toast.error(errorMessage(error, `No se pudo ${action} el servicio`));
    } finally {
      setChangingId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Domicilios y contratos</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Cada domicilio conserva su propia red, estado, facturación y órdenes.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-500"
          >
            <PlusIcon className="h-4 w-4" />
            Agregar servicio
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <ArrowPathIcon className="h-7 w-7 animate-spin text-blue-500" />
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
            <HomeModernIcon className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-3 text-sm font-black">Este cliente todavía no tiene servicios.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {services.map((service) => (
              <article
                key={service.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-slate-900 dark:text-white">{service.alias}</h4>
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${statusClass(service.estado)}`}>
                        {statusLabel(service.estado)}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black ${service.is_online ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <SignalIcon className="h-3.5 w-3.5" />
                        {service.is_online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
                      <MapPinIcon className="mt-0.5 h-4 w-4 shrink-0" />
                      {service.direccion || 'Sin dirección'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500">
                      <span>ID servicio: #{service.id}</span>
                      <span>
                        MikroTik: {service.router?.nombre || `#${service.router_id || 'Sin asignar'}`}
                      </span>
                      <span>
                        Plan: {service.plan?.nombre || 'Sin asignar'}
                        {service.plan ? ` · $${Number(service.plan.precio).toFixed(2)}/mes` : ''}
                      </span>
                      <button type="button" onClick={() => service.ip_asignada && setRemoteService(service)} className="font-bold underline decoration-dotted underline-offset-2 hover:text-blue-600 dark:hover:text-blue-400">
                        IP: {service.ip_asignada || 'Sin asignar'}
                      </button>
                      <span>Facturación: {service.tipo_facturacion}</span>
                      <span>Próxima: {service.proxima_facturacion || 'Pendiente'}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {service.estado !== 'cancelado' && service.router_id && (
                      <button
                        type="button"
                        onClick={() => void openPlanChange(service)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-100 px-3 py-2 text-[10px] font-black uppercase text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                        Cambiar plan
                      </button>
                    )}
                    {['activo', 'suspendido'].includes(service.estado) && (
                      <button
                        type="button"
                        disabled={changingId === service.id}
                        onClick={() => void toggleStatus(service)}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase transition disabled:opacity-50 ${
                          service.estado === 'suspendido'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}
                      >
                        {changingId === service.id ? (
                          <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        ) : service.estado === 'suspendido' ? (
                          <CheckCircleIcon className="h-4 w-4" />
                        ) : (
                          <PauseCircleIcon className="h-4 w-4" />
                        )}
                        {service.estado === 'suspendido' ? 'Reactivar' : 'Suspender'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-label="Agregar servicio" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f1115]">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Nuevo domicilio / servicio</h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  El titular seguirá siendo el mismo; este contrato tendrá su propia instalación.
                </p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={createService} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-500">
                  Alias del domicilio
                  <input
                    value={form.alias}
                    onChange={(event) => setForm({ ...form, alias: event.target.value })}
                    className={`${inputClass} mt-2`}
                    placeholder="Casa, Negocio, Casa mamá..."
                    required
                  />
                </label>
                <label className="text-xs font-black text-slate-500">
                  Zona
                  <select value={form.zona_id} onChange={(event) => setForm({ ...form, zona_id: event.target.value })} className={`${inputClass} mt-2`}>
                    <option value="">Sin asignar</option>
                    {zones.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </label>
              </div>

              <label className="block text-xs font-black text-slate-500">
                Dirección completa
                <textarea
                  value={form.direccion}
                  onChange={(event) => setForm({ ...form, direccion: event.target.value })}
                  className={`${inputClass} mt-2 resize-none`}
                  rows={3}
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-500">
                  Router
                  <select value={form.router_id} onChange={(event) => void changeRouter(event.target.value)} className={`${inputClass} mt-2`}>
                    <option value="">Sin asignar</option>
                    {routers.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </label>
                <label className="text-xs font-black text-slate-500">
                  Plan
                  <select value={form.plan_id} onChange={(event) => setForm({ ...form, plan_id: event.target.value })} className={`${inputClass} mt-2`} disabled={!form.router_id}>
                    <option value="">Sin asignar</option>
                    {plans.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre} — ${Number(item.precio).toFixed(2)}/mes
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-black text-slate-500">
                  Plantilla de facturación
                  <select value={form.plantilla_id} onChange={(event) => setForm({ ...form, plantilla_id: event.target.value })} className={`${inputClass} mt-2`}>
                    <option value="">Sin asignar</option>
                    {templates.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
                  </select>
                </label>
                <label className="text-xs font-black text-slate-500">
                  Técnico
                  <select value={form.tecnico_id} onChange={(event) => setForm({ ...form, tecnico_id: event.target.value })} className={`${inputClass} mt-2`}>
                    <option value="">Sin asignar</option>
                    {technicians.map((item) => (
                      <option key={item.id} value={item.id}>{item.nombre_completo || item.nombre || item.usuario}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-black text-slate-500">
                  Modalidad
                  <select value={form.tipo_facturacion} onChange={(event) => setForm({ ...form, tipo_facturacion: event.target.value as NewServiceForm['tipo_facturacion'] })} className={`${inputClass} mt-2`}>
                    <option value="prepago">Prepago</option>
                    <option value="postpago">Postpago</option>
                  </select>
                </label>
                <label className="text-xs font-black text-slate-500">
                  Ciclo
                  <select value={form.ciclo_facturacion} onChange={(event) => setForm({ ...form, ciclo_facturacion: event.target.value as NewServiceForm['ciclo_facturacion'] })} className={`${inputClass} mt-2`}>
                    <option value="calendario">Calendario</option>
                    <option value="aniversario">Aniversario</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-500">
                  Meses gratis
                  <input type="number" min="0" max="12" value={form.meses_gratis} onChange={(event) => setForm({ ...form, meses_gratis: event.target.value })} className={`${inputClass} mt-2`} />
                </label>
                <label className="flex items-center gap-3 self-end rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs font-black text-blue-700 dark:border-blue-500/20 dark:bg-blue-900/10 dark:text-blue-300">
                  <input type="checkbox" checked={form.crear_orden} onChange={(event) => setForm({ ...form, crear_orden: event.target.checked })} />
                  Crear orden de instalación
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold dark:bg-slate-800">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-50">
                  {saving ? 'Guardando…' : 'Crear servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {planService && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Cambiar plan del servicio"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f1115]"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Cambiar plan de {planService.alias}
                </h3>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  MikroTik: {planService.router?.nombre || `#${planService.router_id}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlanService(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={savePlanChange} className="space-y-4">
              <label className="block text-xs font-black text-slate-500">
                Plan compatible
                <select
                  value={selectedPlanId}
                  onChange={(event) => setSelectedPlanId(event.target.value)}
                  className={`${inputClass} mt-2`}
                  required
                >
                  <option value="">Seleccionar plan…</option>
                  {planOptions.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre} — ${Number(plan.precio).toFixed(2)}/mes
                    </option>
                  ))}
                </select>
              </label>
              <p className="rounded-xl bg-blue-50 p-3 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                El precio nuevo se usará en las próximas facturas. Si el MikroTik
                no responde, el cambio quedará pendiente para el reintento automático.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPlanService(null)}
                  className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold dark:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlan || !selectedPlanId}
                  className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  {savingPlan ? 'Aplicando…' : 'Confirmar cambio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <IpAccessModal
        ip={remoteService?.ip_asignada || null}
        clientName={remoteService?.alias}
        onClose={() => setRemoteService(null)}
      />
    </>
  );
}
