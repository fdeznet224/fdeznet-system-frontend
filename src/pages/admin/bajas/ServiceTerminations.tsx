import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  ArchiveBoxArrowDownIcon,
  ExclamationTriangleIcon,
  SignalSlashIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import client from '@/api/axios'

interface Technician {
  id: number
  nombre_completo?: string
  usuario: string
  rol: string
  activo: boolean
}

interface Termination {
  id: number
  cliente_id: number
  servicio_id?: number | null
  cliente: {
    nombre: string
    cedula?: string
    direccion?: string
    estado: string
  } | null
  orden_retiro_id?: number
  onu: {
    id: number
    identificador: string
    modelo?: string
    estado: string
  } | null
  tecnico: Technician | null
  estado: string
  motivo: string
  observaciones?: string
  condicion_equipo?: string
  mikrotik_estado: string
  mikrotik_error?: string
  solicitada_en: string
  recuperada_en?: string
  snapshot?: {
    ip?: string | null
    caja_nap_id?: number | null
    puerto_nap?: number | null
    estado_servicio?: string | null
    proxima_facturacion?: string | null
  }
}

const statusLabels: Record<string, string> = {
  pendiente_retiro: 'Pendiente de retiro',
  sin_equipo: 'Cerrada sin equipo',
  recuperada: 'Equipo recuperado',
  cerrada_no_recuperada: 'Equipo no recuperado',
  cancelada: 'Baja revertida',
}

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail || fallback
  }
  return fallback
}

export default function ServiceTerminations() {
  const [items, setItems] = useState<Termination[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [assignments, setAssignments] = useState<Record<number, string>>({})
  const [filter, setFilter] = useState('abiertas')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [terminationResponse, usersResponse] = await Promise.all([
        client.get('/bajas/'),
        client.get('/bajas/tecnicos/disponibles'),
      ])
      setItems(terminationResponse.data)
      setTechnicians(usersResponse.data)
    } catch {
      toast.error('No se pudieron cargar las bajas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const filtered = useMemo(() => {
    if (filter === 'todas') return items
    if (filter === 'abiertas') {
      return items.filter((item) => item.estado === 'pendiente_retiro')
    }
    return items.filter((item) => item.estado === filter)
  }, [filter, items])

  const assign = async (termination: Termination) => {
    const technicianId = assignments[termination.id]
    if (!technicianId) return toast.error('Selecciona un técnico')
    try {
      await client.post(`/bajas/${termination.id}/asignar`, {
        tecnico_id: Number(technicianId),
      })
      toast.success('Retiro asignado')
      void fetchData()
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'No se pudo asignar'))
    }
  }

  const retryMikrotik = async (termination: Termination) => {
    try {
      const response = await client.post(`/bajas/${termination.id}/reintentar-mikrotik`)
      if (response.data.mikrotik_estado === 'error') {
        toast.error('MikroTik continúa sin responder')
      } else {
        toast.success('Estado de MikroTik actualizado')
      }
      void fetchData()
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'No se pudo reintentar'))
    }
  }

  const reactivate = async (termination: Termination) => {
    if (!confirm('¿Revertir la baja y restaurar el puerto, la ONU y la facturación?')) return
    try {
      const response = await client.post(`/bajas/${termination.id}/cancelar-reactivar`)
      if (response.data.mikrotik_estado === 'error') {
        toast.error('Servicio restaurado, pero MikroTik requiere revisión')
      } else {
        toast.success('Baja revertida correctamente')
      }
      void fetchData()
    } catch (error: unknown) {
      toast.error(errorMessage(error, 'No se pudo revertir la baja'))
    }
  }

  return (
    <div className="min-h-full space-y-5 bg-slate-50 p-4 text-slate-900 dark:bg-[#0f1219] dark:text-white md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Bajas y recuperación</h1>
          <p className="text-sm text-slate-500">Estado de la baja, MikroTik, puerto NAP y devolución de ONU.</p>
        </div>
        <button type="button" onClick={() => void fetchData()} className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          ['abiertas', 'Pendientes'],
          ['recuperada', 'Recuperadas'],
          ['cerrada_no_recuperada', 'No recuperadas'],
          ['cancelada', 'Revertidas'],
          ['todas', 'Todas'],
        ].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black ${filter === value ? 'bg-orange-600 text-white' : 'bg-white text-slate-500 dark:bg-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((termination) => (
          <article key={termination.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-600">Expediente #{termination.id}</p>
                <h2 className="text-lg font-black">{termination.cliente?.nombre || `Cliente #${termination.cliente_id}`}</h2>
                <p className="text-xs text-slate-500">
                  {termination.servicio_id ? `Servicio #${termination.servicio_id}` : 'Servicio principal'} · {termination.cliente?.direccion || 'Sin dirección'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {statusLabels[termination.estado] || termination.estado}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                <p className="text-[10px] font-black uppercase text-slate-400">ONU</p>
                <p className="truncate font-mono font-black">{termination.onu?.identificador || 'Sin equipo'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                <p className="text-[10px] font-black uppercase text-slate-400">Red retirada</p>
                <p className="truncate font-mono font-black">{termination.snapshot?.ip || 'Sin IP'}</p>
              </div>
            </div>

            <p className="mt-4 text-sm"><strong>Motivo:</strong> {termination.motivo}</p>
            <div className={`mt-3 flex items-start gap-2 rounded-xl p-3 text-xs ${termination.mikrotik_estado === 'error' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
              {termination.mikrotik_estado === 'error' ? <SignalSlashIcon className="h-5 w-5 shrink-0" /> : <ArchiveBoxArrowDownIcon className="h-5 w-5 shrink-0" />}
              <div><p className="font-black uppercase">MikroTik: {termination.mikrotik_estado}</p>{termination.mikrotik_error && <p>{termination.mikrotik_error}</p>}</div>
            </div>

            {termination.estado === 'pendiente_retiro' && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="flex gap-2">
                  <select value={assignments[termination.id] || termination.tecnico?.id || ''} onChange={(event) => setAssignments({ ...assignments, [termination.id]: event.target.value })} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-950">
                    <option value="">Seleccionar técnico</option>
                    {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.nombre_completo || technician.usuario}</option>)}
                  </select>
                  <button type="button" onClick={() => void assign(termination)} className="rounded-xl bg-blue-600 px-4 text-white" aria-label="Asignar técnico"><UserIcon className="h-5 w-5" /></button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {termination.mikrotik_estado === 'error' && <button type="button" onClick={() => void retryMikrotik(termination)} className="flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white"><ExclamationTriangleIcon className="h-4 w-4" /> Reintentar MikroTik</button>}
                  <button type="button" onClick={() => void reactivate(termination)} className="rounded-xl border border-emerald-500 px-3 py-2 text-xs font-black text-emerald-600">Revertir baja</button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {!loading && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center text-sm font-bold text-slate-500 dark:border-slate-700">No hay expedientes en este estado.</div>}
    </div>
  )
}
