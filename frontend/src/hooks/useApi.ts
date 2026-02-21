"use client";

import { useEffect } from "react";
import { api } from "@/lib/api";
import { useKeycloak } from "@/providers/KeycloakProvider";

export function useApi() {
  const { keycloak } = useKeycloak();

  useEffect(() => {
    const interceptor = api.interceptors.request.use((config) => {
      if (keycloak.token) {
        config.headers.Authorization = `Bearer ${keycloak.token}`;
      }
      return config;
    });

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [keycloak.token]);

  return api;
}
