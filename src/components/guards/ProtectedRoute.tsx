import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../ui/Modal';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, pendingVerificationEmail } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Checking authentication session..." />
      </div>
    );
  }

  if (!user) {
    // If user has a pending verification email, redirect to verify-otp
    if (pendingVerificationEmail) {
      return <Navigate to="/verify-otp" state={{ from: location }} replace />;
    }
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!user.isVerified) {
    return <Navigate to="/verify-otp" replace />;
  }

  return <>{children}</>;
};

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Loading..." />
      </div>
    );
  }

  if (user && user.isVerified) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
