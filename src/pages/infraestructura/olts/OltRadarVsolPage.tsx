import { TouchEvent, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import client from "@/api/axios";
import { toast } from "react-hot-toast";
import {
  getClientesForOltSearch,
  getOlts,
  getOltMonitoreoApi,
  getOltMonitoreoSnmp,
  getOltOnusApi,
} from "./api";
import {
  getPonFromOnuId,
  getPowerLabel,
  getPowerLevel,
  isOnuOnline,
  normalizeSerial,
  parsePower,
  type OltClientSearchItem,
  type OltConfigItem,
  type OltMonitoreoApi,
  type OltMonitoreoCliente,
  type OltOnuApiItem,
  type OltSavePayload,
} from "./types";
import "./styles.css";

type StatusFilter = "todos" | "online" | "offline" | "critica" | "regular" | "registradas" | "no_registradas";

interface RadarRow {
  serial: string;
  onu: OltOnuApiItem;
  owner?: OltMonitoreoCliente;
  client?: OltClientSearchItem;
}

function getErrorMessage(error: unknown, fallback = "Error inesperado"): string {
  if (axios.isAxiosError<{ detail?: unknown; mensaje?: unknown }>(error)) {
    const detail = error.response?.data?.detail;
    const message = error.response?.data?.mensaje;

    if (typeof detail === "string") return detail;
    if (typeof message === "string") return message;
    if (error.message) return error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

function getOwnerId(owner?: OltMonitoreoCliente): number | undefined {
  const raw = owner?.id_cliente ?? owner?.cliente_id ?? owner?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function StatusPill({ onu }: { onu: OltOnuApiItem }) {
  const online = isOnuOnline(onu);
  return (
    <span className={`olt-pill ${online ? "olt-pill--online" : "olt-pill--offline"}`}>
      {online ? "● Online" : "● Offline"}
    </span>
  );
}

function PowerPill({ rx }: { rx?: string }) {
  const level = getPowerLevel(rx);
  const label = getPowerLabel(rx);
  const className =
    level === "excellent"
      ? "olt-pill--online"
      : level === "warning"
      ? "olt-pill--warning"
      : level === "critical"
      ? "olt-pill--critical"
      : "olt-pill--offline";

  return <span className={`olt-pill ${className}`}>{label}</span>;
}

function SummaryCard({
  label,
  value,
  icon,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: "olt" | "online" | "offline" | "user" | "unknown";
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`olt-summary-card ${active ? "olt-summary-card--active" : ""}`}
      onClick={onClick}
      title={`Filtrar: ${label}`}
    >
      <div className={`olt-summary-icon olt-summary-icon--${icon}`} />
      <div>
        <div className="olt-summary-card__value">{value}</div>
        <div className="olt-summary-card__label">{label}</div>
      </div>
    </button>
  );
}

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="olt-detail-field">
      <span>{label}</span>
      <strong>{value ?? "N/A"}</strong>
    </div>
  );
}

function QualityMeter({ value, type }: { value?: string; type: "rx" | "tx" }) {
  const power = parsePower(value);
  const level = type === "rx" ? getPowerLevel(value) : power === null ? "offline" : "excellent";
  const label = type === "rx" ? getPowerLabel(value) : power === null ? "Sin señal" : "Normal";

  let percent = 0;
  if (power !== null) {
    if (type === "rx") percent = Math.max(0, Math.min(100, ((power + 30) / 22) * 100));
    else percent = Math.max(0, Math.min(100, ((power + 2) / 9) * 100));
  }

  return (
    <div className="olt-meter-card">
      <div className="olt-meter-card__head">
        <div>
          <span>{type.toUpperCase()}</span>
          <strong>{power !== null ? `${value} dBm` : "N/A"}</strong>
        </div>
        <PowerPill rx={type === "rx" ? value : power !== null ? "-15" : undefined} />
      </div>

      <div className="olt-meter">
        <div className={`olt-meter__bar olt-meter__bar--${level}`} style={{ width: `${percent}%` }} />
      </div>

      <div className="olt-meter-card__foot">
        <span>{label}</span>
        <span>{type === "rx" ? "Ideal: -8 a -24 dBm" : "Normal: -2 a 7 dBm"}</span>
      </div>
    </div>
  );
}

function TopologyMini({ row, oltName }: { row: RadarRow; oltName?: string }) {
  const online = isOnuOnline(row.onu);

  return (
    <div className="olt-topology-mini">
      <div className="olt-device">
        <div className="olt-device__icon olt-device__icon--olt">
          <span /><span /><span /><span />
        </div>
        <strong>OLT</strong>
        <small>{oltName || "OLT Principal"}</small>
      </div>

      <div className="olt-fiber-line">
        <span className={online ? "olt-fiber-line__dot online" : "olt-fiber-line__dot offline"} />
        <div />
        <span className={online ? "olt-fiber-line__dot online" : "olt-fiber-line__dot offline"} />
        <small>{row.onu.onu_id || "Sin PON"}</small>
      </div>

      <div className="olt-device">
        <div className={`olt-device__icon olt-device__icon--onu ${online ? "online" : "offline"}`}>
          <span /><i />
        </div>
        <strong>{online ? "Online" : "Offline"}</strong>
        <small>{row.onu.modelo || "ONU"}</small>
      </div>
    </div>
  );
}

function BottomSheetDetail({
  row,
  oltName,
  onClose,
}: {
  row: RadarRow;
  oltName?: string;
  onClose: () => void;
}) {
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const closeOnSwipe = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartY === null) return;

    const currentY = event.changedTouches[0]?.clientY || 0;
    const delta = currentY - touchStartY;

    if (delta > 80) {
      onClose();
    }

    setTouchStartY(null);
  };

  return (
    <div className="olt-sheet-backdrop" role="presentation" onClick={onClose}>
      <section
        className="olt-bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de ONU"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="olt-sheet-drag-zone"
          onTouchStart={(event) => setTouchStartY(event.touches[0]?.clientY || null)}
          onTouchEnd={closeOnSwipe}
        >
          <div className="olt-sheet-grabber" />
        </div>

        <div className="olt-sheet-header">
          <div>
            <h3>
              ONU {row.onu.onu_id || "N/A"} <span>•</span> {row.serial}
            </h3>
            <p>{row.client?.nombre || row.owner?.nombre || "No registrado"}</p>
          </div>

          <button className="olt-btn olt-btn--light" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="olt-sheet-scroll">
          <div className="olt-sheet-status-row">
            <StatusPill onu={row.onu} />
            <PowerPill rx={row.onu.rx_power} />
          </div>

          <h4 className="olt-section-title">Topología</h4>
          <TopologyMini row={row} oltName={oltName} />

          <h4 className="olt-section-title">Óptico</h4>
          <div className="olt-optical-grid">
            <QualityMeter type="rx" value={row.onu.rx_power} />
            <QualityMeter type="tx" value={row.onu.tx_power} />
          </div>

          <div className="olt-sheet-info-grid">
            <DetailField label="Cliente" value={row.client?.nombre || row.owner?.nombre || "No registrado"} />
            <DetailField label="Cédula" value={row.client?.cedula || "N/A"} />
            <DetailField label="Teléfono" value={row.client?.telefono || "N/A"} />
            <DetailField label="IP" value={row.client?.ip_asignada || "N/A"} />

            <DetailField label="Serial" value={row.serial} />
            <DetailField label="PON / ONU" value={row.onu.onu_id || "N/A"} />
            <DetailField label="Modelo" value={row.onu.modelo || "N/A"} />
            <DetailField label="Perfil" value={row.onu.profile || "N/A"} />

            <DetailField label="Admin State" value={row.onu.admin_state || "N/A"} />
            <DetailField label="OMCC" value={row.onu.omcc_state || "N/A"} />
            <DetailField label="Phase" value={row.onu.phase_state || "N/A"} />
            <DetailField label="Uptime" value={row.onu.alive_time || "N/A"} />

            <DetailField label="Último registro" value={row.onu.last_register_time || "N/A"} />
            <DetailField label="Última baja" value={row.onu.last_deregister_time || "N/A"} />
            <DetailField label="Motivo baja" value={row.onu.last_deregister_reason || "N/A"} />
          </div>

          {row.onu.recomendacion && (
            <div className="olt-recommendation">
              <strong>Recomendación:</strong> {row.onu.recomendacion}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}


type OltFormData = {
  nombre: string;
  ip: string;
  comunidad: string;
  tecnologia: string;
  modelo: string;
  tipo_integracion: string;
  api_enabled: boolean;
  api_protocol: string;
  api_port: number;
  api_user: string;
  api_password: string;
  api_verify_ssl: boolean;
};

function OltFormModal({
  olt,
  onClose,
  onSuccess,
}: {
  olt: OltConfigItem | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [testingApi, setTestingApi] = useState(false);

  const [formData, setFormData] = useState<OltFormData>({
    nombre: olt?.nombre || "",
    ip: olt?.ip || "",
    comunidad: olt?.comunidad || "public",
    tecnologia: olt?.tecnologia || "GPON",
    modelo: olt?.modelo || "V-SOL",
    tipo_integracion: olt?.tipo_integracion || "snmp",
    api_enabled: Boolean(olt?.api_enabled || olt?.tipo_integracion === "vsol_api"),
    api_protocol: olt?.api_protocol || "https",
    api_port: Number(olt?.api_port || ((olt?.api_protocol || "https") === "http" ? 80 : 443)),
    api_user: olt?.api_user || "",
    api_password: "",
    api_verify_ssl: Boolean(olt?.api_verify_ssl),
  });

  const usaApi =
    formData.tipo_integracion === "vsol_api" ||
    formData.tipo_integracion === "auto" ||
    formData.api_enabled;

  const setField = <K extends keyof OltFormData>(field: K, value: OltFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const payload: OltSavePayload = {
        nombre: formData.nombre.trim(),
        ip: formData.ip.trim(),
        comunidad: formData.comunidad.trim() || "public",
        tecnologia: formData.tecnologia,
        modelo: formData.modelo.trim() || null,
        tipo_integracion: formData.tipo_integracion,
        api_enabled: Boolean(formData.api_enabled || formData.tipo_integracion === "vsol_api"),
        api_protocol: formData.api_protocol,
        api_port: Number(formData.api_port) || (formData.api_protocol === "http" ? 80 : 443),
        api_user: formData.api_user.trim() || null,
        api_verify_ssl: Boolean(formData.api_verify_ssl),
      };

      if (payload.tipo_integracion === "snmp") {
        payload.api_enabled = false;
      }

      const passwordLimpio = String(formData.api_password || "").trim();

      // Al editar: si password queda vacío, NO se manda para no borrar el password guardado.
      if (passwordLimpio) {
        payload.api_password = passwordLimpio;
      }

      if (olt?.id) {
        await client.put(`/olts/${olt.id}`, payload);
      } else {
        await client.post("/olts/", payload);
      }

      toast.success("OLT guardada correctamente");
      await onSuccess();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleTestApi = async () => {
    if (!olt?.id) {
      toast.error("Primero guarda la OLT para poder probar la API.");
      return;
    }

    setTestingApi(true);

    try {
      const payload = await getOltOnusApi(olt.id);
      const total = payload.total_onus ?? payload.onus?.length ?? 0;

      toast.success(`API VSOL conectada correctamente (${total} ONUs detectadas)`);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setTestingApi(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-700/50 bg-[#0b0c10] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500";
  const labelCls = "block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-[#12131a] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#16171d] p-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              📡 {olt?.id ? "Editar OLT" : "Nueva OLT"}
            </h3>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Configuración SNMP y VSOL API JSON.
            </p>
          </div>

          <button className="olt-btn olt-btn--light" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] space-y-4 overflow-y-auto p-5">
          <div>
            <label className={labelCls}>Nombre</label>
            <input
              className={inputCls}
              value={formData.nombre}
              onChange={(event) => setField("nombre", event.target.value)}
              placeholder="Ej: Villa de Guadalupe"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>IP Gestión</label>
              <input
                className={inputCls}
                value={formData.ip}
                onChange={(event) => setField("ip", event.target.value)}
                placeholder="Ej: 11.11.11.2"
                required
              />
            </div>

            <div>
              <label className={labelCls}>SNMP Community</label>
              <input
                className={inputCls}
                value={formData.comunidad}
                onChange={(event) => setField("comunidad", event.target.value)}
                placeholder="public"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelCls}>Tecnología</label>
              <select
                className={inputCls}
                value={formData.tecnologia}
                onChange={(event) => setField("tecnologia", event.target.value)}
              >
                <option value="GPON">GPON</option>
                <option value="EPON">EPON</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Modelo</label>
              <input
                className={inputCls}
                value={formData.modelo}
                onChange={(event) => setField("modelo", event.target.value)}
                placeholder="Ej: V1600GS"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelCls}>Tipo de integración</label>
                <select
                  className={inputCls}
                  value={formData.tipo_integracion}
                  onChange={(event) => {
                    const value = event.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      tipo_integracion: value,
                      api_enabled: value === "vsol_api" || value === "auto" ? true : prev.api_enabled,
                    }));
                  }}
                >
                  <option value="snmp">SNMP</option>
                  <option value="vsol_api">VSOL API</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-xs font-black text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.api_enabled}
                    onChange={(event) => setField("api_enabled", event.target.checked)}
                  />
                  API VSOL habilitada
                </label>
              </div>
            </div>

            {usaApi && (
              <div className="mt-4 space-y-4 border-t border-violet-500/20 pt-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Protocolo API</label>
                    <select
                      className={inputCls}
                      value={formData.api_protocol}
                      onChange={(event) => {
                        const protocol = event.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          api_protocol: protocol,
                          api_port: protocol === "http" ? 80 : 443,
                        }));
                      }}
                    >
                      <option value="https">HTTPS</option>
                      <option value="http">HTTP</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>Puerto API</label>
                    <input
                      type="number"
                      className={inputCls}
                      value={formData.api_port}
                      min={1}
                      max={65535}
                      onChange={(event) => setField("api_port", Number(event.target.value))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Usuario API</label>
                    <input
                      className={inputCls}
                      value={formData.api_user}
                      onChange={(event) => setField("api_user", event.target.value)}
                      placeholder="Usuario web OLT"
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Password API</label>
                    <input
                      type="password"
                      className={inputCls}
                      value={formData.api_password}
                      onChange={(event) => setField("api_password", event.target.value)}
                      placeholder={olt?.id ? "Vacío = mantener actual" : "Password API"}
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 text-xs font-bold text-slate-400">
                  <input
                    type="checkbox"
                    checked={formData.api_verify_ssl}
                    onChange={(event) => setField("api_verify_ssl", event.target.checked)}
                  />
                  Verificar SSL. Déjalo apagado si la OLT usa certificado propio o inválido.
                </label>

                <button
                  className="olt-btn olt-btn--light w-full"
                  type="button"
                  onClick={handleTestApi}
                  disabled={!olt?.id || testingApi}
                >
                  {testingApi ? "Probando API..." : "Probar conexión VSOL API"}
                </button>

                <p className="text-[11px] font-semibold text-slate-500">
                  {olt?.id
                    ? "Al editar, deja el password vacío para conservar el password API actual."
                    : "Para probar la API primero guarda la OLT."}
                </p>
              </div>
            )}
          </div>

          <button className="olt-btn w-full" type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Guardar OLT"}
          </button>
        </form>
      </div>
    </div>
  );
}


function matchesStatus(row: RadarRow, filter: StatusFilter): boolean {
  if (filter === "todos") return true;
  if (filter === "online") return isOnuOnline(row.onu);
  if (filter === "offline") return !isOnuOnline(row.onu);
  if (filter === "registradas") return Boolean(row.owner);
  if (filter === "no_registradas") return !row.owner;

  const level = getPowerLevel(row.onu.rx_power);
  if (filter === "critica") return level === "critical";
  if (filter === "regular") return level === "warning";

  return true;
}

export default function OltRadarVsolPage() {
  const [olts, setOlts] = useState<OltConfigItem[]>([]);
  const [oltId, setOltId] = useState<number>(1);
  const [monitoreo, setMonitoreo] = useState<OltMonitoreoApi | null>(null);
  const [clientes, setClientes] = useState<OltClientSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [pon, setPon] = useState("todos");
  const [status, setStatus] = useState<StatusFilter>("todos");
  const [selected, setSelected] = useState<RadarRow | null>(null);
  const [showOltModal, setShowOltModal] = useState(false);
  const [editingOlt, setEditingOlt] = useState<OltConfigItem | null>(null);
  const [deletingOlt, setDeletingOlt] = useState(false);

  const loadOlts = useCallback(async () => {
    try {
      const items = await getOlts();
      setOlts(items);

      setOltId((current) => {
        if (items.some((olt) => Number(olt.id) === Number(current))) return current;

        const firstApi =
          items.find((olt) => olt.api_enabled || olt.tipo_integracion === "vsol_api") ||
          items[0];

        return firstApi?.id ? Number(firstApi.id) : 1;
      });
    } catch {
      setOlts([]);
    }
  }, []);

  const load = useCallback(async () => {
    if (!oltId) return;

    const oltActual = olts.find((olt) => Number(olt.id) === Number(oltId));

    // Si ya cargamos catálogo de OLTs y no existe la seleccionada, no consultamos.
    if (olts.length > 0 && !oltActual) return;

    const tipoIntegracion = String(oltActual?.tipo_integracion || "vsol_api").toLowerCase();
    const usarApiVsol =
      Boolean(oltActual?.api_enabled) ||
      tipoIntegracion === "vsol_api" ||
      tipoIntegracion === "auto";

    setLoading(true);
    setError(null);

    try {
      const [monitorData, clientData] = await Promise.all([
        usarApiVsol ? getOltMonitoreoApi(oltId) : getOltMonitoreoSnmp(oltId),
        getClientesForOltSearch(),
      ]);

      setMonitoreo(monitorData);
      setClientes(clientData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo consultar la OLT.");
    } finally {
      setLoading(false);
    }
  }, [oltId, olts]);

  useEffect(() => { loadOlts(); }, [loadOlts]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (selected) document.body.classList.add("olt-sheet-open");
    else document.body.classList.remove("olt-sheet-open");

    return () => document.body.classList.remove("olt-sheet-open");
  }, [selected]);

  const selectedOlt = useMemo(
    () => olts.find((olt) => Number(olt.id) === Number(oltId)),
    [oltId, olts]
  );

  const handleOpenNewOlt = () => {
    setEditingOlt(null);
    setShowOltModal(true);
  };

  const handleOpenEditOlt = () => {
    if (!selectedOlt) {
      toast.error("Selecciona una OLT primero.");
      return;
    }

    setEditingOlt(selectedOlt);
    setShowOltModal(true);
  };

  const handleOltSaved = async () => {
    setShowOltModal(false);
    setEditingOlt(null);
    await loadOlts();
    await load();
  };

  const handleDeleteOlt = async () => {
    if (!selectedOlt) {
      toast.error("Selecciona una OLT primero.");
      return;
    }

    const ok = window.confirm(
      `¿Eliminar la OLT "${selectedOlt.nombre || selectedOlt.ip || selectedOlt.id}"?\n\n` +
      "Si tiene clientes o cajas NAP vinculadas, el backend puede bloquear la eliminación para proteger tus datos."
    );

    if (!ok) return;

    setDeletingOlt(true);

    try {
      await client.delete(`/olts/${selectedOlt.id}`);
      toast.success("OLT eliminada correctamente");

      setMonitoreo(null);
      setSelected(null);
      await loadOlts();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Error al eliminar OLT"));
    } finally {
      setDeletingOlt(false);
    }
  };

  const clientById = useMemo(() => {
    const map = new Map<number, OltClientSearchItem>();
    clientes.forEach((cliente) => map.set(Number(cliente.id), cliente));
    return map;
  }, [clientes]);

  const ownerBySerial = useMemo(() => {
    const map = new Map<string, OltMonitoreoCliente>();
    const allOwners = [...(monitoreo?.clientes_activos || []), ...(monitoreo?.clientes_caidos || [])];

    allOwners.forEach((owner) => {
      const serial = normalizeSerial(owner.identificador || owner.serial);
      if (serial) map.set(serial, owner);
    });

    return map;
  }, [monitoreo]);

  const rows = useMemo<RadarRow[]>(() => {
    const onus = monitoreo?.onus_api || [];

    return onus.map((onu) => {
      const serial = normalizeSerial(onu.identificador || onu.serial);
      const owner = ownerBySerial.get(serial);
      const ownerId = getOwnerId(owner);
      const client = ownerId ? clientById.get(ownerId) : undefined;

      return { serial, onu, owner, client };
    });
  }, [clientById, monitoreo?.onus_api, ownerBySerial]);

  const pons = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      const p = getPonFromOnuId(row.onu.onu_id);
      if (p !== "N/A") values.add(p);
    });
    return Array.from(values).sort((a, b) => Number(a) - Number(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const currentPon = getPonFromOnuId(row.onu.onu_id);
      if (pon !== "todos" && currentPon !== pon) return false;
      if (!matchesStatus(row, status)) return false;
      if (!q) return true;

      const haystack = [
        row.serial,
        row.onu.onu_id,
        row.onu.modelo,
        row.onu.rx_power,
        row.onu.tx_power,
        row.owner?.nombre,
        row.owner?.estado_fdeznet,
        row.client?.nombre,
        row.client?.cedula,
        row.client?.telefono,
        row.client?.ip_asignada,
        row.client?.user_pppoe,
        row.client?.direccion,
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(q);
    });
  }, [pon, rows, search, status]);

  const stats = useMemo(() => {
    const online = rows.filter((row) => isOnuOnline(row.onu)).length;
    const offline = rows.length - online;
    const registered = rows.filter((row) => row.owner).length;
    const unregistered = rows.length - registered;

    return { total: rows.length, online, offline, registered, unregistered };
  }, [rows]);

  return (
    <div className="olt-page">
      <div className="olt-page__header">
        <div>
          <h1 className="olt-page__title">Radar OLT / Fibra</h1>
          <p className="olt-page__subtitle">ONU online/offline, potencia, PON y cliente propietario.</p>
        </div>
      </div>

      <section className="olt-hero-card">
        <div className="olt-hero-actions">
          <select className="olt-select" value={oltId} onChange={(event) => setOltId(Number(event.target.value))}>
            {olts.length === 0 && <option value={1}>OLT ID 1</option>}
            {olts.map((olt) => (
              <option key={olt.id} value={olt.id}>
                {olt.nombre || `OLT ${olt.id}`} {olt.ip ? `· ${olt.ip}` : ""}
              </option>
            ))}
          </select>

          <button className="olt-btn" type="button" onClick={load} disabled={loading}>
            {loading ? "Actualizando..." : "⟳ Actualizar"}
          </button>

          <button className="olt-btn olt-btn--light" type="button" onClick={handleOpenNewOlt}>
            + Nueva OLT
          </button>

          <button className="olt-btn olt-btn--light" type="button" onClick={handleOpenEditOlt} disabled={!selectedOlt}>
            Editar OLT
          </button>

          <button className="olt-btn olt-btn--light" type="button" onClick={handleDeleteOlt} disabled={!selectedOlt || deletingOlt}>
            {deletingOlt ? "Eliminando..." : "Eliminar OLT"}
          </button>
        </div>

        {selectedOlt && (
          <div className="olt-mini-info">
            <span>{selectedOlt.tecnologia || "GPON"}</span>
            <span>{selectedOlt.ip || "N/A"}</span>
            <span>{selectedOlt.tipo_integracion || "vsol_api"}</span>
          </div>
        )}
      </section>

      <section className="olt-card">
        <div className="olt-card__body">
          <div className="olt-summary-grid" aria-label="Filtros rápidos de ONUs">
            <SummaryCard
              label="ONUs"
              value={stats.total}
              icon="olt"
              active={status === "todos"}
              onClick={() => setStatus("todos")}
            />
            <SummaryCard
              label="Online"
              value={stats.online}
              icon="online"
              active={status === "online"}
              onClick={() => setStatus("online")}
            />
            <SummaryCard
              label="Offline"
              value={stats.offline}
              icon="offline"
              active={status === "offline"}
              onClick={() => setStatus("offline")}
            />
            <SummaryCard
              label="Con cliente"
              value={stats.registered}
              icon="user"
              active={status === "registradas"}
              onClick={() => setStatus("registradas")}
            />
            <SummaryCard
              label="No registradas"
              value={stats.unregistered}
              icon="unknown"
              active={status === "no_registradas"}
              onClick={() => setStatus("no_registradas")}
            />
          </div>

          {error && <div className="olt-alert">No se pudo consultar Radar OLT: {error}</div>}

          <div className="olt-toolbar olt-toolbar--filters">
            <input
              className="olt-input"
              placeholder="Buscar cliente, cédula, teléfono, IP, serial o PON..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <select className="olt-select" value={pon} onChange={(event) => setPon(event.target.value)}>
              <option value="todos">Todos los PON</option>
              {pons.map((p) => (
                <option key={p} value={p}>GPON0/{p}</option>
              ))}
            </select>

            <select className="olt-select" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)}>
              <option value="todos">Todos</option>
              <option value="online">Online</option>
              <option value="offline">Offline / LOS</option>
              <option value="registradas">Con cliente</option>
              <option value="no_registradas">No registradas</option>
              <option value="critica">Señal crítica</option>
              <option value="regular">Señal regular</option>
            </select>
          </div>

          <div className="olt-results-scroll">
            <table className="olt-table olt-table--desktop">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>PON / ONU</th>
                  <th>Serial</th>
                  <th>Cliente</th>
                  <th>Modelo</th>
                  <th>RX</th>
                  <th>TX</th>
                  <th>Calidad</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 && (
                  <tr><td colSpan={9}><div className="olt-empty">Consultando OLT...</div></td></tr>
                )}

                {!loading && filteredRows.length === 0 && (
                  <tr><td colSpan={9}><div className="olt-empty">Sin resultados.</div></td></tr>
                )}

                {filteredRows.map((row, index) => {
                  const clientName = row.client?.nombre || row.owner?.nombre;
                  const clientStatus = row.client?.estado || row.owner?.estado_fdeznet;

                  return (
                    <tr key={`${row.serial}-${row.onu.onu_id}-${index}`}>
                      <td><StatusPill onu={row.onu} /></td>
                      <td><strong>{row.onu.onu_id || "N/A"}</strong></td>
                      <td>{row.serial || "N/A"}</td>
                      <td>
                        {clientName ? (
                          <>
                            <strong>{clientName}</strong>
                            <div className="olt-muted-line">
                              {row.client?.cedula ? `Cédula: ${row.client.cedula}` : ""}
                              {row.client?.ip_asignada ? ` · IP: ${row.client.ip_asignada}` : ""}
                              {clientStatus ? ` · ${clientStatus}` : ""}
                            </div>
                          </>
                        ) : (
                          <span className="olt-pill olt-pill--warning">No registrado</span>
                        )}
                      </td>
                      <td>{row.onu.modelo || "N/A"}</td>
                      <td>{parsePower(row.onu.rx_power) !== null ? `${row.onu.rx_power} dBm` : "N/A"}</td>
                      <td>{parsePower(row.onu.tx_power) !== null ? `${row.onu.tx_power} dBm` : "N/A"}</td>
                      <td><PowerPill rx={row.onu.rx_power} /></td>
                      <td>
                        <button className="olt-btn olt-btn--light" type="button" onClick={() => setSelected(row)}>
                          Ver datos
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="olt-mobile-list">
              {loading && rows.length === 0 && <div className="olt-empty">Consultando OLT...</div>}
              {!loading && filteredRows.length === 0 && <div className="olt-empty">Sin resultados.</div>}

              {filteredRows.map((row, index) => {
                const clientName = row.client?.nombre || row.owner?.nombre;
                const online = isOnuOnline(row.onu);

                return (
                  <article key={`${row.serial}-${row.onu.onu_id}-${index}`} className="olt-onu-card">
                    <div className="olt-onu-card__top">
                      <span className={online ? "olt-dot online" : "olt-dot offline"} />
                      <strong className={online ? "olt-text-online" : "olt-text-offline"}>
                        {online ? "Online" : "Offline / LOS"}
                      </strong>
                      <button type="button" onClick={() => setSelected(row)}>Ver datos</button>
                    </div>

                    <div className="olt-onu-card__main">
                      <div>
                        <span>{row.onu.onu_id || "N/A"}</span>
                        <strong>{clientName || "No registrado"}</strong>
                      </div>
                      <div>
                        <span>{row.serial || "N/A"}</span>
                        <strong>{row.onu.modelo || "N/A"}</strong>
                      </div>
                    </div>

                    <div className="olt-onu-card__foot">
                      <span>RX {parsePower(row.onu.rx_power) !== null ? `${row.onu.rx_power} dBm` : "N/A"}</span>
                      <span>TX {parsePower(row.onu.tx_power) !== null ? `${row.onu.tx_power} dBm` : "N/A"}</span>
                      <PowerPill rx={row.onu.rx_power} />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {showOltModal && (
        <OltFormModal
          olt={editingOlt}
          onClose={() => {
            setShowOltModal(false);
            setEditingOlt(null);
          }}
          onSuccess={handleOltSaved}
        />
      )}

      {selected && (
        <BottomSheetDetail
          row={selected}
          oltName={selectedOlt?.nombre}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
