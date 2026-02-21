"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "https://auth.armage.tech",
  realm: "teatro-aventura-lite",
  clientId: "teatro-aventura-lite",
});

interface KeycloakContextType {
  keycloak: Keycloak;
  authenticated: boolean;
}

const KeycloakContext = createContext<KeycloakContextType | null>(null);

export function KeycloakProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    keycloak
      .init({ onLoad: "login-required", checkLoginIframe: false })
      .then((auth) => {
        setAuthenticated(auth);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Keycloak init error:", err);
        setLoading(false);
      });

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => keycloak.login());
    };
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <KeycloakContext.Provider value={{ keycloak, authenticated }}>
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
