import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowPathIcon,
  ArchiveBoxArrowDownIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  SignalSlashIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import client from '@/api/axios'
import { apiErrorMessage } from '@/utils/apiError'

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

type Condicion = 'funcional' | 'danada' | 'incompleta' | 'perdida'

const statusLabels: Record<string, string> = {
  pendiente_retiro: 'Por recoger',
  sin_equipo: 'Cerrada sin equipo',
  recuperada: 'Recuperado',
  cerrada_no_recuperada: 'No recuperado',
  cancelada: 'Baja revertida',
}

const statusColors: Record<string, string> = {
  pendiente_retiro: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
  recuperada: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  cerrada_no_recuperada: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  cancelada: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
}

// Cómo llegó el equipo: decide si vuelve a bodega, a averiados o se da por perdido.
const CONDICIONES: { valor: Condicion; texto: string }[] = [
  { valor: 'funcional', texto: 'Funciona · vuelve a bodega' },
  { valor: 'danada', texto: 'Dañada · a averiados' },
  { valor: 'incompleta', texto: 'Incompleta (sin eliminador/cable)' },
  { valor: 'perdida', texto: 'No se recuperó' },
]

const FILTROS: [string, string][] = [
  ['abiertas', 'Por recoger'],
  ['recuperada', 'Recuperados'],
  ['cerrada_no_recuperada', 'No recuperados'],
  ['cancelada', 'Revertidas'],
  ['todas', 'Todas'],
]

/**
 * Retiros de equipo por baja de servicio: a quién se le asigna, si el
 * MikroTik ya se cortó, recibir la ONU en bodega o revertir la baja.
 */
export default function RetirosPanel() {
  const [items, setItems] = useState<Termination[]>([])
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [assignments, setAssignments] = useState<Record<number, string>>({})
  const [condiciones, setCondiciones] = useState<Record<number, Condicion | ''>>({})
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
      toast.error('No se pudieron cargar los retiros')
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

  const cuenta = (valor: string) => (
    valor === 'todas' ? items.length
      : valor === 'abiertas' ? items.filter((i) => i.estado === 'pendiente_retiro').length
        : items.filter((i) => i.estado === valor).length
  )

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
      toast.error(apiErrorMessage(error, 'No se pudo asignar'))
    }
  }

  const receive = async (termination: Termination) => {
    const condicion = condiciones[termination.id]
    if (!condicion) return toast.error('Indica cómo llegó el equipo')
    try {
      await client.post(`/bajas/${termination.id}/confirmar-retiro`, {
        condicion,
        observaciones: 'Recibido en bodega desde Inventario',
      })
      toast.success(condicion === 'perdida' ? 'Baja cerrada sin equipo' : 'Equipo recibido en bodega')
      void fetchData()
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'No se pudo recibir el equipo'))
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
      toast.error(apiErrorMessage(error, 'No se pudo reintentar'))
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
      toast.error(apiErrorMessage(error, 'No se pudo revertir la baja'))
    }
  }

  return (
    <div className="h-full space-y-4 overflow-y-auto pb-10">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          ONUs de clientes dados de baja: asigna quién las recoge y recíbelas en bodega.
        </p>
        <button type="button" aria-label="Actualizar retiros" onClick={() => void fetchData()} className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {FILTROS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-black ${filter === value ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-900'}`}
          >
            {label}
            <span className={`rounded-full px-1.5 text-[10px] ${filter === value ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>{cuenta(value)}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {filtered.map((termination) => (
          <article key={termination.id} className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#12141a] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Baja #{termination.id}</p>
                <h2 className="truncate text-base font-black text-slate-900 dark:text-white sm:text-lg">{termination.cliente?.nombre || `Cliente #${termination.cliente_id}`}</h2>
                <p className="flex items-start gap-1 text-xs text-slate-500">
                  <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{termination.cliente?.direccion || 'Sin dirección'}</span>
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase ${statusColors[termination.estado] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                {statusLabels[termination.estado] || termination.estado}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="min-w-0 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                <p className="text-[10px] font-black uppercase text-slate-400">ONU</p>
                <p className="truncate font-mono text-xs font-black sm:text-sm">{termination.onu?.identificador || 'Sin equipo'}</p>
              </div>
              <div className="min-w-0 rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                <p className="text-[10px] font-black uppercase text-slate-400">Técnico</p>
                <p className="truncate text-xs font-black sm:text-sm">{termination.tecnico ? (termination.tecnico.nombre_completo || termination.tecnico.usuario) : 'Sin asignar'}</p>
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 dark:text-slate-300"><strong>Motivo:</strong> {termination.motivo}</p>
            {termination.condicion_equipo && (
              <p className="mt-1 text-xs text-slate-500">Equipo: {CONDICIONES.find((c) => c.valor === termination.condicion_equipo)?.texto || termination.condicion_equipo}</p>
            )}

            {termination.mikrotik_estado === 'error' && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                <SignalSlashIcon className="h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-black uppercase">El MikroTik no se cortó</p>
                  {termination.mikrotik_error && <p className="break-words">{termination.mikrotik_error}</p>}
                </div>
              </div>
            )}

            {termination.estado === 'pendiente_retiro' && (
              <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div>
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Quién lo recoge</span>
                  <div className="flex gap-2">
                    <select
                      aria-label={`Técnico para la baja ${termination.id}`}
                      value={assignments[termination.id] || termination.tecnico?.id || ''}
                      onChange={(event) => setAssignments({ ...assignments, [termination.id]: event.target.value })}
                      className="min-h-12 w-full min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">Seleccionar técnico</option>
                      {technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.nombre_completo || technician.usuario}</option>)}
                    </select>
                    <button type="button" onClick={() => void assign(termination)} className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-black text-white">
                      <UserIcon className="h-4 w-4" /> Asignar
                    </button>
                  </div>
                </div>

                {termination.onu && (
                  <div>
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Recibir en bodega</span>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        aria-label={`Cómo llegó el equipo de la baja ${termination.id}`}
                        value={condiciones[termination.id] || ''}
                        onChange={(event) => setCondiciones({ ...condiciones, [termination.id]: event.target.value as Condicion | '' })}
                        className="min-h-12 w-full min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-950"
                      >
                        <option value="">¿Cómo llegó el equipo?</option>
                        {CONDICIONES.map((c) => <option key={c.valor} value={c.valor}>{c.texto}</option>)}
                      </select>
                      <button type="button" onClick={() => void receive(termination)} className="flex min-h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-wide text-white">
                        <CheckBadgeIcon className="h-5 w-5" /> Recibir
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {termination.mikrotik_estado === 'error' && (
                    <button type="button" onClick={() => void retryMikrotik(termination)} className="flex min-h-10 items-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-black text-white">
                      <ExclamationTriangleIcon className="h-4 w-4" /> Reintentar MikroTik
                    </button>
                  )}
                  <button type="button" onClick={() => void reactivate(termination)} className="min-h-10 rounded-xl border border-emerald-500 px-3 text-xs font-black text-emerald-600">
                    Revertir baja
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[1.5rem] border border-dashed border-slate-300 py-14 text-center text-sm font-bold text-slate-500 dark:border-slate-700">
          <ArchiveBoxArrowDownIcon className="h-8 w-8 text-slate-400" />
          No hay retiros en este estado.
        </div>
      )}
    </div>
  )
}
