"use client";

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { isAxiosError } from "axios";

import { LoginModal } from "@/components/login-modal/LoginModal";
import { MenuBar } from "@/components/menu-bar/MenuBar";
import { api } from "@/lib/api";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

type Credentials = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<void>;
  openLogin: () => void;
  closeLogin: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AppShell");
  }

  return ctx;
}

export function AppShell({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assignUser = useCallback((value: AuthUser | null) => {
    setUser(value);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<AuthUser>("/api/me");
      assignUser(response.data);
    } catch (err) {
      assignUser(null);
    }
  }, [assignUser]);

  useEffect(() => {
    refreshUser().catch((err) => {
      console.error("No se pudo obtener el usuario", err);
    });
  }, [refreshUser]);

  const openLogin = useCallback(() => {
    setIsLoginOpen(true);
    setLoginError(null);
  }, []);

  const closeLogin = useCallback(() => {
    if (isSubmitting) return;
    setIsLoginOpen(false);
    setLoginError(null);
  }, [isSubmitting]);

  const handleLogin = useCallback(
    async ({ email, password }: Credentials) => {
      setIsSubmitting(true);
      setLoginError(null);

      try {
        await api.get("/sanctum/csrf-cookie");
        const response = await api.post<{ user: AuthUser }>("/api/login", {
          email,
          password,
        });

        assignUser(response.data.user);
        setIsLoginOpen(false);
        setLoginError(null);
      } catch (err) {
        if (isAxiosError(err)) {
          const data = err.response?.data as { message?: string } | undefined;
          setLoginError(data?.message ?? "Credenciales inválidas");
        } else if (err instanceof Error) {
          setLoginError(err.message);
        } else {
          setLoginError("No se pudo iniciar sesión");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [assignUser]
  );

  const handleLogout = useCallback(async () => {
    try {
      await api.post("/api/logout");
    } catch (err) {
      console.error("Error al cerrar sesión", err);
    } finally {
      assignUser(null);
    }
  }, [assignUser]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({ user, setUser: assignUser, refreshUser, openLogin, closeLogin }),
    [user, assignUser, refreshUser, openLogin, closeLogin]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      <MenuBar user={user} onLoginClick={openLogin} onLogout={handleLogout} />
      {children}
      <LoginModal
        open={isLoginOpen}
        onClose={closeLogin}
        onSubmit={handleLogin}
        isSubmitting={isSubmitting}
        error={loginError}
      />
    </AuthContext.Provider>
  );
}
