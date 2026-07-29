import { createContext, useContext } from 'react'

export interface SyncContextValue {
  online: boolean
  pending: number
  conflicts: number
  syncing: boolean
  syncNow: () => Promise<void>
}

export const SyncContext = createContext<SyncContextValue | null>(null)

export function useSync() {
  const value = useContext(SyncContext)
  if (!value) throw new Error('useSync debe usarse dentro de SyncProvider')
  return value
}
