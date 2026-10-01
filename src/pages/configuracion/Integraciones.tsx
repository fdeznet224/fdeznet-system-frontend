import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  BellAlertIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  KeyIcon,
  ServerStackIcon,
  SignalIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

import client from '@/api/axios';
import CorreoBancarioConfig from './components/CorreoBancarioConfig';

interface ConexionIA {
  url: string;
  modelo: string;
  tiene_clave: boolean;
}

interface Equipos {
  whatsapp: boolean | null;
  routers: number | null;
  olts: number | null;
}

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const tarjeta = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5';

function detalleError(error: unknown, respaldo: string) {
  if (axios.isAxiosError<{ detail?: unknown }>(error)) {
    const detalle = error.response?.data?.detail;
    if (typeof detalle === 'string') return detalle;
    if (Array.isArray(detalle) && detalle[0]?.msg) return String(detalle[0].msg);
  }
  return respaldo;
}

function SeccionIA() {
  const [conexion, setConexion] = useState<ConexionIA | null>(null);
  const [clave, setClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; detalle: string } | null>(null);

  useEffect(() => {
    client.get<ConexionIA>('/agente-ia/conexion')
      .then((r) => setConexion(r.data))
      .catch(() => toast.error('No se pudo cargar la conexión de IA'));
  }, []);

  if (!conexion) return <p className="text-sm text-slate-500">Cargando…</p>;

  const datos = () => ({ url: conexion.url, modelo: conexion.modelo, api_key: clave.trim() || null });

  const probar = async () => {
    setOcupado(true);
    try {
      const { data } = await client.post<{ ok: boolean; detalle: string }>('/agente-ia/conexion/probar', datos());
      setResultado(data);
    } catch (error) {
      setResultado({ ok: false, detalle: detalleError(error, 'No se pudo probar la conexión') });
    } finally {
      setOcupado(false);
    }
  };

  const guardar = async () => {
    setOcupado(true);
    try {
      const { data } = await client.put<{ tiene_clave: boolean }>('/agente-ia/conexion', datos());
      setConexion({ ...conexion, tiene_clave: data.tiene_clave });
      setClave('');
      toast.success('Conexión de IA guardada');
    } catch (error) {
      toast.error(detalleError(error, 'No se pudo guardar'));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`rounded-xl p-2 ${conexion.tiene_clave ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
          <SparklesIcon className="h-6 w-6" />
        </span>
        <span>
          <span className="block font-black text-slate-900 dark:text-white">Inteligencia artificial (agente de WhatsApp)</span>
          <span className="block text-xs text-slate-500">
            {conexion.tiene_clave ? 'Clave guardada' : 'Sin clave'} · El modo y el conocimiento se configuran en{' '}
            <Link to="/admin/configuracion/bot-whatsapp" className="font-bold text-violet-600 hover:underline">Bot de WhatsApp</Link>
          </span>
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Clave de API
          <input
            type="password"
            autoComplete="new-password"
            className={inputClass}
            placeholder={conexion.tiene_clave ? 'Guardada; deja vacío para conservarla' : 'Pega la clave de DeepSeek'}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </label>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Modelo
          <input className={inputClass} value={conexion.modelo} onChange={(e) => setConexion({ ...conexion, modelo: e.target.value })} />
        </label>
        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">Servidor (compatible con OpenAI)
          <input className={inputClass} value={conexion.url} onChange={(e) => setConexion({ ...conexion, url: e.target.value })} />
        </label>
      </div>
      {resultado && (
        <p className={`rounded-xl p-3 text-xs font-bold ${resultado.ok ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'}`}>
          {resultado.ok ? '✅ ' : '⚠️ '}{resultado.detalle}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => void probar()} disabled={ocupado} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:border-violet-400 hover:text-violet-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Probar conexión
        </button>
        <button type="button" onClick={() => void guardar()} disabled={ocupado} className="rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-500 disabled:opacity-50">
          {ocupado ? 'Procesando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

function SeccionAlertas() {
  const [telefonos, setTelefonos] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    client.get<{ telefonos_alerta: string }>('/configuracion/alertas')
      .then((r) => setTelefonos(r.data.telefonos_alerta))
      .catch(() => toast.error('No se pudieron cargar los teléfonos de alerta'));
  }, []);

  const guardar = async () => {
    setOcupado(true);
    try {
      const { data } = await client.put<{ telefonos_alerta: string }>('/configuracion/alertas', { telefonos_alerta: telefonos ?? '' });
      setTelefonos(data.telefonos_alerta);
      toast.success('Teléfonos de alerta guardados');
    } catch (error) {
      toast.error(detalleError(error, 'No se pudieron guardar'));
    } finally {
      setOcupado(false);
    }
  };

  if (telefonos === null) return <p className="text-sm text-slate-500">Cargando…</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
          <BellAlertIcon className="h-6 w-6" />
        </span>
        <span>
          <span className="block font-black text-slate-900 dark:text-white">Teléfonos de alerta</span>
          <span className="block text-xs text-slate-500">Reciben por WhatsApp los avisos de posible fraude (comprobantes repetidos).</span>
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className={`${inputClass} mt-0`}
          placeholder="Ej. 9611234567, 9617654321"
          value={telefonos}
          onChange={(e) => setTelefonos(e.target.value)}
        />
        <button type="button" onClick={() => void guardar()} disabled={ocupado} className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-black text-white hover:bg-amber-500 disabled:opacity-50">
          Guardar
        </button>
      </div>
    </div>
  );
}

function SeccionEquipos() {
  const [equipos, setEquipos] = useState<Equipos>({ whatsapp: null, routers: null, olts: null });

  useEffect(() => {
    void Promise.allSettled([
      client.get<{ connected?: boolean }>('/whatsapp/status'),
      client.get<unknown[]>('/network/routers/'),
      client.get<unknown[]>('/olts/'),
    ]).then(([wa, routers, olts]) => {
      setEquipos({
        whatsapp: wa.status === 'fulfilled' ? Boolean(wa.value.data.connected) : null,
        routers: routers.status === 'fulfilled' ? routers.value.data.length : null,
        olts: olts.status === 'fulfilled' ? olts.value.data.length : null,
      });
    });
  }, []);

  const items = [
    {
      titulo: 'WhatsApp',
      icono: ChatBubbleLeftRightIcon,
      estado: equipos.whatsapp === null ? 'Sin datos' : equipos.whatsapp ? 'Conectado' : 'Desconectado',
      ok: equipos.whatsapp,
      path: '/admin/configuracion/whatsapp-qr',
    },
    {
      titulo: 'Routers MikroTik',
      icono: ServerStackIcon,
      estado: equipos.routers === null ? 'Sin datos' : `${equipos.routers} registrado(s)`,
      ok: equipos.routers === null ? null : equipos.routers > 0,
      path: '/admin/routers',
    },
    {
      titulo: 'OLTs',
      icono: SignalIcon,
      estado: equipos.olts === null ? 'Sin datos' : `${equipos.olts} registrada(s)`,
      ok: equipos.olts === null ? null : equipos.olts > 0,
      path: '/admin/radar',
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Link key={item.titulo} to={item.path} className={`${tarjeta} flex items-center gap-3 transition hover:border-indigo-400`}>
          <item.icono className="h-6 w-6 text-slate-500" />
          <span>
            <span className="block text-sm font-black text-slate-900 dark:text-white">{item.titulo}</span>
            <span className={`block text-xs font-bold ${item.ok === null ? 'text-slate-400' : item.ok ? 'text-emerald-600' : 'text-rose-600'}`}>{item.estado}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function Integraciones() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
          <KeyIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Integraciones y claves</h1>
          <p className="text-sm text-slate-500">Conexiones con servicios externos. Las claves se guardan cifradas y nunca se vuelven a mostrar.</p>
        </div>
      </div>

      <section className={tarjeta}><CorreoBancarioConfig /></section>
      <section className={tarjeta}><SeccionIA /></section>
      <section className={tarjeta}><SeccionAlertas /></section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <CpuChipIcon className="h-5 w-5" /> Equipos y conexiones
        </h2>
        <p className="text-xs text-slate-500">Cada router y cada OLT tiene sus propias credenciales; se administran en su pantalla.</p>
        <SeccionEquipos />
      </section>
    </div>
  );
}
