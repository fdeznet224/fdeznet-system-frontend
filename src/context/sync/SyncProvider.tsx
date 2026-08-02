import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  listOperations,
  SESSION_CHANGED_EVENT,
  SYNC_CHANGED_EVENT,
} from '@/offline/db'
import { syncPending } from '@/offline/sync'
import { SyncContext } from './context'

export function SyncProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)
  const [conflicts, setConflicts] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshSummary = useCallback(async () => {
    const operations = await listOperations()
    setPending(operations.filter((item) => item.status === 'queued').length)
    setConflicts(operations.filter((item) => item.status === 'conflict').length)
  }, [])

  const syncNow = useCallback(async () => {
    if (!navigator.onLine) return
    setSyncing(true)
    try {
      await syncPending()
    } finally {
      setSyncing(false)
      await refreshSummary()
    }
  }, [refreshSummary])

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      void syncNow()
    }
    const handleOffline = () => setOnline(false)
    const handleQueueChange = () => void refreshSummary()
    const handleSessionChange = () => {
      void refreshSummary()
      if (navigator.onLine) void syncNow()
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener(SYNC_CHANGED_EVENT, handleQueueChange)
    window.addEventListener(SESSION_CHANGED_EVENT, handleSessionChange)
    void refreshSummary()
    if (navigator.onLine) void syncNow()
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener(SYNC_CHANGED_EVENT, handleQueueChange)
      window.removeEventListener(SESSION_CHANGED_EVENT, handleSessionChange)
    }
  }, [refreshSummary, syncNow])

  const value = useMemo(
    () => ({ online, pending, conflicts, syncing, syncNow }),
    [online, pending, conflicts, syncing, syncNow],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}
