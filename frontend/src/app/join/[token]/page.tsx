"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";

import styles from "./page.module.scss";

type JoinResponseApi = {
  spectator_session_id: string;
  performance_id: number;
  performance_status: string;
  play_title: string | null;
};

function statusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Esperando que comience la función";
    case "live":
      return "Función en vivo";
    case "closed":
      return "Función finalizada";
    default:
      return status;
  }
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinData, setJoinData] = useState<JoinResponseApi | null>(null);

  const storageKey = `spectator_session_${token}`;

  const join = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Check localStorage for existing session
      if (typeof window !== "undefined") {
        const existing = localStorage.getItem(storageKey);
        if (existing) {
          try {
            const parsed = JSON.parse(existing) as JoinResponseApi;
            setJoinData(parsed);
            setLoading(false);
            return;
          } catch {
            localStorage.removeItem(storageKey);
          }
        }
      }

      // Join the performance
      const response = await api.post<JoinResponseApi>(
        "/api/performances/join",
        { token }
      );

      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, JSON.stringify(response.data));
      }
      setJoinData(response.data);
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 404) {
          setError(
            "Función no encontrada. Verificá que el código QR sea correcto."
          );
        } else {
          setError("Error al unirte a la función. Intentá de nuevo.");
        }
      } else {
        setError("Error inesperado. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, storageKey]);

  useEffect(() => {
    if (token) {
      join();
    }
  }, [token, join]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loadingText}>Uniéndote a la función...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorBox}>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!joinData) return null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.welcomeBox}>
          <h1 className={styles.title}>¡Bienvenido!</h1>
          {joinData.play_title && (
            <p className={styles.playTitle}>{joinData.play_title}</p>
          )}
          <div className={styles.statusBadge}>
            {statusLabel(joinData.performance_status)}
          </div>
          <p className={styles.sessionInfo}>
            Tu sesión ha sido registrada. Pronto podrás participar en la
            votación.
          </p>
        </div>
      </div>
    </div>
  );
}
