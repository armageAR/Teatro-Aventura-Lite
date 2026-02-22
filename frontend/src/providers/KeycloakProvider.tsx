"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  ReactNode,
} from "react";
import Keycloak from "keycloak-js";

interface KeycloakContextType {
  keycloak: Keycloak;
  authenticated: boolean;
  initialized: boolean;
}

const KeycloakContext = createContext<KeycloakContextType | null>(null);

// Singleton para evitar múltiples instancias
let keycloakInstance: Keycloak | null = null;
let initPromise: Promise<boolean> | null = null;

function getKeycloakInstance(): Keycloak {
  if (!keycloakInstance) {
    keycloakInstance = new Keycloak({
      url: "https://auth.armage.tech",
      realm: "Teatro-Aventura-Lite",
      clientId: "teatro-aventura-lite",
    });
  }
  return keycloakInstance;
}

export function KeycloakProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const didInit = useRef(false);

  useEffect(() => {
    // Evitar doble inicialización (React StrictMode)
    if (didInit.current) return;
    didInit.current = true;

    const keycloak = getKeycloakInstance();

    // Si ya hay una promesa de init en curso, usarla
    if (!initPromise) {
      initPromise = keycloak.init({
        onLoad: "check-sso",
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: "S256",
      });
    }

    initPromise
      .then((auth) => {
        console.log("Keycloak initialized, authenticated:", auth);
        setAuthenticated(auth);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Keycloak init error:", err);
        setLoading(false);
      });

    // Callbacks para cambios de estado
    keycloak.onAuthSuccess = () => {
      console.log("Keycloak auth success");
      setAuthenticated(true);
    };

    keycloak.onAuthLogout = () => {
      console.log("Keycloak auth logout");
      setAuthenticated(false);
    };

    keycloak.onTokenExpired = () => {
      console.log("Keycloak token expired, refreshing...");
      keycloak.updateToken(30).catch(() => {
        console.log("Token refresh failed");
        setAuthenticated(false);
      });
    };
  }, []);

  const keycloak = getKeycloakInstance();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <KeycloakContext.Provider value={{ keycloak, authenticated, initialized: !loading }}>
      {children}
    </KeycloakContext.Provider>
  );
}

export const useKeycloak = () => {
  const context = useContext(KeycloakContext);
  if (!context)
    throw new Error("useKeycloak must be used within KeycloakProvider");
  return context;
};
