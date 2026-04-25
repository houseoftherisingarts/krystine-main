import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { subscribeToAuthState, isAdminUser } from '../../firebase/auth';
import type { User } from 'firebase/auth';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsub = subscribeToAuthState(u => setUser(u));
    return unsub;
  }, []);

  if (user === undefined) {
    // Loading
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent border-[#B8532F] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
