import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
* ProtectedRoute component - checks authentication before rendering children
* If user is not authenticated, redirects to /login
* This component is used to wrap protected routes in the main App router.
*/

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, token } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      await useAuthStore.getState().restoreSession();
      setIsLoading(false);
    };
    restore();
  }, []);

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
