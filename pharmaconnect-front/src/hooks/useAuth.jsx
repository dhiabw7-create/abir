import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export const AuthContext = createContext();

const STORAGE_USER_KEY = 'pharmaconnect_auth_user';

const readUser = (storage) => {
  try {
    const persisted = storage.getItem(STORAGE_USER_KEY);
    if (persisted) {
      const parsed = JSON.parse(persisted);
      if (parsed && parsed.role && parsed.token && parsed.id) {
        return parsed;
      }
    }
  } catch (_error) {
    // Ignore corrupted values.
  }

  const role = storage.getItem('role');
  const token = storage.getItem('token');
  const userId = storage.getItem('userId');

  if (!role || !token || !userId) {
    return null;
  }

  return {
    id: Number(userId),
    userId: Number(storage.getItem('userId') || userId),
    role,
    token,
    email: storage.getItem('email') || null,
    name: storage.getItem('name') || null,
    nom: storage.getItem('nom') || null,
    prenom: storage.getItem('prenom') || null,
  };
};

const clearStorage = (storage) => {
  storage.removeItem(STORAGE_USER_KEY);
  storage.removeItem('role');
  storage.removeItem('token');
  storage.removeItem('userId');
  storage.removeItem('email');
  storage.removeItem('name');
  storage.removeItem('nom');
  storage.removeItem('prenom');
};

const persistUser = (storage, user) => {
  if (!user) {
    clearStorage(storage);
    return;
  }

  storage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  storage.setItem('role', user.role || '');
  storage.setItem('token', user.token || '');
  storage.setItem('userId', String(user.id || ''));
  storage.setItem('email', user.email || '');
  storage.setItem('name', user.name || '');
  storage.setItem('nom', user.nom || '');
  storage.setItem('prenom', user.prenom || '');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = readUser(localStorage) || readUser(sessionStorage);
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = (authUser, options = { rememberMe: true }) => {
    const normalizedUser = {
      ...authUser,
      id: Number(authUser?.id),
      userId: Number(authUser?.userId || authUser?.id),
      token: authUser?.token || authUser?.accessToken,
      role: String(authUser?.role || '').toLowerCase(),
    };

    const targetStorage = options?.rememberMe === false ? sessionStorage : localStorage;
    const alternateStorage = options?.rememberMe === false ? localStorage : sessionStorage;

    clearStorage(alternateStorage);
    persistUser(targetStorage, normalizedUser);
    setUser(normalizedUser);
  };

  const logout = () => {
    setUser(null);
    clearStorage(localStorage);
    clearStorage(sessionStorage);
  };

  const updateProfile = async (partialData) => {
    const updatedUser = {
      ...user,
      ...partialData,
    };

    setUser(updatedUser);

    const targetStorage = localStorage.getItem('token') ? localStorage : sessionStorage;
    persistUser(targetStorage, updatedUser);

    return updatedUser;
  };

  const value = useMemo(
    () => ({
      user,
      setUser,
      isAuthenticated: Boolean(user?.token),
      isLoading,
      login,
      logout,
      updateProfile,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
