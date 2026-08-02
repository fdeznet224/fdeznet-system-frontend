export type AppRole = 'admin' | 'supervisor' | 'cajero' | 'tecnico';

export function defaultPathForRole(role: AppRole): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'supervisor') return '/admin/clientes';
  if (role === 'tecnico') return '/tech/dashboard';
  return '/admin/cobranza';
}
