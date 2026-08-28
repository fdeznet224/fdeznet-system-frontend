import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BanknotesIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CubeIcon,
  GlobeAmericasIcon,
  KeyIcon,
  MapPinIcon,
  PhoneIcon,
  QrCodeIcon,
  ServerIcon,
  UserIcon,
  WifiIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import client from '@/api/axios';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  routers: RouterCatalog[];
}

interface RouterCatalog {
  id: number;
  nombre: string;
  tipo_seguridad?: string;
}

interface NamedCatalog {
  id: number;
  nombre: string;
}

interface PlanCatalog extends NamedCatalog {
  precio: number;
}

interface NetworkCatalog extends NamedCatalog {
  cidr?: string;
}

interface NapCatalog extends NamedCatalog {
  capacidad?: number;
  zona_nombre?: string | null;
  olt_nombre?: string | null;
  router_nombre?: string | null;
}

interface TechnicianCatalog extends NamedCatalog {
  nombre_completo?: string;
  usuario: string;
  rol: string;
}

interface OltCatalog extends NamedCatalog {
  tecnologia?: string;
}

interface InventoryCatalog {
  id: number;
  identificador?: string;
  serial?: string;
  modelo?: string;
  tecnologia?: string;
}

interface NapDetail {
  puerto_nap?: number | string | null;
}

interface PppoeDefaultResponse {
  password?: string;
}

interface CreatedClientRecord {
  id: number;
  nombre?: string;
  cedula?: string;
  user_pppoe?: string | null;
  pass_pppoe?: string | null;
}

interface ActivationResponse extends Partial<CreatedClientRecord> {
  cliente?: CreatedClientRecord;
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail || fallback;
  }
  return fallback;
}

type TipoFacturacion = 'prepago' | 'postpago';
type CicloFacturacion = 'calendario' | 'aniversario';

type FormDataState = {
  nombre: string;
  telefono: string;
  direccion: string;
  olt_id: string;
  onu_id: string;
  zona_id: string;
  plantilla_id: string;
  router_id: string;
  plan_id: string;
  red_id: string;
  ip_asignada: string;
  user_pppoe: string;
  pass_pppoe: string;
  caja_nap_id: string;
  puerto_nap: string;
  tecnico_id: string;
  latitud: string;
  longitud: string;
  fecha_instalacion: string;
  fecha_activacion: string;
  meses_gratis: string;
  tipo_facturacion: TipoFacturacion;
  ciclo_facturacion: CicloFacturacion;
};

const todayLocal = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateLocal = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDateLocal = (date: Date | null) => {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addMonthsLocal = (date: Date, months: number) => {
  const result = new Date(date.getTime());
  const originalDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(originalDay, lastDay));
  return result;
};

const addDaysLocal = (date: Date, days: number) => {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
};

const createInitialFormData = (): FormDataState => {
  const today = todayLocal();

  return {
    nombre: '',
    telefono: '',
    direccion: '',
    olt_id: '',
    onu_id: '',
    zona_id: '',
    plantilla_id: '',
    router_id: '',
    plan_id: '',
    red_id: '',
    ip_asignada: '',
    user_pppoe: '',
    pass_pppoe: '',
    caja_nap_id: '',
    puerto_nap: '',
    tecnico_id: '',
    latitud: '',
    longitud: '',
    fecha_instalacion: today,
    fecha_activacion: today,
    meses_gratis: '1',
    tipo_facturacion: 'prepago',
    ciclo_facturacion: 'calendario',
  };
};

export default function CreateClientModal({
  isOpen,
  onClose,
  onSuccess,
  routers,
}: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activarAhora, setActivarAhora] = useState(false);
  const [pendingActivationClient, setPendingActivationClient] =
    useState<CreatedClientRecord | null>(null);
  const [createdClient, setCreatedClient] = useState<{
    nombre: string;
    cedula: string;
    hardware_id: string;
    id: number;
    user_pppoe?: string;
    pass_pppoe?: string;
    estado?: string;
  } | null>(null);

  const [zonas, setZonas] = useState<NamedCatalog[]>([]);
  const [plantillas, setPlantillas] = useState<NamedCatalog[]>([]);
  const [planes, setPlanes] = useState<PlanCatalog[]>([]);
  const [redes, setRedes] = useState<NetworkCatalog[]>([]);
  const [ipsLibres, setIpsLibres] = useState<string[]>([]);
  const [naps, setNaps] = useState<NapCatalog[]>([]);
  const [tecnicos, setTecnicos] = useState<TechnicianCatalog[]>([]);
  const [puertosOcupados, setPuertosOcupados] = useState<number[]>([]);
  const [olts, setOlts] = useState<OltCatalog[]>([]);
  const [inventarioDisponible, setInventarioDisponible] = useState<InventoryCatalog[]>([]);
  const [selectedPlantilla, setSelectedPlantilla] = useState<NamedCatalog | null>(null);
  const [formData, setFormData] = useState<FormDataState>(createInitialFormData);

  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setActivarAhora(false);
    setPendingActivationClient(null);
    setCreatedClient(null);
    setFormData(createInitialFormData());
    setSelectedPlantilla(null);
    setPlanes([]);
    setRedes([]);
    setIpsLibres([]);
    setNaps([]);
    setPuertosOcupados([]);
    cargarCatalogosIniciales();
  }, [isOpen]);

  useEffect(() => {
    if (!formData.nombre || step >= 4) return;

    const nombreSinAcentos = formData.nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const nombreLimpio = nombreSinAcentos.replace(/[^a-zA-Z0-9 ]/g, '');
    const usuarioFinal = nombreLimpio.trim().replace(/\s+/g, '_');

    setFormData((prev) => ({
      ...prev,
      user_pppoe: usuarioFinal,
    }));
  }, [formData.nombre, step]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      caja_nap_id: '',
      puerto_nap: '',
    }));
    if (!formData.zona_id) {
      setNaps([]);
      return;
    }

    const params = new URLSearchParams({
      zona_id: formData.zona_id,
    });
    if (formData.router_id) params.set('router_id', formData.router_id);
    if (formData.olt_id) params.set('olt_id', formData.olt_id);

    client
      .get<NapCatalog[]>(`/infraestructura/naps?${params.toString()}`)
      .then((res) => setNaps(res.data))
      .catch(() => setNaps([]));
  }, [formData.olt_id, formData.router_id, formData.zona_id]);

  useEffect(() => {
    if (!formData.caja_nap_id) {
      setPuertosOcupados([]);
      return;
    }

    client
      .get<NapDetail[]>(`/infraestructura/naps/${formData.caja_nap_id}/detalles`)
      .then((res) => setPuertosOcupados(
        res.data
          .map((connection) => Number(connection.puerto_nap))
          .filter(Number.isFinite),
      ))
      .catch(() => setPuertosOcupados([]));
  }, [formData.caja_nap_id]);

  const cargarCatalogosIniciales = async () => {
    try {
      const [resZonas, resPlantillas, resUsers, resOlts, resInventario] =
        await Promise.all([
          client.get<NamedCatalog[]>('/zonas/'),
          client.get<NamedCatalog[]>('/configuracion/plantillas-facturacion'),
          client.get<TechnicianCatalog[]>('/usuarios/'),
          client.get<OltCatalog[]>('/olts/'),
          client.get<InventoryCatalog[]>('/inventario/?estado=DISPONIBLE'),
        ]);

      setZonas(resZonas.data);
      setPlantillas(resPlantillas.data);
      setOlts(resOlts.data);
      setInventarioDisponible(resInventario.data);
      setTecnicos(resUsers.data.filter((user) => user.rol === 'tecnico'));
    } catch {
      toast.error('Error cargando catálogos');
    }
  };

  const billingPreview = useMemo(() => {
    const fechaBase = formData.fecha_activacion || formData.fecha_instalacion;
    const activacion = parseDateLocal(fechaBase);
    const mesesGratis = Number(formData.meses_gratis || 0);

    if (!activacion || Number.isNaN(mesesGratis) || mesesGratis < 0) {
      return {
        finPeriodoGratis: '',
        primerCobro: '',
      };
    }

    if (mesesGratis === 0) {
      return {
        finPeriodoGratis: 'Sin periodo gratis',
        primerCobro: formatDateLocal(activacion),
      };
    }

    const finGratis = addMonthsLocal(activacion, mesesGratis);
    const primerCobro = addDaysLocal(finGratis, 1);

    return {
      finPeriodoGratis: formatDateLocal(finGratis),
      primerCobro: formatDateLocal(primerCobro),
    };
  }, [formData.fecha_activacion, formData.fecha_instalacion, formData.meses_gratis]);

  const handlePlantillaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);

    setFormData({
      ...formData,
      plantilla_id: e.target.value,
    });
    setSelectedPlantilla(plantillas.find((p) => p.id === id) || null);
  };

  const handleRouterChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rId = e.target.value;
    const routerObj = routers.find((r) => r.id.toString() === rId);

    setFormData((prev) => ({
      ...prev,
      router_id: rId,
      red_id: '',
      ip_asignada: '',
      plan_id: '',
    }));
    if (!rId) {
      setRedes([]);
      setPlanes([]);
      return;
    }

    try {
      const [resRedes, resPlanes] = await Promise.all([
        client.get<NetworkCatalog[]>(`/network/redes/router/${rId}`),
        client.get<PlanCatalog[]>(`/planes/router/${rId}`),
      ]);

      setRedes(resRedes.data);
      setPlanes(resPlanes.data);

      if (routerObj?.tipo_seguridad === 'pppoe') {
        try {
          const resDef = await client.get<PppoeDefaultResponse>('/configuracion/pppoe-default');
          setFormData((prev) => ({
            ...prev,
            pass_pppoe: resDef.data.password || '123456',
          }));
        } catch {
          setFormData((prev) => ({
            ...prev,
            pass_pppoe: '123456',
          }));
        }
      }
    } catch {
      toast.error('Error cargando router');
    }
  };

  const handleRedChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const netId = e.target.value;

    setFormData({
      ...formData,
      red_id: netId,
      ip_asignada: '',
    });
    setIpsLibres([]);

    if (!netId) return;

    const t = toast.loading('Buscando IPs libres...');

    try {
      const res = await client.get<string[]>(`/network/redes/${netId}/ips-libres`);
      setIpsLibres(res.data);

      if (res.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          red_id: netId,
          ip_asignada: res.data[0],
        }));
      }

      toast.dismiss(t);
    } catch {
      toast.dismiss(t);
      toast.error('Error obteniendo IPs');
    }
  };

  const handleObtenerUbicacion = () => {
    if (!navigator.geolocation) {
      toast.error('GPS no soportado');
      return;
    }

    toast.loading('Capturando GPS...', {
      id: 'gps',
    });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitud: pos.coords.latitude.toString(),
          longitud: pos.coords.longitude.toString(),
        }));
        toast.success('¡Ubicación lista!', {
          id: 'gps',
        });
      },
      () =>
        toast.error('Error GPS. Activa permisos.', {
          id: 'gps',
        }),
      {
        enableHighAccuracy: true,
      },
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    const t = toast.loading(
      pendingActivationClient
        ? 'Reintentando activación en MikroTik...'
        : activarAhora
          ? 'Creando y configurando en MikroTik...'
          : 'Creando orden...',
    );
    let clienteRegistrado = pendingActivationClient;

    try {
      const onuAsignada = inventarioDisponible.find(
        (o) => o.id.toString() === formData.onu_id,
      );

      const payload = {
        nombre: formData.nombre.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
        router_id: Number(formData.router_id),
        plan_id: Number(formData.plan_id),
        olt_id: formData.olt_id ? Number(formData.olt_id) : null,
        onu_id: formData.onu_id ? Number(formData.onu_id) : null,
        zona_id: formData.zona_id ? Number(formData.zona_id) : null,
        plantilla_id: formData.plantilla_id ? Number(formData.plantilla_id) : null,
        red_id: formData.red_id ? Number(formData.red_id) : null,
        caja_nap_id: formData.caja_nap_id ? Number(formData.caja_nap_id) : null,
        puerto_nap: formData.puerto_nap ? Number(formData.puerto_nap) : null,
        tecnico_id: formData.tecnico_id ? Number(formData.tecnico_id) : null,
        latitud: formData.latitud ? parseFloat(formData.latitud) : null,
        longitud: formData.longitud ? parseFloat(formData.longitud) : null,
        user_pppoe: formData.user_pppoe?.trim() || null,
        pass_pppoe: formData.pass_pppoe?.trim() || null,
        ip_asignada: formData.ip_asignada?.trim() || null,
        estado: 'pendiente_instalacion',
      };

      const ipSeleccionadaParaActivar = String(
        payload.ip_asignada || formData.ip_asignada || '',
      ).trim();

      if (ipSeleccionadaParaActivar) {
        payload.ip_asignada = ipSeleccionadaParaActivar;
      }

      if (
        activarAhora &&
        (!ipSeleccionadaParaActivar || ipSeleccionadaParaActivar === '0.0.0.0')
      ) {
        toast.dismiss(t);
        toast.error('Selecciona una IP libre antes de activar el cliente.');
        setLoading(false);
        return;
      }

      if (!clienteRegistrado) {
        const res = await client.post<CreatedClientRecord>(
          '/clientes/',
          payload,
        );
        clienteRegistrado = res.data;
        if (activarAhora) {
          setPendingActivationClient(res.data);
        }
      }
      let datosCliente: Partial<CreatedClientRecord> = clienteRegistrado;

      if (activarAhora) {
        const resActivacion = await client.post<ActivationResponse>(
          `/clientes/${clienteRegistrado.id}/completar-instalacion`,
          {
            cedula:
              clienteRegistrado.cedula
              || clienteRegistrado.id.toString(),
            olt_id: payload.olt_id,
            onu_id: payload.onu_id,
            router_id: payload.router_id,
            plan_id: payload.plan_id,
            user_pppoe: payload.user_pppoe,
            pass_pppoe: payload.pass_pppoe,
            ip_asignada: ipSeleccionadaParaActivar,
            latitud: payload.latitud,
            longitud: payload.longitud,
            caja_nap_id: payload.caja_nap_id,
            puerto_nap: payload.puerto_nap,
            fecha_instalacion: formData.fecha_instalacion || todayLocal(),
            fecha_activacion:
              formData.fecha_activacion || formData.fecha_instalacion || todayLocal(),
            tipo_facturacion: formData.tipo_facturacion,
            ciclo_facturacion: formData.ciclo_facturacion,
            meses_gratis: Number(formData.meses_gratis || 0),
          },
        );

        datosCliente =
          resActivacion.data?.cliente
          || resActivacion.data
          || clienteRegistrado;
        setPendingActivationClient(null);
        toast.success('¡Cliente ACTIVADO!', {
          id: t,
        });
      } else {
        toast.success('Orden Generada', {
          id: t,
        });
      }

      setCreatedClient({
        nombre: datosCliente.nombre || payload.nombre,
        cedula:
          datosCliente.cedula
          || clienteRegistrado.cedula
          || clienteRegistrado.id.toString(),
        hardware_id: onuAsignada ? onuAsignada.identificador : 'SIN ASIGNAR',
        id: datosCliente.id || clienteRegistrado.id,
        user_pppoe: datosCliente.user_pppoe || payload.user_pppoe || undefined,
        pass_pppoe: datosCliente.pass_pppoe || payload.pass_pppoe || undefined,
        estado: activarAhora ? 'Activo' : 'Pendiente',
      });
      setStep(4);
    } catch (error: unknown) {
      toast.dismiss(t);
      const message = apiErrorMessage(error, 'Verifica campos obligatorios');
      if (clienteRegistrado && activarAhora) {
        setPendingActivationClient(clienteRegistrado);
        toast.error(
          `El cliente ID ${clienteRegistrado.id} quedó creado, pero no se activó: ${message}. Corrige el dato y pulsa “Reintentar activación”.`,
          { duration: 8000 },
        );
      } else {
        toast.error(message);
      }
      if (formData.onu_id && !clienteRegistrado) {
        try {
          const response = await client.get<InventoryCatalog[]>(
            '/inventario/?estado=DISPONIBLE',
          );
          setInventarioDisponible(response.data);
          if (!response.data.some(
            (item) => item.id.toString() === formData.onu_id,
          )) {
            setFormData((current) => ({ ...current, onu_id: '' }));
          }
        } catch {
          // Conservamos el error original; el catálogo se recargará al abrir.
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  const handleClose = () => {
    if (createdClient) {
      onSuccess();
    }

    onClose();
  };

  const renderPuertoOptions = () => {
    if (!formData.caja_nap_id) return null;

    const caja = naps.find((n) => n.id === Number(formData.caja_nap_id));
    const capacidad = caja?.capacidad || 16;

    return Array.from({ length: capacidad }, (_, index) => {
      const puerto = index + 1;
      const isTaken = puertosOcupados.includes(puerto);

      return (
        <option key={puerto} value={puerto} disabled={isTaken}>
          Puerto {puerto} {isTaken ? '(Ocupado)' : ''}
        </option>
      );
    });
  };

  const oltSeleccionada = olts.find((o) => o.id === Number(formData.olt_id));
  const equiposCompatibles = oltSeleccionada
    ? inventarioDisponible.filter((eq) => eq.tecnologia === oltSeleccionada.tecnologia)
    : inventarioDisponible;

  const flatInputClass =
    'w-full min-h-12 bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-base sm:text-sm rounded-2xl focus:ring-2 focus:ring-blue-500 block p-4 outline-none transition-all duration-200 placeholder:text-slate-400 border border-transparent appearance-none';

  const labelClass =
    'block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2 pl-1 uppercase tracking-widest';

  const cardClass = 'bg-white dark:bg-slate-900 sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 overflow-hidden';

  const canContinueStep1 = formData.nombre && formData.telefono && formData.zona_id;
  const canContinueStep2 = formData.plantilla_id && formData.plan_id;
  const canSubmit = formData.router_id && formData.user_pppoe && formData.pass_pppoe;

  const renderProgress = () => {
    const progress = step >= 4 ? 100 : Math.min((step / 3) * 100, 100);

    return (
      <div>
        <div className="mb-2 flex justify-between gap-2">
          {['Cliente', 'Cobranza', 'Instalación'].map((label, index) => {
            const number = index + 1;
            const active = step >= number;
            return (
              <span key={label} className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                {number}. {label}
              </span>
            );
          })}
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="flex min-h-full items-end justify-center sm:items-center sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className={`flex h-[100dvh] w-full max-w-5xl flex-col sm:h-auto sm:max-h-[92dvh] ${cardClass}`}>
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] dark:border-slate-800 sm:px-8 sm:py-5">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Nuevo servicio</p>
                    <Dialog.Title className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {step === 4 ? 'Cliente creado' : 'Alta de Cliente'}
                    </Dialog.Title>
                    {step < 4 && (
                      <p className="text-sm text-slate-500 mt-1">
                        1. Datos · 2. Cobro · 3. Red e instalación
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {step < 4 && <div className="shrink-0 px-5 pt-4 sm:px-8 sm:pt-5">{renderProgress()}</div>}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8">
                  {step === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={labelClass}>Zona / Colonia</label>
                        <div className="relative">
                          <MapPinIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <select
                            className={`${flatInputClass} pl-12`}
                            value={formData.zona_id}
                            onChange={(e) =>
                              setFormData({ ...formData, zona_id: e.target.value })
                            }
                          >
                            <option value="">Seleccionar Zona...</option>
                            {zonas.map((z) => (
                              <option key={z.id} value={z.id}>
                                {z.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Nombre completo</label>
                        <div className="relative">
                          <UserIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <input
                            className={`${flatInputClass} pl-12`}
                            value={formData.nombre}
                            onChange={(e) =>
                              setFormData({ ...formData, nombre: e.target.value })
                            }
                            placeholder="Nombre del cliente"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>WhatsApp / Celular</label>
                        <div className="relative">
                          <PhoneIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <input
                            className={`${flatInputClass} pl-12`}
                            value={formData.telefono}
                            onChange={(e) =>
                              setFormData({ ...formData, telefono: e.target.value })
                            }
                            placeholder="Número de contacto"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Dirección</label>
                        <div className="relative">
                          <MapPinIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <input
                            className={`${flatInputClass} pl-12`}
                            value={formData.direccion}
                            onChange={(e) =>
                              setFormData({ ...formData, direccion: e.target.value })
                            }
                            placeholder="Dirección de instalación"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>OLT Base</label>
                        <select
                          className={flatInputClass}
                          value={formData.olt_id}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              olt_id: e.target.value,
                              onu_id: '',
                            })
                          }
                        >
                          <option value="">No asignar aún...</option>
                          {olts.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.nombre} ({o.tecnologia})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>ONU / Equipo</label>
                        <select
                          className={flatInputClass}
                          value={formData.onu_id}
                          onChange={(e) =>
                            setFormData({ ...formData, onu_id: e.target.value })
                          }
                        >
                          <option value="">Sin asignar...</option>
                          {equiposCompatibles.map((eq) => (
                            <option key={eq.id} value={eq.id}>
                              {eq.identificador || eq.serial || eq.modelo}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={labelClass}>Plantilla de cobro</label>
                        <div className="relative">
                          <BanknotesIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <select
                            className={`${flatInputClass} pl-12`}
                            value={formData.plantilla_id}
                            onChange={handlePlantillaChange}
                          >
                            <option value="">Seleccionar plantilla...</option>
                            {plantillas.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Router</label>
                        <div className="relative">
                          <ServerIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <select
                            className={`${flatInputClass} pl-12`}
                            value={formData.router_id}
                            onChange={handleRouterChange}
                          >
                            <option value="">Seleccionar router...</option>
                            {routers.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Plan contratado</label>
                        <div className="relative">
                          <WifiIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <select
                            className={`${flatInputClass} pl-12`}
                            value={formData.plan_id}
                            onChange={(e) =>
                              setFormData({ ...formData, plan_id: e.target.value })
                            }
                            disabled={!formData.router_id}
                          >
                            <option value="">Seleccionar plan...</option>
                            {planes.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre} — ${Number(p.precio).toFixed(2)}/mes
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Tipo de facturación</label>
                        <select
                          className={flatInputClass}
                          value={formData.tipo_facturacion}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              tipo_facturacion: e.target.value as TipoFacturacion,
                            })
                          }
                        >
                          <option value="prepago">Prepago</option>
                          <option value="postpago">Postpago</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Ciclo de facturación</label>
                        <select
                          className={flatInputClass}
                          value={formData.ciclo_facturacion}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              ciclo_facturacion: e.target.value as CicloFacturacion,
                            })
                          }
                        >
                          <option value="calendario">Calendario</option>
                          <option value="aniversario">Aniversario</option>
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Meses gratis</label>
                        <input
                          className={flatInputClass}
                          type="number"
                          min="0"
                          max="12"
                          value={formData.meses_gratis}
                          onChange={(e) =>
                            setFormData({ ...formData, meses_gratis: e.target.value })
                          }
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Fecha de instalación</label>
                        <div className="relative">
                          <CalendarIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <input
                            className={`${flatInputClass} pl-12`}
                            type="date"
                            value={formData.fecha_instalacion}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                fecha_instalacion: e.target.value,
                                fecha_activacion: formData.fecha_activacion || e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Fecha de activación</label>
                        <div className="relative">
                          <CalendarIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <input
                            className={`${flatInputClass} pl-12`}
                            type="date"
                            value={formData.fecha_activacion}
                            onChange={(e) =>
                              setFormData({ ...formData, fecha_activacion: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 bg-blue-50 dark:bg-blue-950/30 rounded-3xl p-5 border border-blue-100 dark:border-blue-900">
                        <p className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-300 mb-3">
                          Vista previa de facturación
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500">Plantilla</p>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {selectedPlantilla?.nombre || 'Sin plantilla'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Fin periodo gratis</p>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {billingPreview.finPeriodoGratis || '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Primer cobro</p>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {billingPreview.primerCobro || '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className={labelClass}>Red</label>
                        <div className="relative">
                          <GlobeAmericasIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <select
                            className={`${flatInputClass} pl-12`}
                            value={formData.red_id}
                            onChange={handleRedChange}
                            disabled={!formData.router_id}
                          >
                            <option value="">Seleccionar red...</option>
                            {redes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.nombre} {r.cidr ? `- ${r.cidr}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>IP asignada</label>
                        <select
                          className={flatInputClass}
                          value={formData.ip_asignada}
                          onChange={(e) =>
                            setFormData({ ...formData, ip_asignada: e.target.value })
                          }
                        >
                          <option value="">Sin IP fija...</option>
                          {ipsLibres.map((ip) => (
                            <option key={ip} value={ip}>
                              {ip}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Usuario PPPoE</label>
                        <div className="relative">
                          <UserIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <input
                            className={`${flatInputClass} pl-12`}
                            value={formData.user_pppoe}
                            onChange={(e) =>
                              setFormData({ ...formData, user_pppoe: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Contraseña PPPoE</label>
                        <div className="relative">
                          <KeyIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <input
                            className={`${flatInputClass} pl-12`}
                            value={formData.pass_pppoe}
                            onChange={(e) =>
                              setFormData({ ...formData, pass_pppoe: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Caja NAP</label>
                        <div className="relative">
                          <CubeIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
                          <select
                            className={`${flatInputClass} pl-12`}
                            value={formData.caja_nap_id}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                caja_nap_id: e.target.value,
                                puerto_nap: '',
                              })
                            }
                          >
                            <option value="">Sin NAP...</option>
                            {naps.map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.nombre}
                                {n.router_nombre ? ` · ${n.router_nombre}` : ''}
                                {n.olt_nombre ? ` · ${n.olt_nombre}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Puerto NAP</label>
                        <select
                          className={flatInputClass}
                          value={formData.puerto_nap}
                          onChange={(e) =>
                            setFormData({ ...formData, puerto_nap: e.target.value })
                          }
                          disabled={!formData.caja_nap_id}
                        >
                          <option value="">Seleccionar puerto...</option>
                          {renderPuertoOptions()}
                        </select>
                      </div>

                      <div>
                        <label className={labelClass}>Técnico</label>
                        <select
                          className={flatInputClass}
                          value={formData.tecnico_id}
                          onChange={(e) =>
                            setFormData({ ...formData, tecnico_id: e.target.value })
                          }
                        >
                          <option value="">Sin asignar...</option>
                          {tecnicos.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nombre_completo || t.usuario}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end gap-3">
                        <button
                          type="button"
                          onClick={handleObtenerUbicacion}
                          className="w-full px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center gap-2"
                        >
                          <MapPinIcon className="w-5 h-5" />
                          Capturar GPS
                        </button>
                      </div>

                      <div className="md:col-span-2">
                        <p className={labelClass}>¿Cómo deseas registrar?</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            aria-pressed={!activarAhora}
                            disabled={Boolean(pendingActivationClient) || loading}
                            onClick={() => setActivarAhora(false)}
                            className={`min-h-32 cursor-pointer rounded-3xl p-5 border-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              !activarAhora
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                                : 'border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span className="block font-black text-slate-900 dark:text-white">
                              Solo crear orden
                            </span>
                            <span className="block text-sm text-slate-500 mt-1">
                              Deja el servicio pendiente para que un técnico
                              complete la instalación después.
                            </span>
                          </button>

                          <button
                            type="button"
                            aria-pressed={activarAhora}
                            disabled={loading}
                            onClick={() => setActivarAhora(true)}
                            className={`min-h-32 cursor-pointer rounded-3xl p-5 border-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              activarAhora
                                ? 'border-green-600 bg-green-50 dark:bg-green-950/30'
                                : 'border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <span>
                              <span className="block font-black text-slate-900 dark:text-white">
                                Crear y activar ahora
                              </span>
                              <span className="block text-sm text-slate-500 mt-1">
                                Configura IP, PPPoE y MikroTik inmediatamente.
                                Como administrador no necesitas asignar técnico.
                              </span>
                            </span>
                          </button>
                        </div>
                        {pendingActivationClient && (
                          <p className="mt-3 text-sm font-bold text-amber-700 dark:text-amber-300">
                            El cliente ID {pendingActivationClient.id} ya fue
                            creado. El siguiente intento solo reanudará la
                            activación; no lo registrará nuevamente.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {step === 4 && createdClient && (
                    <div className="text-center py-8">
                      <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-5" />
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                        {createdClient.nombre}
                      </h3>
                      <p className="text-slate-500 mt-1">
                        Estado: {createdClient.estado}
                      </p>

                      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(createdClient.cedula)}
                          className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                          <QrCodeIcon className="w-6 h-6 text-blue-600 mb-3" />
                          <p className="text-xs text-slate-500 uppercase font-bold">Cédula</p>
                          <p className="font-black text-slate-900 dark:text-white break-all">
                            {createdClient.cedula}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(createdClient.user_pppoe || '')}
                          className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                          <UserIcon className="w-6 h-6 text-blue-600 mb-3" />
                          <p className="text-xs text-slate-500 uppercase font-bold">Usuario</p>
                          <p className="font-black text-slate-900 dark:text-white break-all">
                            {createdClient.user_pppoe || '-'}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(createdClient.pass_pppoe || '')}
                          className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                          <ClipboardDocumentIcon className="w-6 h-6 text-blue-600 mb-3" />
                          <p className="text-xs text-slate-500 uppercase font-bold">Contraseña</p>
                          <p className="font-black text-slate-900 dark:text-white break-all">
                            {createdClient.pass_pppoe || '-'}
                          </p>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white/95 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 sm:flex-row sm:justify-between sm:px-8 sm:py-5">
                  {step > 1 && step < 4 ? (
                    <button
                      type="button"
                      onClick={() => setStep((prev) => prev - 1)}
                      disabled={loading}
                      className="min-h-12 px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <ArrowLeftIcon className="w-5 h-5" />
                      Atrás
                    </button>
                  ) : (
                    <div />
                  )}

                  {step === 1 && (
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!canContinueStep1}
                      className="min-h-12 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      Continuar
                      <ArrowRightIcon className="w-5 h-5" />
                    </button>
                  )}

                  {step === 2 && (
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      disabled={!canContinueStep2}
                      className="min-h-12 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      Continuar
                      <ArrowRightIcon className="w-5 h-5" />
                    </button>
                  )}

                  {step === 3 && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={loading || !canSubmit}
                      className="min-h-12 px-6 py-3 rounded-2xl bg-green-600 text-white font-black disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {loading
                        ? 'Procesando...'
                        : pendingActivationClient
                          ? 'Reintentar activación'
                          : activarAhora
                            ? 'Crear y activar ahora'
                            : 'Solo crear orden'}
                      <CheckCircleIcon className="w-5 h-5" />
                    </button>
                  )}

                  {step === 4 && (
                    <button
                      type="button"
                      onClick={handleClose}
                      className="min-h-12 px-6 py-3 rounded-2xl bg-blue-600 text-white font-black"
                    >
                      Finalizar
                    </button>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
