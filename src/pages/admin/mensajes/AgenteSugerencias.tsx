import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { SparklesIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';

import client from '@/api/axios';
import { useWhatsApp } from '@/context/whatsapp/context';

interface Consulta {
  nombre: string;
  resultado?: Record<string, unknown>;
}

interface Accion {
  nombre: string;
  argumentos?: Record<string, unknown>;
}

export interface Sugerencia {
  id: number;
  telefono: string;
  cliente_id: number | null;
  estado: string;
  mensaje_cliente: string | null;
  respuesta_propuesta: string | null;
  consultas: Consulta[];
  acciones_pendientes: Accion[];
  error: string | null;
  costo_usd: number;
  creado_en: string;
}

const NOMBRE_CONSULTA: Record<string, string> = {
  identificar_cliente: 'Identificó al cliente',
  consultar_cuenta: 'Revisó la cuenta',
  diagnosticar_conexion: 'Diagnosticó la conexión',
  consultar_avisos: 'Revisó avisos',
  datos_de_pago: 'Datos de pago',
  leer_comprobante: 'Leyó el comprobante',
};

const NOMBRE_ACCION: Record<string, string> = {
  registrar_promesa: 'Registrar promesa',
  crear_orden_tecnica: 'Crear orden técnica',
  aplicar_comprobante: 'Aplicar comprobante (solo si el banco lo confirma)',
  solicitar_cambio_contrasena: 'Solicitar cambio de contraseña',
  pasar_a_humano: 'Pasar a asesor',
};

function detalleConsulta(consulta: Consulta): string {
  const r = consulta.resultado ?? {};
  if (r.error) return String(r.error);
  if (consulta.nombre === 'diagnosticar_conexion') return String(r.explicacion ?? r.codigo ?? '');
  if (consulta.nombre === 'consultar_cuenta') return `Total $${String(r.total_a_pagar ?? '0')}`;
  if (consulta.nombre === 'identificar_cliente') return r.identificado ? `Sí (${String(r.nombre ?? '')})` : 'No';
  if (consulta.nombre === 'leer_comprobante') return [r.estado, r.monto && `$${String(r.monto)}`].filter(Boolean).join(' · ');
  return '';
}

function detalleAccion(accion: Accion): string {
  const a = accion.argumentos ?? {};
  if (accion.nombre === 'registrar_promesa') return `para el ${String(a.fecha ?? '')}`;
  if (accion.nombre === 'crear_orden_tecnica') return String(a.descripcion ?? '');
  if (accion.nombre === 'pasar_a_humano') return String(a.motivo ?? '');
  return '';
}

function mensajeError(error: unknown, respaldo: string) {
  if (axios.isAxiosError<{ detail?: string }>(error)) return error.response?.data?.detail || respaldo;
  return respaldo;
}

interface Props {
  /** Sin cliente muestra todas las pendientes, incluidas las de números sin identificar. */
  clienteId?: number | null;
  onEnviada?: () => void;
}

export default function AgenteSugerencias({ clienteId, onEnviada }: Props) {
  const { wsEvent } = useWhatsApp();
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [textos, setTextos] = useState<Record<number, string>>({});
  const [ocupado, setOcupado] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    try {
      const { data } = await client.get<Sugerencia[]>('/agente-ia/sugerencias', {
        params: clienteId ? { cliente_id: clienteId } : {},
      });
      setSugerencias(data);
    } catch {
      setSugerencias([]);
    }
  }, [clienteId]);

  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    if (wsEvent?.type !== 'AGENTE_IA') return;
    if (!clienteId || wsEvent.data.cliente_id === clienteId) void cargar();
  }, [wsEvent, clienteId, cargar]);

  const enviar = async (sugerencia: Sugerencia) => {
    setOcupado(sugerencia.id);
    try {
      const texto = textos[sugerencia.id];
      await client.post(`/agente-ia/sugerencias/${sugerencia.id}/aprobar`, {
        texto: texto !== undefined && texto !== sugerencia.respuesta_propuesta ? texto : null,
      });
      toast.success('Respuesta enviada');
      await cargar();
      onEnviada?.();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo enviar'));
    } finally {
      setOcupado(null);
    }
  };

  const descartar = async (sugerencia: Sugerencia) => {
    setOcupado(sugerencia.id);
    try {
      await client.post(`/agente-ia/sugerencias/${sugerencia.id}/descartar`);
      await cargar();
    } catch (error) {
      toast.error(mensajeError(error, 'No se pudo descartar'));
    } finally {
      setOcupado(null);
    }
  };

  if (sugerencias.length === 0) return null;

  return (
    <div className="space-y-3">
      {sugerencias.map((s) => (
        <div key={s.id} className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm dark:border-violet-500/30 dark:bg-violet-500/10">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 font-black text-violet-700 dark:text-violet-300">
              <SparklesIcon className="h-4 w-4" /> Sugerencia del agente
            </p>
            <span className="text-xs text-slate-500">
              {!s.cliente_id && `${s.telefono} · `}
              {new Date(s.creado_en).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          </div>

          {s.mensaje_cliente && (
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              <span className="font-bold">Cliente:</span> {s.mensaje_cliente}
            </p>
          )}

          {s.consultas.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
              {s.consultas.map((c, i) => (
                <li key={i}>
                  🔎 {NOMBRE_CONSULTA[c.nombre] ?? c.nombre}
                  {detalleConsulta(c) && `: ${detalleConsulta(c)}`}
                </li>
              ))}
            </ul>
          )}

          {s.acciones_pendientes.length > 0 && (
            <div className="mt-2 rounded-xl bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <p className="font-bold">Al enviar también se hará:</p>
              <ul className="mt-1 space-y-0.5">
                {s.acciones_pendientes.map((a, i) => (
                  <li key={i}>
                    ⚡ {NOMBRE_ACCION[a.nombre] ?? a.nombre}
                    {detalleAccion(a) && ` — ${detalleAccion(a)}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <textarea
            className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            rows={3}
            value={textos[s.id] ?? s.respuesta_propuesta ?? ''}
            onChange={(e) => setTextos((prev) => ({ ...prev, [s.id]: e.target.value }))}
          />

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => void descartar(s)}
              disabled={ocupado === s.id}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 disabled:opacity-50 dark:hover:bg-slate-800"
            >
              <XMarkIcon className="h-4 w-4" /> Descartar
            </button>
            <button
              type="button"
              onClick={() => void enviar(s)}
              disabled={ocupado === s.id || !(textos[s.id] ?? s.respuesta_propuesta ?? '').trim()}
              className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-black text-white hover:bg-violet-500 disabled:opacity-50"
            >
              <PaperAirplaneIcon className="h-4 w-4" /> Enviar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
