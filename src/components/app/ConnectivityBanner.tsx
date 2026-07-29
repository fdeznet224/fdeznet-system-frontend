/** Indicador global de conectividad y sincronización pendiente. */
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  SignalSlashIcon,
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { useSync } from '@/context/sync/context'
import {
  deleteOperation,
  listOperations,
  SYNC_CHANGED_EVENT,
  type SyncOperation,
} from '@/offline/db'

export default function ConnectivityBanner() {
  const { online, pending, conflicts, syncing, syncNow } = useSync()
  const [showDetails, setShowDetails] = useState(false)
  const [operations, setOperations] = useState<SyncOperation[]>([])

  useEffect(() => {
    const refresh = () => void listOperations().then(setOperations)
    refresh()
    window.addEventListener(SYNC_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(SYNC_CHANGED_EVENT, refresh)
  }, [])

  if (online && pending === 0 && conflicts === 0) return null

  const tone = conflicts
    ? 'bg-rose-600 border-rose-400'
    : online
      ? 'bg-blue-600 border-blue-400'
      : 'bg-slate-800 border-slate-600'

  const conflicted = operations.filter((item) => item.status === 'conflict')

  return <>
    <div
      className={`fixed right-3 bottom-20 z-[100] max-w-[calc(100vw-1.5rem)] rounded-2xl border px-3 py-2 text-white shadow-2xl ${tone}`}
      role="status"
    >
      <div className="flex items-center gap-2">
        {conflicts ? (
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
        ) : online ? (
          <CloudArrowUpIcon className="h-5 w-5 shrink-0" />
        ) : (
          <SignalSlashIcon className="h-5 w-5 shrink-0" />
        )}
        <div className="text-xs font-bold">
          <p>{online ? 'Con conexión' : 'Trabajando sin conexión'}</p>
          <p className="font-medium opacity-90">
            {conflicts
              ? `${conflicts} operación(es) requieren revisión`
              : `${pending} operación(es) pendientes`}
          </p>
        </div>
        {online && pending > 0 && (
          <button
            type="button"
            onClick={() => void syncNow()}
            disabled={syncing}
            className="ml-1 rounded-xl bg-white/20 p-2 disabled:opacity-60"
            aria-label="Sincronizar ahora"
          >
            <ArrowPathIcon className={`h-5 w-5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        )}
        {conflicts > 0 && (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="ml-1 rounded-xl bg-white/20 px-2 py-2 text-[10px] font-black uppercase"
          >
            Revisar
          </button>
        )}
      </div>
    </div>
    {showDetails && (
      <div className="fixed inset-0 z-[110] flex items-end bg-black/60 p-3 sm:items-center sm:justify-center">
        <div className="w-full max-w-md rounded-3xl bg-white p-5 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black">Operaciones por revisar</h2>
            <button type="button" onClick={() => setShowDetails(false)} className="rounded-lg px-3 py-1 text-sm font-bold text-slate-500">Cerrar</button>
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {conflicted.map((operation) => (
              <div key={operation.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-900 dark:bg-rose-950/30">
                <p className="text-sm font-black">{operation.label}</p>
                <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{operation.lastError}</p>
                <button
                  type="button"
                  onClick={() => void deleteOperation(operation.id)}
                  className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-black text-white"
                >
                  Descartar operación
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </>
}
