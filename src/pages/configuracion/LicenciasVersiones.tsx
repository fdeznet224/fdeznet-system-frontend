import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  CloudArrowUpIcon,
  CircleStackIcon,
  CommandLineIcon,
  BanknotesIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  RocketLaunchIcon,
  ServerStackIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import client from "@/api/axios";

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
  plan_nombre: string | null;
  plan_tipo: string | null;
  vigente_hasta: string | null;
  dias_gracia: number;
  limite_clientes: number | null;
  limite_routers: number | null;
  uso_clientes: number;
  uso_routers: number;
}

interface Installation {
  id: number;
  instalacion_id: string;
  nombre_isp: string;
  dominio: string | null;
  contacto_email: string | null;
  estado: string;
  estado_suscripcion: string | null;
  plan: string;
  plan_licencia_id: number | null;
  plan_nombre: string | null;
  plan_tipo: string | null;
  precio_mensual: number | null;
  limite_clientes: number | null;
  limite_routers: number | null;
  dias_gracia: number;
  suscripcion_inicio: string | null;
  suscripcion_vence: string | null;
  uso_clientes: number;
  uso_routers: number;
  canal: string;
  version_actual: string | null;
  version_objetivo: string | null;
  notas_actualizacion: string | null;
  ultima_conexion: string | null;
  creada_en: string;
  actualizacion_automatica: boolean;
  actualizacion_estado: string;
  actualizacion_mensaje: string | null;
  actualizacion_fecha: string | null;
  ultimo_respaldo: string | null;
}

interface InstallCommand extends Installation {
  token_instalacion: string;
  token_expira: string;
}
interface InstallationCreated extends InstallCommand {
  licencia: string;
}
interface BootstrapToken {
  token_instalacion: string;
  token_expira: string;
}
interface Release {
  id: number;
  version: string;
  backend_commit: string;
  frontend_commit: string;
  notas: string | null;
  creada_en: string;
}
interface LicensePlan {
  id: number;
  codigo: string;
  nombre: string;
  tipo: "demo" | "mensual" | "permanente";
  precio_mensual: number;
  duracion_dias: number | null;
  dias_gracia: number;
  limite_clientes: number | null;
  limite_routers: number | null;
  activo: boolean;
  creado_en: string;
}
interface Maintenance {
  estado: string;
  mensaje: string;
  fecha: string | null;
  version: string | null;
  respaldo: string | null;
  actualizacion_automatica: boolean;
  respaldo_automatico: boolean;
  revision_automatica: boolean;
  respaldo_externo_configurado: boolean;
  recuperacion_estado: string;
  recuperacion_fecha: string | null;
  clave_huella: string | null;
}
interface LicensePayment {
  id: number;
  instalacion_id: number;
  plan_licencia_id: number | null;
  meses: number;
  monto: number;
  referencia: string | null;
  registrado_en: string;
}

const card =
  "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900";
const input =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export default function LicenciasVersiones() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [plans, setPlans] = useState<LicensePlan[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [isCentral, setIsCentral] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showRelease, setShowRelease] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<LicensePlan | null>(null);
  const [installCommand, setInstallCommand] = useState<InstallCommand | null>(
    null,
  );
  const [editInstallation, setEditInstallation] = useState<Installation | null>(
    null,
  );
  const [paymentInstallation, setPaymentInstallation] =
    useState<Installation | null>(null);
  const [historyInstallation, setHistoryInstallation] =
    useState<Installation | null>(null);
  const [filter, setFilter] = useState("");
  const [stateFilter, setStateFilter] = useState<
    "todas" | "activas" | "suspendidas"
  >("todas");
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get<LicenseStatus>(
        "/configuracion/licencia",
      );
      setStatus(data);
      const maintenanceResponse = await client.get<Maintenance>(
        "/configuracion/mantenimiento",
      );
      setMaintenance(maintenanceResponse.data);
    } catch {
      toast.error("No se pudo consultar la licencia local");
    }
    try {
      const { data } = await client.get<Installation[]>(
        "/control/instalaciones",
      );
      setInstallations(data);
      const releaseResponse = await client.get<Release[]>("/control/versiones");
      setReleases(releaseResponse.data);
      const planResponse = await client.get<LicensePlan[]>("/control/planes");
      setPlans(planResponse.data);
      setIsCentral(true);
    } catch {
      setIsCentral(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const verify = async () => {
    setChecking(true);
    try {
      const { data } = await client.post<LicenseStatus>(
        "/configuracion/licencia/verificar",
      );
      setStatus(data);
      toast.success(data.mensaje);
    } catch {
      toast.error("No se pudo verificar la licencia");
    } finally {
      setChecking(false);
    }
  };

  const runMaintenance = async (
    action: "respaldo" | "actualizar" | "verificar",
  ) => {
    try {
      await client.post(`/configuracion/mantenimiento/${action}`);
      toast.success(
        action === "respaldo"
          ? "Respaldo iniciado"
          : action === "verificar"
            ? "Prueba de recuperación iniciada"
            : "Revisión iniciada",
      );
      window.setTimeout(() => void load(), 2500);
    } catch {
      toast.error("No se pudo iniciar la tarea");
    }
  };

  const regenerateCommand = async (item: Installation) => {
    try {
      const { data } = await client.post<BootstrapToken>(
        `/control/instalaciones/${item.id}/bootstrap`,
      );
      setInstallCommand({ ...item, ...data });
    } catch {
      toast.error("No se pudo generar un nuevo comando");
    }
  };

  const publishToAll = async (release: Release) => {
    if (
      !window.confirm(
        `¿Enviar la versión ${release.version} a todas las instalaciones? Cada cliente decidirá cuándo instalarla.`,
      )
    )
      return;
    setPublishing(true);
    try {
      const { data } = await client.post<{ mensaje: string }>(
        `/control/versiones/${release.id}/publicar-todos`,
      );
      toast.success(data.mensaje);
      await load();
    } catch {
      toast.error("No se pudo enviar la versión");
    } finally {
      setPublishing(false);
    }
  };

  const assignLatest = async (item: Installation) => {
    const latest = releases[0];
    if (!latest) return;
    try {
      await client.patch(`/control/instalaciones/${item.id}`, {
        version_objetivo: latest.version,
        notas_actualizacion: latest.notas,
        actualizacion_automatica: false,
      });
      toast.success(`Versión ${latest.version} enviada a ${item.nombre_isp}`);
      await load();
    } catch {
      toast.error("No se pudo asignar la versión");
    }
  };

  const removeInstallation = async (item: Installation) => {
    const confirmation = window.prompt(
      `Esta acción eliminará la licencia y todos sus pagos. Escribe ${item.nombre_isp} para confirmar:`,
    );
    if (confirmation !== item.nombre_isp) {
      if (confirmation !== null) toast.error("El nombre no coincide");
      return;
    }
    try {
      await client.delete(`/control/instalaciones/${item.id}`);
      toast.success("Instalación eliminada definitivamente");
      await load();
    } catch {
      toast.error("No se pudo eliminar la instalación");
    }
  };

  const effectiveState = (item: Installation) => {
    const value = item.estado_suscripcion || item.estado;
    return ["vencida", "revocada"].includes(value) ? "suspendida" : value;
  };
  const visibleInstallations = installations.filter((item) => {
    const query = filter.trim().toLowerCase();
    const matchesQuery =
      !query ||
      [
        item.nombre_isp,
        item.dominio,
        item.contacto_email,
        item.instalacion_id,
      ].some((value) => value?.toLowerCase().includes(query));
    const state = effectiveState(item);
    const matchesState =
      stateFilter === "todas" ||
      (stateFilter === "activas"
        ? ["activa", "gracia"].includes(state)
        : state === "suspendida" || state === "vencida");
    return matchesQuery && matchesState;
  });
  const latestRelease = releases[0] || null;
  const activeCount = installations.filter((item) =>
    ["activa", "gracia"].includes(effectiveState(item)),
  ).length;
  const suspendedCount = installations.length - activeCount;
  const pendingUpdates = installations.filter(
    (item) =>
      item.version_objetivo && item.version_actual !== item.version_objetivo,
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 pb-24 sm:p-6">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-5 dark:border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"
        >
          <ArrowLeftIcon className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            <ServerStackIcon className="h-6 w-6 text-blue-500" /> Licencias y
            versiones
          </h1>
          <p className="text-xs text-slate-500 sm:text-sm">
            Controla esta VPS y las instalaciones vendidas.
          </p>
        </div>
        {isCentral && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white sm:px-4 sm:text-sm"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Nueva instalación</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm font-bold text-slate-500">
          Cargando control de versiones…
        </div>
      ) : (
        status && (
          <section className={card}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${status.configurada ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}
              >
                <KeyIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Esta instalación
                  </h2>
                  <StatusBadge value={status.estado} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Versión instalada:{" "}
                  <strong className="text-slate-800 dark:text-slate-200">
                    v{status.version_actual}
                  </strong>
                </p>
                <p className="truncate text-xs text-slate-400">
                  {status.instalacion_id || "Aún no tiene ID de instalación"}
                </p>
                {status.plan_nombre && (
                  <p className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                    Plan {status.plan_nombre} · {status.uso_clientes}/
                    {status.limite_clientes ?? "∞"} abonados ·{" "}
                    {status.uso_routers}/{status.limite_routers ?? "∞"} routers
                    ·{" "}
                    {status.vigente_hasta
                      ? `vence ${formatDate(status.vigente_hasta)}`
                      : "sin vencimiento"}
                  </p>
                )}
                {status.actualizacion_disponible && (
                  <p className="mt-2 text-sm font-bold text-blue-600">
                    Disponible v{status.version_objetivo}:{" "}
                    {status.notas_actualizacion}
                  </p>
                )}
              </div>
              <button
                disabled={checking || !status.configurada}
                onClick={() => void verify()}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 disabled:opacity-40 dark:border-slate-700 dark:text-slate-200"
              >
                <ArrowPathIcon
                  className={`h-5 w-5 ${checking ? "animate-spin" : ""}`}
                />{" "}
                Verificar ahora
              </button>
            </div>
            {!status.configurada && (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                Para activar esta VPS agrega en su archivo <code>.env</code> las
                variables <strong>FDEZNET_INSTALLATION_ID</strong> y{" "}
                <strong>FDEZNET_LICENSE_KEY</strong>.
              </div>
            )}
            {["gracia", "vencida", "suspendida"].includes(status.estado) && (
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-black text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                {status.mensaje}
              </div>
            )}
            {maintenance && (
              <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950 sm:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Mantenimiento: {maintenance.estado.replaceAll("_", " ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {maintenance.mensaje} · {formatDate(maintenance.fecha)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                    Recuperación:{" "}
                    {maintenance.recuperacion_estado.replaceAll("_", " ")} ·{" "}
                    {formatDate(maintenance.recuperacion_fecha)}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-slate-400">
                    Respaldo diario{" "}
                    {maintenance.respaldo_automatico ? "activo" : "inactivo"} ·
                    Copia externa{" "}
                    {maintenance.respaldo_externo_configurado
                      ? "configurada"
                      : "pendiente"}{" "}
                    · Auditoría semanal{" "}
                    {maintenance.revision_automatica ? "activa" : "inactiva"} ·
                    Revisión de versión{" "}
                    {maintenance.actualizacion_automatica
                      ? "activa"
                      : "inactiva"}
                  </p>
                  {maintenance.clave_huella && (
                    <p className="mt-1 truncate font-mono text-[9px] text-slate-400">
                      Huella de clave: {maintenance.clave_huella}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 sm:max-w-xs sm:justify-end">
                  <button
                    onClick={() => void runMaintenance("respaldo")}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-black dark:border-slate-700"
                  >
                    <CircleStackIcon className="h-4 w-4" /> Respaldar
                  </button>
                  <button
                    onClick={() => void runMaintenance("verificar")}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black dark:border-slate-700"
                  >
                    Probar recuperación
                  </button>
                  <button
                    onClick={() => void runMaintenance("actualizar")}
                    className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                  >
                    Revisar actualización
                  </button>
                </div>
              </div>
            )}
          </section>
        )
      )}

      {isCentral && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Instalaciones"
            value={String(installations.length)}
            detail="Registradas en el control central"
            tone="blue"
          />
          <SummaryCard
            label="Activas"
            value={String(activeCount)}
            detail="Vigentes o en periodo de gracia"
            tone="emerald"
          />
          <SummaryCard
            label="Suspendidas"
            value={String(suspendedCount)}
            detail="Por estado manual o vencimiento"
            tone="rose"
          />
          <SummaryCard
            label="Por actualizar"
            value={String(pendingUpdates)}
            detail={
              latestRelease
                ? `Versión central ${latestRelease.version}`
                : "Sin liberación publicada"
            }
            tone="amber"
          />
        </section>
      )}

      {isCentral && (
        <section className={`${card} overflow-hidden`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-blue-500">
                Liberaciones del sistema
              </p>
              <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white">
                <RocketLaunchIcon className="h-6 w-6" /> Control de versiones
              </h2>
              <p className="mt-1 max-w-2xl text-xs text-slate-500">
                Publica una versión con sus commits y nota de cambios. Después
                envíala a todos; cada cliente verá el aviso y decidirá cuándo
                actualizar.
              </p>
            </div>
            <button
              onClick={() => setShowRelease(true)}
              className="shrink-0 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white dark:bg-blue-600"
            >
              Nueva liberación
            </button>
          </div>
          {latestRelease ? (
            <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/60 dark:bg-blue-950/30">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-black text-white">
                      v{latestRelease.version}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Versión central actual
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {latestRelease.notas || "Sin notas de liberación"}
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-slate-400">
                    Backend {latestRelease.backend_commit.slice(0, 8)} ·
                    Frontend {latestRelease.frontend_commit.slice(0, 8)} ·{" "}
                    {formatDate(latestRelease.creada_en)}
                  </p>
                </div>
                <button
                  disabled={publishing}
                  onClick={() => void publishToAll(latestRelease)}
                  className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  <CloudArrowUpIcon className="h-5 w-5" />
                  {publishing ? "Enviando…" : "Publicar a todos"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
              Todavía no existe una liberación.
            </div>
          )}
          {releases.length > 1 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-black text-slate-500">
                Ver historial de {releases.length - 1} liberaciones anteriores
              </summary>
              <div className="mt-3 space-y-2">
                {releases.slice(1).map((release) => (
                  <div
                    key={release.id}
                    className="flex items-start justify-between gap-4 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-950"
                  >
                    <div>
                      <strong className="text-slate-800 dark:text-slate-100">
                        v{release.version}
                      </strong>
                      <p className="mt-1 text-slate-500">
                        {release.notas || "Sin notas"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {formatDate(release.creada_en)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      {isCentral && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Planes comerciales
              </h2>
              <p className="text-xs text-slate-500">
                Condiciones disponibles para demos y mensualidades.
              </p>
            </div>
            <button
              onClick={() => {
                setPlanToEdit(null);
                setShowPlan(true);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Nuevo plan
            </button>
          </div>
          {plans.length === 0 ? (
            <div className={`${card} text-center text-sm text-slate-500`}>
              Crea un plan para registrar la primera instalación.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <article
                  key={plan.id}
                  className={`${card} ${plan.activo ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white">
                        {plan.nombre}
                      </h3>
                      <p className="text-[10px] font-black uppercase text-blue-500">
                        {plan.tipo} · {plan.activo ? "activo" : "inactivo"}
                      </p>
                    </div>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                      ${Number(plan.precio_mensual).toLocaleString("es-MX")} USD
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {plan.limite_clientes ?? "Ilimitados"} abonados ·{" "}
                    {plan.limite_routers ?? "Ilimitados"} routers
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {plan.duracion_dias
                      ? `${plan.duracion_dias} días + ${plan.dias_gracia} de gracia`
                      : "Sin vencimiento"}
                  </p>
                  <button
                    onClick={() => {
                      setPlanToEdit(plan);
                      setShowPlan(true);
                    }}
                    className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  >
                    Editar plan
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {isCentral && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Clientes e instalaciones
              </h2>
              <p className="text-xs text-slate-500">
                Administra datos, mensualidades, versiones y acceso de cada ISP.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  className={`${input} pl-10 sm:w-72`}
                  placeholder="Buscar ISP, dominio o correo"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                />
              </div>
              <select
                className={`${input} sm:w-40`}
                value={stateFilter}
                onChange={(event) =>
                  setStateFilter(event.target.value as typeof stateFilter)
                }
              >
                <option value="todas">Todas</option>
                <option value="activas">Activas</option>
                <option value="suspendidas">Suspendidas</option>
              </select>
            </div>
          </div>
          {installations.length === 0 ? (
            <div className={`${card} py-12 text-center text-sm text-slate-500`}>
              Crea la primera instalación para generar sus credenciales.
            </div>
          ) : visibleInstallations.length === 0 ? (
            <div className={`${card} py-10 text-center text-sm text-slate-500`}>
              No hay instalaciones que coincidan con el filtro.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleInstallations.map((item) => (
                <article key={item.id} className={card}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-black text-slate-900 dark:text-white">
                          {item.nombre_isp}
                        </h3>
                        <StatusBadge value={effectiveState(item)} />
                      </div>
                      <p className="truncate text-xs text-slate-500">
                        {item.dominio || "Instalación por IP"} ·{" "}
                        {item.contacto_email || "Sin correo"}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        title="Editar"
                        onClick={() => setEditInstallation(item)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        title="Eliminar definitivamente"
                        onClick={() => void removeInstallation(item)}
                        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950 sm:grid-cols-3">
                    <Metric
                      label="Plan"
                      value={item.plan_nombre || "Sin plan"}
                    />
                    <Metric
                      label="Vigencia"
                      value={
                        item.suscripcion_vence
                          ? formatDate(item.suscripcion_vence)
                          : "Permanente"
                      }
                    />
                    <Metric
                      label="Uso"
                      value={`${item.uso_clientes}/${item.limite_clientes ?? "∞"} clientes · ${item.uso_routers}/${item.limite_routers ?? "∞"} routers`}
                    />
                    <Metric
                      label="Versión instalada"
                      value={
                        item.version_actual
                          ? `v${item.version_actual}`
                          : "Sin reporte"
                      }
                    />
                    <Metric
                      label="Versión ofrecida"
                      value={
                        item.version_objetivo
                          ? `v${item.version_objetivo}`
                          : "Ninguna"
                      }
                    />
                    <Metric
                      label="Última conexión"
                      value={formatDate(item.ultima_conexion)}
                    />
                  </div>
                  {item.actualizacion_mensaje && (
                    <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-950">
                      Actualización: {item.actualizacion_mensaje} ·{" "}
                      {formatDate(item.actualizacion_fecha)}
                    </p>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <button
                      onClick={() => setPaymentInstallation(item)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white"
                    >
                      <BanknotesIcon className="h-4 w-4" /> Registrar pago
                    </button>
                    <button
                      onClick={() => setHistoryInstallation(item)}
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    >
                      Ver pagos
                    </button>
                    <button
                      disabled={item.estado !== "activa"}
                      onClick={() => void regenerateCommand(item)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-black text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                    >
                      <CommandLineIcon className="h-4 w-4" /> Instalar
                    </button>
                    <button
                      disabled={
                        !latestRelease ||
                        item.version_objetivo === latestRelease.version
                      }
                      onClick={() => void assignLatest(item)}
                      className="rounded-xl border border-blue-200 px-3 py-2.5 text-xs font-black text-blue-600 disabled:opacity-40 dark:border-blue-900"
                    >
                      Enviar{" "}
                      {latestRelease ? `v${latestRelease.version}` : "versión"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {showCreate && (
        <CreateDialog
          plans={plans}
          onClose={() => setShowCreate(false)}
          onCreated={(created) => {
            setInstallCommand(created);
            setShowCreate(false);
            void load();
          }}
        />
      )}
      {showPlan && (
        <PlanDialog
          plan={planToEdit}
          onClose={() => setShowPlan(false)}
          onSaved={() => {
            setShowPlan(false);
            void load();
          }}
        />
      )}
      {showRelease && (
        <ReleaseDialog
          onClose={() => setShowRelease(false)}
          onCreated={() => {
            setShowRelease(false);
            void load();
          }}
        />
      )}
      {installCommand && (
        <CredentialDialog
          installation={installCommand}
          onClose={() => setInstallCommand(null)}
        />
      )}
      {editInstallation && (
        <EditInstallationDialog
          installation={editInstallation}
          onClose={() => setEditInstallation(null)}
          onSaved={() => {
            setEditInstallation(null);
            void load();
          }}
        />
      )}
      {paymentInstallation && (
        <PaymentDialog
          installation={paymentInstallation}
          plans={plans}
          onClose={() => setPaymentInstallation(null)}
          onSaved={() => {
            setPaymentInstallation(null);
            void load();
          }}
        />
      )}
      {historyInstallation && (
        <PaymentsDialog
          installation={historyInstallation}
          plans={plans}
          onClose={() => setHistoryInstallation(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "emerald" | "rose" | "amber";
}) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    rose: "bg-rose-500/10 text-rose-600",
    amber: "bg-amber-500/10 text-amber-600",
  };
  return (
    <article className={card}>
      <div
        className={`inline-flex rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${colors[tone]}`}
      >
        {label}
      </div>
      <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </article>
  );
}

function EditInstallationDialog({
  installation,
  onClose,
  onSaved,
}: {
  installation: Installation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nombre_isp: installation.nombre_isp,
    dominio: installation.dominio || "",
    contacto_email: installation.contacto_email || "",
    estado: installation.estado === "activa" ? "activa" : "suspendida",
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await client.patch(`/control/instalaciones/${installation.id}`, {
        ...form,
        dominio: form.dominio.trim() || null,
        contacto_email: form.contacto_email.trim() || null,
      });
      toast.success("Instalación actualizada");
      onSaved();
    } catch {
      toast.error("No se pudo guardar la instalación");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal title="Editar instalación" onClose={onClose}>
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block text-xs font-bold text-slate-500">
          Nombre del ISP
          <input
            required
            className={`${input} mt-1`}
            value={form.nombre_isp}
            onChange={(event) =>
              setForm({ ...form, nombre_isp: event.target.value })
            }
          />
        </label>
        <label className="block text-xs font-bold text-slate-500">
          Dominio o IP
          <input
            className={`${input} mt-1`}
            placeholder="isp.com o http://1.2.3.4"
            value={form.dominio}
            onChange={(event) =>
              setForm({ ...form, dominio: event.target.value })
            }
          />
        </label>
        <label className="block text-xs font-bold text-slate-500">
          Correo de contacto
          <input
            type="email"
            className={`${input} mt-1`}
            value={form.contacto_email}
            onChange={(event) =>
              setForm({ ...form, contacto_email: event.target.value })
            }
          />
        </label>
        <label className="block text-xs font-bold text-slate-500">
          Estado
          <select
            className={`${input} mt-1`}
            value={form.estado}
            onChange={(event) =>
              setForm({ ...form, estado: event.target.value })
            }
          >
            <option value="activa">Activa</option>
            <option value="suspendida">Suspendida</option>
          </select>
        </label>
        <DialogActions
          saving={saving}
          onClose={onClose}
          label="Guardar cambios"
        />
      </form>
    </Modal>
  );
}

function PaymentDialog({
  installation,
  plans,
  onClose,
  onSaved,
}: {
  installation: Installation;
  plans: LicensePlan[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const defaultPlan =
    installation.plan_licencia_id?.toString() ||
    plans.find((plan) => plan.activo)?.id.toString() ||
    "";
  const [form, setForm] = useState({
    plan_licencia_id: defaultPlan,
    meses: "1",
    monto: "",
    referencia: "",
  });
  const [saving, setSaving] = useState(false);
  const selectedPlan = plans.find(
    (plan) => plan.id === Number(form.plan_licencia_id),
  );
  const suggestedAmount =
    Number(selectedPlan?.precio_mensual || 0) * Number(form.meses || 0);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await client.post(`/control/instalaciones/${installation.id}/renovar`, {
        plan_licencia_id: Number(form.plan_licencia_id),
        meses: Number(form.meses),
        monto: form.monto === "" ? undefined : Number(form.monto),
        referencia: form.referencia.trim() || null,
      });
      toast.success("Pago registrado e instalación activada");
      onSaved();
    } catch {
      toast.error("No se pudo registrar el pago");
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={`Registrar pago · ${installation.nombre_isp}`}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <label className="block text-xs font-bold text-slate-500">
          Plan
          <select
            required
            className={`${input} mt-1`}
            value={form.plan_licencia_id}
            onChange={(event) =>
              setForm({ ...form, plan_licencia_id: event.target.value })
            }
          >
            <option value="">Selecciona un plan</option>
            {plans
              .filter((plan) => plan.activo)
              .map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.nombre} · $
                  {Number(plan.precio_mensual).toLocaleString("es-MX")} USD/mes
                </option>
              ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-500">
            Meses
            <input
              required
              type="number"
              min="1"
              max="36"
              className={`${input} mt-1`}
              value={form.meses}
              onChange={(event) =>
                setForm({ ...form, meses: event.target.value })
              }
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Monto recibido (USD)
            <input
              type="number"
              min="0"
              step="0.01"
              className={`${input} mt-1`}
              placeholder={String(suggestedAmount)}
              value={form.monto}
              onChange={(event) =>
                setForm({ ...form, monto: event.target.value })
              }
            />
          </label>
        </div>
        <label className="block text-xs font-bold text-slate-500">
          Referencia del pago
          <input
            className={`${input} mt-1`}
            value={form.referencia}
            onChange={(event) =>
              setForm({ ...form, referencia: event.target.value })
            }
          />
        </label>
        <div className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
          Nueva vigencia: se sumarán {form.meses || 0} mes(es) y la instalación
          quedará activa.
        </div>
        <DialogActions
          saving={saving}
          onClose={onClose}
          label="Registrar y activar"
        />
      </form>
    </Modal>
  );
}

function PaymentsDialog({
  installation,
  plans,
  onClose,
}: {
  installation: Installation;
  plans: LicensePlan[];
  onClose: () => void;
}) {
  const [payments, setPayments] = useState<LicensePayment[] | null>(null);
  useEffect(() => {
    client
      .get<LicensePayment[]>(`/control/instalaciones/${installation.id}/pagos`)
      .then(({ data }) => setPayments(data))
      .catch(() => {
        toast.error("No se pudo cargar el historial");
        setPayments([]);
      });
  }, [installation.id]);
  const planName = (id: number | null) =>
    plans.find((plan) => plan.id === id)?.nombre || "Plan eliminado";
  return (
    <Modal title={`Pagos · ${installation.nombre_isp}`} onClose={onClose} wide>
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-950">
        <Metric
          label="Plan actual"
          value={installation.plan_nombre || "Sin plan"}
        />
        <Metric
          label="Vigencia"
          value={
            installation.suscripcion_vence
              ? formatDate(installation.suscripcion_vence)
              : "Permanente"
          }
        />
      </div>
      {payments === null ? (
        <p className="py-10 text-center text-sm text-slate-500">
          Cargando pagos…
        </p>
      ) : payments.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          No hay mensualidades registradas.
        </p>
      ) : (
        <div className="max-h-[55vh] overflow-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Meses</th>
                <th className="p-3">Monto</th>
                <th className="p-3">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="border-t border-slate-100 dark:border-slate-800"
                >
                  <td className="p-3">{formatDate(payment.registrado_en)}</td>
                  <td className="p-3 font-bold">
                    {planName(payment.plan_licencia_id)}
                  </td>
                  <td className="p-3">{payment.meses}</td>
                  <td className="p-3 font-black">
                    ${Number(payment.monto).toLocaleString("es-MX")}
                  </td>
                  <td className="p-3 text-slate-500">
                    {payment.referencia || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center">
      <div
        className={`max-h-[95vh] w-full overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 ${wide ? "max-w-3xl" : "max-w-lg"}`}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DialogActions({
  saving,
  onClose,
  label,
}: {
  saving: boolean;
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black dark:border-slate-700"
      >
        Cancelar
      </button>
      <button
        disabled={saving}
        className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white disabled:opacity-50"
      >
        {saving ? "Guardando…" : label}
      </button>
    </div>
  );
}

function ReleaseDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    version: "",
    backend_commit: "",
    frontend_commit: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await client.post("/control/versiones", {
        ...form,
        notas: form.notas || null,
      });
      toast.success("Versión publicada");
      onCreated();
    } catch {
      toast.error("No se pudo publicar; verifica versión y commits");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-xl space-y-4 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          Publicar versión segura
        </h2>
        <p className="text-xs text-slate-500">
          Los dos commits deben ser SHA completos de 40 caracteres. Cada VPS
          verificará la firma antes de instalarlos.
        </p>
        {(["version", "backend_commit", "frontend_commit"] as const).map(
          (field) => (
            <label
              key={field}
              className="block text-xs font-bold text-slate-500"
            >
              {field === "version"
                ? "Versión"
                : field === "backend_commit"
                  ? "Commit backend"
                  : "Commit frontend"}
              <input
                required
                className={`${input} mt-1 font-mono`}
                placeholder={field === "version" ? "2.5.0" : "40 caracteres"}
                value={form[field]}
                onChange={(e) =>
                  setForm({ ...form, [field]: e.target.value.trim() })
                }
              />
            </label>
          ),
        )}
        <label className="block text-xs font-bold text-slate-500">
          Notas
          <textarea
            className={`${input} mt-1`}
            rows={3}
            value={form.notas}
            onChange={(e) => setForm({ ...form, notas: e.target.value })}
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black dark:border-slate-700"
          >
            Cancelar
          </button>
          <button
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white"
          >
            {saving ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PlanDialog({
  plan,
  onClose,
  onSaved,
}: {
  plan: LicensePlan | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    codigo: plan?.codigo || "",
    nombre: plan?.nombre || "",
    tipo: plan?.tipo || "mensual",
    precio_mensual: String(plan?.precio_mensual ?? 0),
    duracion_dias: String(plan?.duracion_dias ?? 30),
    dias_gracia: String(plan?.dias_gracia ?? 3),
    limite_clientes: plan?.limite_clientes?.toString() || (plan ? "" : "200"),
    limite_routers: plan?.limite_routers?.toString() || "",
    activo: plan?.activo ?? true,
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const values = {
        codigo: form.codigo.trim().toLowerCase(),
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        precio_mensual: Number(form.precio_mensual),
        duracion_dias:
          form.tipo === "permanente" ? null : Number(form.duracion_dias),
        dias_gracia: Number(form.dias_gracia),
        limite_clientes: form.limite_clientes
          ? Number(form.limite_clientes)
          : null,
        limite_routers: form.limite_routers
          ? Number(form.limite_routers)
          : null,
        activo: form.activo,
      };
      if (plan) await client.patch(`/control/planes/${plan.id}`, values);
      else await client.post("/control/planes", values);
      toast.success(plan ? "Plan actualizado" : "Plan creado");
      onSaved();
    } catch {
      toast.error(
        plan ? "No se pudo actualizar el plan" : "No se pudo crear el plan",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={plan ? "Editar plan comercial" : "Nuevo plan comercial"}
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-500">
            Código
            <input
              required
              disabled={Boolean(plan)}
              pattern="[a-z0-9_-]{2,50}"
              className={`${input} mt-1 disabled:opacity-60`}
              placeholder="basico_200"
              value={form.codigo}
              onChange={(event) =>
                setForm({ ...form, codigo: event.target.value })
              }
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Nombre
            <input
              required
              className={`${input} mt-1`}
              placeholder="Básico 200"
              value={form.nombre}
              onChange={(event) =>
                setForm({ ...form, nombre: event.target.value })
              }
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Tipo
            <select
              disabled={Boolean(plan)}
              className={`${input} mt-1 disabled:opacity-60`}
              value={form.tipo}
              onChange={(event) =>
                setForm({
                  ...form,
                  tipo: event.target.value as LicensePlan["tipo"],
                })
              }
            >
              <option value="demo">Demo</option>
              <option value="mensual">Mensual</option>
              <option value="permanente">Permanente</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-500">
            Precio mensual (USD)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              className={`${input} mt-1`}
              value={form.precio_mensual}
              onChange={(event) =>
                setForm({ ...form, precio_mensual: event.target.value })
              }
            />
          </label>
          {form.tipo !== "permanente" && (
            <label className="text-xs font-bold text-slate-500">
              Duración en días
              <input
                required
                type="number"
                min="1"
                className={`${input} mt-1`}
                value={form.duracion_dias}
                onChange={(event) =>
                  setForm({ ...form, duracion_dias: event.target.value })
                }
              />
            </label>
          )}
          <label className="text-xs font-bold text-slate-500">
            Días de gracia
            <input
              required
              type="number"
              min="0"
              max="60"
              className={`${input} mt-1`}
              value={form.dias_gracia}
              onChange={(event) =>
                setForm({ ...form, dias_gracia: event.target.value })
              }
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Máximo de abonados
            <input
              type="number"
              min="1"
              className={`${input} mt-1`}
              placeholder="Vacío = ilimitado"
              value={form.limite_clientes}
              onChange={(event) =>
                setForm({ ...form, limite_clientes: event.target.value })
              }
            />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Máximo de routers
            <input
              type="number"
              min="1"
              className={`${input} mt-1`}
              placeholder="Vacío = ilimitado"
              value={form.limite_routers}
              onChange={(event) =>
                setForm({ ...form, limite_routers: event.target.value })
              }
            />
          </label>
          {plan && (
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(event) =>
                  setForm({ ...form, activo: event.target.checked })
                }
              />{" "}
              Disponible para nuevas ventas
            </label>
          )}
        </div>
        <DialogActions
          saving={saving}
          onClose={onClose}
          label={plan ? "Guardar cambios" : "Crear plan"}
        />
      </form>
    </Modal>
  );
}

function CreateDialog({
  plans,
  onClose,
  onCreated,
}: {
  plans: LicensePlan[];
  onClose: () => void;
  onCreated: (value: InstallationCreated) => void;
}) {
  const [form, setForm] = useState({
    nombre_isp: "",
    dominio: "",
    contacto_email: "",
    plan_licencia_id:
      plans.find((plan) => plan.codigo === "demo")?.id.toString() || "",
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await client.post<InstallationCreated>(
        "/control/instalaciones",
        {
          ...form,
          dominio: form.dominio.trim() || null,
          plan_licencia_id: Number(form.plan_licencia_id),
        },
      );
      onCreated(data);
    } catch {
      toast.error("No se pudo crear la instalación");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-lg space-y-4 rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
      >
        <h2 className="text-xl font-black text-slate-900 dark:text-white">
          Nueva instalación
        </h2>
        <label className="block text-xs font-bold text-slate-500">
          Nombre del ISP
          <input
            required
            className={`${input} mt-1`}
            value={form.nombre_isp}
            onChange={(e) => setForm({ ...form, nombre_isp: e.target.value })}
          />
        </label>
        <label className="block text-xs font-bold text-slate-500">
          Plan
          <select
            required
            className={`${input} mt-1`}
            value={form.plan_licencia_id}
            onChange={(e) =>
              setForm({ ...form, plan_licencia_id: e.target.value })
            }
          >
            <option value="">Selecciona un plan</option>
            {plans
              .filter((plan) => plan.activo)
              .map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.nombre} · {plan.limite_clientes ?? "∞"} abonados ·{" "}
                  {plan.limite_routers ?? "∞"} routers
                </option>
              ))}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-500">
          Dominio (opcional para piloto por IP)
          <input
            className={`${input} mt-1`}
            placeholder="isp.com"
            value={form.dominio}
            onChange={(e) => setForm({ ...form, dominio: e.target.value })}
          />
        </label>
        <label className="block text-xs font-bold text-slate-500">
          Correo de contacto
          <input
            required
            type="email"
            className={`${input} mt-1`}
            value={form.contacto_email}
            onChange={(e) =>
              setForm({ ...form, contacto_email: e.target.value })
            }
          />
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-black text-slate-600 dark:border-slate-700"
          >
            Cancelar
          </button>
          <button
            disabled={saving}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-black text-white"
          >
            {saving ? "Creando…" : "Crear licencia"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CredentialDialog({
  installation,
  onClose,
}: {
  installation: InstallCommand;
  onClose: () => void;
}) {
  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copiado");
  };
  const domain = installation.dominio
    ?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const domainArgs = domain
    ? ` --domain ${domain} --email ${installation.contacto_email}`
    : "";
  const command = `curl -fsSL https://fdezpay.com/api/control/installer | sudo bash -s --${domainArgs} --bootstrap-token ${installation.token_instalacion}`;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
      <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <CheckCircleIcon className="h-12 w-12 text-emerald-500" />
        <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-white">
          Instalación preparada
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Copia este comando y ejecútalo como root en una VPS Ubuntu nueva. El
          token vence el {formatDate(installation.token_expira)} y funciona una
          sola vez.
        </p>
        <Credential
          label="COMANDO DE INSTALACIÓN AUTOMÁTICA"
          value={command}
          onCopy={copy}
        />
        {"licencia" in installation && (
          <details className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <summary className="cursor-pointer text-xs font-black text-slate-600 dark:text-slate-300">
              Configuración manual
            </summary>
            <Credential
              label="FDEZNET_INSTALLATION_ID"
              value={installation.instalacion_id}
              onCopy={copy}
            />
            <Credential
              label="FDEZNET_LICENSE_KEY"
              value={installation.licencia}
              onCopy={copy}
            />
          </details>
        )}
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-blue-600 py-3 text-sm font-black text-white"
        >
          Ya guardé el comando
        </button>
      </div>
    </div>
  );
}

function Credential({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (value: string) => Promise<void>;
}) {
  return (
    <div className="mt-4">
      <span className="text-[10px] font-black text-slate-400">{label}</span>
      <button
        onClick={() => void onCopy(value)}
        className="mt-1 flex w-full items-center gap-2 rounded-xl bg-slate-100 p-3 text-left dark:bg-slate-950"
      >
        <code className="min-w-0 flex-1 break-all text-xs text-slate-700 dark:text-slate-200">
          {value}
        </code>
        <ClipboardDocumentIcon className="h-5 w-5 shrink-0 text-blue-500" />
      </button>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-200">
        {value}
      </p>
    </div>
  );
}
function StatusBadge({ value }: { value: string }) {
  const color =
    value === "activa" || value === "servidor_central"
      ? "bg-emerald-500/10 text-emerald-600"
      : value === "sin_configurar" || value === "gracia"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-rose-500/10 text-rose-600";
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${color}`}
    >
      {value.replace("_", " ")}
    </span>
  );
}
function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "Nunca";
}
