export type AppRole = 'admin' | 'supervisor' | 'cajero' | 'tecnico';

export function defaultPathForRole(role: AppRole): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'supervisor') return '/admin/clientes';
  if (role === 'tecnico') return '/tech/dashboard';
  return '/admin/cobranza';
}

/** Rol de la sesión guardada; null si no hay sesión válida. */
export function readSessionRole(): AppRole | null {
  try {
    const raw = localStorage.getItem('user');
    const parsed = raw ? JSON.parse(raw) as { rol?: string } : null;
    const role = parsed?.rol?.trim().toLowerCase();
    if (
      role === 'admin'
      || role === 'supervisor'
      || role === 'cajero'
      || role === 'tecnico'
    ) {
      return role;
    }
  } catch {
    return null;
  }
  return null;
}
