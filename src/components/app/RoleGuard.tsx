import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  defaultPathForRole,
  type AppRole,
} from '@/utils/roles';

interface SessionUser {
  rol?: string;
}

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: ReactNode;
}

function readRole(): AppRole | null {
  try {
    const raw = localStorage.getItem('user');
    const parsed = raw ? JSON.parse(raw) as SessionUser : null;
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

export default function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const role = readRole();

  if (!token || !role) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={defaultPathForRole(role)} replace />;
  }

  return children;
}
