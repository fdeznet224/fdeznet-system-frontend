import axios from 'axios'
import client from '../api/axios'
import {
  currentScope,
  deleteOperation,
  listOperations,
  putOperation,
  type SyncOperation,
  type SyncOperationType,
} from './db'

interface SyncResult {
  id: string
  estado: 'aplicada' | 'repetida' | 'conflicto' | 'rechazada' | 'error'
  respuesta?: unknown
  error?: string
}

export interface SubmissionResult {
  id: string
  queued: boolean
  response?: unknown
}

let activeSync: Promise<void> | null = null

function createOperation(
  tipo: SyncOperationType,
  payload: Record<string, unknown>,
  label: string,
): SyncOperation {
  const scope = currentScope()
  if (!scope) throw new Error('No hay una sesión activa')
  return {
    id: crypto.randomUUID(),
    scope,
    tipo,
    payload,
    label,
    creado_cliente: new Date().toISOString(),
    status: 'queued',
    retries: 0,
  }
}

async function sendOperations(operations: SyncOperation[]): Promise<SyncResult[]> {
  const response = await client.post('/sincronizacion/procesar', {
    operaciones: operations.map(({ id, tipo, payload, creado_cliente }) => ({
      id,
      tipo,
      payload,
      creado_cliente,
    })),
  })
  return response.data.resultados as SyncResult[]
}

function isNetworkError(error: unknown): boolean {
  return !navigator.onLine || (axios.isAxiosError(error) && !error.response)
}

export async function submitOperation(
  tipo: SyncOperationType,
  payload: Record<string, unknown>,
  label: string,
): Promise<SubmissionResult> {
  const operation = createOperation(tipo, payload, label)
  if (!navigator.onLine) {
    await putOperation(operation)
    return { id: operation.id, queued: true }
  }

  try {
    const [result] = await sendOperations([operation])
    if (result?.estado === 'aplicada' || result?.estado === 'repetida') {
      return { id: operation.id, queued: false, response: result.respuesta }
    }
    throw new Error(result?.error || 'La operación fue rechazada')
  } catch (error) {
    if (isNetworkError(error)) {
      await putOperation(operation)
      return { id: operation.id, queued: true }
    }
    throw error
  }
}

async function runSync(): Promise<void> {
  if (!navigator.onLine) return
  const operations = (await listOperations()).filter(
    (item) => item.status === 'queued',
  )
  if (!operations.length) return

  for (let offset = 0; offset < operations.length; offset += 50) {
    const batch = operations.slice(offset, offset + 50)
    let results: SyncResult[]
    try {
      results = await sendOperations(batch)
    } catch (error) {
      if (isNetworkError(error)) return
      throw error
    }

    for (const operation of batch) {
      const result = results.find((item) => item.id === operation.id)
      if (result?.estado === 'aplicada' || result?.estado === 'repetida') {
        await deleteOperation(operation.id)
        continue
      }
      await putOperation({
        ...operation,
        status:
          result?.estado === 'conflicto' || result?.estado === 'rechazada'
            ? 'conflict'
            : 'queued',
        retries: operation.retries + 1,
        lastError: result?.error || 'No se recibió una respuesta válida',
      })
    }
  }
}

export function syncPending(): Promise<void> {
  if (!activeSync) {
    activeSync = runSync().finally(() => {
      activeSync = null
    })
  }
  return activeSync
}
