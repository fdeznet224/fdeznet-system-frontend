export type SyncOperationType =
  | 'orden_estado'
  | 'soporte_incidencia'
  | 'pago_factura'

export type SyncOperationStatus = 'queued' | 'conflict'

export interface SyncOperation {
  id: string
  scope: string
  tipo: SyncOperationType
  payload: Record<string, unknown>
  label: string
  creado_cliente: string
  status: SyncOperationStatus
  retries: number
  lastError?: string
}

interface CacheRecord<T = unknown> {
  id: string
  scope: string
  key: string
  value: T
  updatedAt: string
}

const DB_NAME = 'fdeznet-pwa'
const DB_VERSION = 1
const OPERATIONS_STORE = 'operations'
const CACHE_STORE = 'cache'
export const SYNC_CHANGED_EVENT = 'fdeznet-sync-changed'
export const SESSION_CHANGED_EVENT = 'fdeznet-session-changed'

export function notifySessionChanged() {
  window.dispatchEvent(new CustomEvent(SESSION_CHANGED_EVENT))
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(OPERATIONS_STORE)) {
        database.createObjectStore(OPERATIONS_STORE, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(CACHE_STORE)) {
        database.createObjectStore(CACHE_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export function currentScope(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null') as {
      id?: number
      usuario?: string
    } | null
    if (!user) return null
    return String(user.id ?? user.usuario ?? '') || null
  } catch {
    return null
  }
}

function emitChange() {
  window.dispatchEvent(new CustomEvent(SYNC_CHANGED_EVENT))
}

export async function putOperation(operation: SyncOperation): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(OPERATIONS_STORE, 'readwrite')
  transaction.objectStore(OPERATIONS_STORE).put(operation)
  await transactionDone(transaction)
  database.close()
  emitChange()
}

export async function deleteOperation(id: string): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(OPERATIONS_STORE, 'readwrite')
  transaction.objectStore(OPERATIONS_STORE).delete(id)
  await transactionDone(transaction)
  database.close()
  emitChange()
}

export async function listOperations(): Promise<SyncOperation[]> {
  const scope = currentScope()
  if (!scope) return []
  const database = await openDatabase()
  const transaction = database.transaction(OPERATIONS_STORE, 'readonly')
  const records = await requestResult(
    transaction.objectStore(OPERATIONS_STORE).getAll() as IDBRequest<SyncOperation[]>,
  )
  await transactionDone(transaction)
  database.close()
  return records
    .filter((item) => item.scope === scope)
    .sort((a, b) => a.creado_cliente.localeCompare(b.creado_cliente))
}

export async function setCachedValue<T>(key: string, value: T): Promise<void> {
  const scope = currentScope()
  if (!scope) return
  const database = await openDatabase()
  const transaction = database.transaction(CACHE_STORE, 'readwrite')
  const record: CacheRecord<T> = {
    id: `${scope}:${key}`,
    scope,
    key,
    value,
    updatedAt: new Date().toISOString(),
  }
  transaction.objectStore(CACHE_STORE).put(record)
  await transactionDone(transaction)
  database.close()
}

export async function getCachedValue<T>(key: string): Promise<T | null> {
  const scope = currentScope()
  if (!scope) return null
  const database = await openDatabase()
  const transaction = database.transaction(CACHE_STORE, 'readonly')
  const record = await requestResult(
    transaction.objectStore(CACHE_STORE).get(`${scope}:${key}`) as IDBRequest<
      CacheRecord<T> | undefined
    >,
  )
  await transactionDone(transaction)
  database.close()
  return record?.value ?? null
}

export async function cachedRequest<T>(
  key: string,
  request: () => Promise<T>,
): Promise<{ data: T; fromCache: boolean }> {
  try {
    const data = await request()
    await setCachedValue(key, data)
    return { data, fromCache: false }
  } catch (error) {
    if (
      typeof error === 'object'
      && error !== null
      && 'response' in error
      && error.response
    ) {
      throw error
    }
    const cached = await getCachedValue<T>(key)
    if (cached !== null) return { data: cached, fromCache: true }
    throw error
  }
}
