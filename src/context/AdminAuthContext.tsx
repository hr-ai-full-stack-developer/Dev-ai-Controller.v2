import React, { createContext, useContext, useState, useEffect } from 'react';
import type { SupabaseAuthUser } from '../types/index.js';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  currentUser: SupabaseAuthUser;
  token: string | null;
  logout: () => void;
  setAuthenticatedUser: (user: SupabaseAuthUser, token: string) => void;
}

const defaultUser: SupabaseAuthUser = { id: '', email: '', name: 'Operator', role: 'Developer / Operator', sessionValid: false, lastSignInAt: '' };

export const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  currentUser: defaultUser,
  token: null,
  logout: () => {},
  setAuthenticatedUser: () => {},
});

export const useAdminAuth = () => useContext(AdminAuthContext);
