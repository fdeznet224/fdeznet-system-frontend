import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";

import client from "@/api/axios";
import { apiErrorMessage } from "@/utils/apiError";
import { normalizeSerial, parsePower, type OltOnuApiItem } from "./types";

interface Sugerencia {
  cliente_id: number;
  nombre: string;
  cedula?: string | null;
  puntaje: number;
  segura: boolean;
}

interface Candidato {
  id: number;
  nombre: string;
  cedula?: string | null;
  zona?: string | null;
}

interface Propuesta {
  sueltas: string[];
  sugerencias: Record<string, Sugerencia>;
  clientes_sin_onu: Candidato[];
}

interface Resultado {
  identificador: string;
  ok: boolean;
  error?: string;
}

/**
 * ONU que la OLT reporta y ningún cliente tiene: se elige (o se confirma el
 * sugerido por la descripción de la ONU) y se vincula sin abrir cada ficha.
 */
export default function VincularOnus({ oltId, onus, onVinculadas }: {
  oltId: number;
  onus: OltOnuApiItem[];
  onVinculadas: () => void;
}) {
  const [propuesta, setPropuesta] = useState<Propuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elegidos, setElegidos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const { data } = await client.get<Propuesta>(`/olts/${oltId}/vinculacion`);
      setPropuesta(data);
      setElegidos(Object.fromEntries(
        Object.entries(data.sugerencias).map(([serial, s]) => [serial, String(s.cliente_id)])
      ));
    } catch (err) {
      setError(apiErrorMessage(err, "No se pudo preparar la vinculación"));
    }
  }, [oltId]);

  useEffect(() => {
    const primera = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(primera);
  }, [cargar]);

  const sueltas = useMemo(() => {
    if (!propuesta) return [];
    const porSerial = new Map(onus.map((onu) => [normalizeSerial(onu.identificador || onu.serial), onu]));
    return propuesta.sueltas.map((serial) => ({ serial, onu: porSerial.get(normalizeSerial(serial)) }));
  }, [onus, propuesta]);

  // Un cliente solo puede quedar con una ONU.
  const usados = useMemo(() => new Set(Object.values(elegidos).filter(Boolean)), [elegidos]);
  const seguras = sueltas.filter(({ serial }) => propuesta?.sugerencias[serial]?.segura && elegidos[serial] === String(propuesta.sugerencias[serial].cliente_id));

  const vincular = async (seriales: string[]) => {
    const vinculos = seriales
      .filter((serial) => elegidos[serial])
      .map((serial) => ({ identificador: serial, cliente_id: Number(elegidos[serial]) }));
    if (!vinculos.length) {
      toast.error("Elige el cliente de la ONU");
      return;
    }
    setGuardando(true);
    try {
      const { data } = await client.post<{ resultados: Resultado[]; vinculadas: number }>(
        `/olts/${oltId}/vincular-onus`, { vinculos },
      );
      const fallidas = data.resultados.filter((r) => !r.ok);
      if (data.vinculadas) toast.success(`${data.vinculadas} ONU vinculada${data.vinculadas === 1 ? "" : "s"}`);
      fallidas.forEach((r) => toast.error(`${r.identificador}: ${r.error}`, { duration: 8000 }));
      onVinculadas();
      await cargar();
    } catch (err) {
      toast.error(apiErrorMessage(err, "No se pudo vincular"));
    } finally {
      setGuardando(false);
    }
  };

  if (error) return <div className="olt-alert">{error}</div>;
  if (!propuesta) return <div className="olt-empty">Buscando a qué cliente pertenece cada ONU…</div>;
  if (!sueltas.length) return <div className="olt-empty">Todas las ONU de esta OLT ya tienen cliente.</div>;

  return (
    <section aria-label="Vincular ONU a clientes" className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="olt-muted-line">
          {sueltas.length} ONU sin cliente. El cliente sugerido sale del nombre escrito en la ONU; revisa y vincula.
          {propuesta.clientes_sin_onu.length === 0 && " No hay clientes de esta OLT o su zona sin ONU."}
        </p>
        {seguras.length > 0 && (
          <button
            type="button"
            className="olt-btn olt-btn--light"
            disabled={guardando}
            onClick={() => void vincular(seguras.map(({ serial }) => serial))}
          >
            Vincular las {seguras.length} sugeridas seguras
          </button>
        )}
      </div>

      <div className="space-y-2">
        {sueltas.map(({ serial, onu }) => {
          const sugerida = propuesta.sugerencias[serial];
          const elegido = elegidos[serial] || "";
          return (
            <div key={serial} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-[1.2fr_1.6fr_auto] md:items-center">
              <div className="min-w-0">
                <strong className="font-mono text-sm">{serial}</strong>
                <div className="olt-muted-line">
                  {onu?.onu_id || "—"}
                  {parsePower(onu?.rx_power) !== null ? ` · ${onu?.rx_power} dBm` : ""}
                  {onu?.modelo ? ` · ${onu.modelo}` : ""}
                </div>
                <div className="text-xs">
                  En la ONU: <strong>{onu?.description?.trim() || "sin descripción"}</strong>
                </div>
              </div>
              <div className="min-w-0">
                <select
                  aria-label={`Cliente de la ONU ${serial}`}
                  className="olt-select w-full"
                  value={elegido}
                  onChange={(event) => setElegidos({ ...elegidos, [serial]: event.target.value })}
                >
                  <option value="">Elegir cliente…</option>
                  {propuesta.clientes_sin_onu.map((c) => (
                    <option key={c.id} value={c.id} disabled={usados.has(String(c.id)) && elegido !== String(c.id)}>
                      {c.nombre}{c.cedula ? ` (${c.cedula})` : ""}{c.zona ? ` · ${c.zona}` : ""}
                    </option>
                  ))}
                </select>
                {sugerida && elegido === String(sugerida.cliente_id) && (
                  <div className={`mt-1 text-xs font-bold ${sugerida.segura ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {sugerida.segura ? "Sugerido: coincide con el nombre en la ONU" : "Sugerido con dudas: revísalo"}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="olt-btn olt-btn--light"
                disabled={guardando || !elegido}
                onClick={() => void vincular([serial])}
              >
                Vincular
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
