import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import { getHomeRouteForRole } from '../utils/roleRouting';

export default function ProtectedRoute({ children, roles }){
  const { user, authReady } = useContext(AuthContext);
  if (!authReady) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }
  return children;
}
