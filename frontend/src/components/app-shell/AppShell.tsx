"use client";

import { PropsWithChildren } from "react";
import { MenuBar } from "@/components/menu-bar/MenuBar";
import { useKeycloak } from "@/providers/KeycloakProvider";

export function AppShell({ children }: PropsWithChildren) {
  const { keycloak, authenticated } = useKeycloak();

  // Extraer rol del usuario
  const getUserRole = (): string => {
    if (!keycloak.tokenParsed) return "Usuario";

    // Intentar obtener roles de realm_access
    const realmRoles = keycloak.tokenParsed.realm_access?.roles as string[] | undefined;
    if (realmRoles && realmRoles.length > 0) {
      // Buscar roles relevantes en orden de prioridad
      if (realmRoles.includes("admin")) return "Administrador";
      if (realmRoles.includes("director")) return "Director";
      if (realmRoles.includes("user")) return "Usuario";
      // Si hay roles pero ninguno de los anteriores, devolver el primero
      return realmRoles[0];
    }

    // Intentar obtener roles de resource_access
    const resourceAccess = keycloak.tokenParsed.resource_access as Record<string, { roles: string[] }> | undefined;
    if (resourceAccess && Object.keys(resourceAccess).length > 0) {
      const firstResource = Object.values(resourceAccess)[0];
      if (firstResource.roles && firstResource.roles.length > 0) {
        return firstResource.roles[0];
      }
    }

    return "Usuario";
  };

  const isAdmin = (): boolean => {
    if (!keycloak.tokenParsed) return false;
    const realmRoles = keycloak.tokenParsed.realm_access?.roles as string[] | undefined;
    return Boolean(realmRoles?.includes("admin"));
  };

  const user = authenticated && keycloak.tokenParsed
    ? {
        name: keycloak.tokenParsed.name as string || keycloak.tokenParsed.preferred_username as string || "Usuario",
        role: getUserRole(),
        isAdmin: isAdmin(),
      }
    : null;

  const handleLogin = () => {
    keycloak.login();
  };

  const handleLogout = () => {
    keycloak.logout();
  };

  return (
    <>
      <MenuBar user={user} onLogin={handleLogin} onLogout={handleLogout} />
      {children}
    </>
  );
}
