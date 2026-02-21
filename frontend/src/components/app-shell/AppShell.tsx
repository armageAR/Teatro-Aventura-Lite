"use client";

import { PropsWithChildren } from "react";
import { MenuBar } from "@/components/menu-bar/MenuBar";
import { useKeycloak } from "@/providers/KeycloakProvider";

export function AppShell({ children }: PropsWithChildren) {
  const { keycloak, authenticated } = useKeycloak();

  const user = authenticated && keycloak.tokenParsed
    ? {
        name: keycloak.tokenParsed.name as string || keycloak.tokenParsed.preferred_username as string || "Usuario",
        email: keycloak.tokenParsed.email as string || "",
      }
    : null;

  const handleLogout = () => {
    keycloak.logout();
  };

  return (
    <>
      <MenuBar user={user} onLogout={handleLogout} />
      {children}
    </>
  );
}
