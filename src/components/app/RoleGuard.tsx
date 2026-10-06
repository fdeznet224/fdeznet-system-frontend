import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import {
  defaultPathForRole,
  readSessionRole,
  type AppRole,
} from '@/utils/roles';

interface RoleGuardProps {
  allowedRoles: AppRole[];
  children: ReactNode;
}

export default function RoleGuard({
  allowedRoles,
  children,
}: RoleGuardProps) {
  const location = useLocation();
  const role = readSessionRole();

  if (!role) {
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
