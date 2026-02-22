"use client";

import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

import { useApi } from "@/hooks/useApi";

import styles from "./page.module.scss";

type PerformanceDetailApi = {
  id: number;
  play_id: number;
  status: string;
  join_token: string;
  uid: string;
  scheduled_at: string;
  location: string;
  comment?: string | null;
  created_at?: string | null;
  play?: {
    id: number;
    title: string;
    description?: string | null;
  } | null;
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  live: "En vivo",
  closed: "Cerrada",
  canceled: "Cancelada",
};

export default function PerformanceDetailPage() {
  const params = useParams();
  const api = useApi();

  const performanceId = params.performanceId as string;

  const [performance, setPerformance] = useState<PerformanceDetailApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<PerformanceDetailApi>(`/api/performances/${performanceId}`);
      setPerformance(response.data);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setError(message ?? "No se pudo cargar la función.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo cargar la función.");
      }
    } finally {
      setLoading(false);
    }
  }, [api, performanceId]);

  const handleStart = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await api.patch<PerformanceDetailApi>(`/api/performances/${performanceId}/start`);
      setPerformance(response.data);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setActionError(message ?? "No se pudo iniciar la función.");
      } else {
        setActionError("No se pudo iniciar la función.");
      }
    } finally {
      setActionLoading(false);
    }
  }, [api, performanceId]);

  const handleClose = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await api.patch<PerformanceDetailApi>(`/api/performances/${performanceId}/close`);
      setPerformance(response.data);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setActionError(message ?? "No se pudo cerrar la función.");
      } else {
        setActionError("No se pudo cerrar la función.");
      }
    } finally {
      setActionLoading(false);
    }
  }, [api, performanceId]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <p className={styles.loading}>Cargando función...</p>
        </div>
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <Link href="/funciones" className={styles.backLink}>← Volver a funciones</Link>
          <p className={styles.error}>{error ?? "No se encontró la función."}</p>
        </div>
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[performance.status] ?? performance.status;

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${performance.join_token}`
      : `/join/${performance.join_token}`;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <Link href="/funciones" className={styles.backLink}>← Volver a funciones</Link>

        <div className={styles.headingGroup}>
          <h1 className={styles.heading}>Detalle de función</h1>
          {performance.play && (
            <p className={styles.subheading}>{performance.play.title}</p>
          )}
        </div>

        <dl className={styles.detailList}>
          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>Estado</dt>
            <dd className={`${styles.detailValue} ${styles[`status_${performance.status}`] ?? ""}`}>
              {statusLabel}
            </dd>
          </div>

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>Fecha y hora</dt>
            <dd className={styles.detailValue}>{formatDate(performance.scheduled_at)}</dd>
          </div>

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>Lugar</dt>
            <dd className={styles.detailValue}>{performance.location || "-"}</dd>
          </div>

          {performance.comment && (
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Comentarios</dt>
              <dd className={styles.detailValue}>{performance.comment}</dd>
            </div>
          )}

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>UID interno</dt>
            <dd className={`${styles.detailValue} ${styles.token}`}>{performance.uid}</dd>
          </div>
        </dl>

        <section className={styles.actionsSection}>
          <h2 className={styles.actionsHeading}>Acciones</h2>
          {actionError && <p className={styles.actionError}>{actionError}</p>}
          <div className={styles.actionsRow}>
            {performance.status === "draft" && (
              <button
                className={styles.btnStart}
                onClick={handleStart}
                disabled={actionLoading}
              >
                {actionLoading ? "Iniciando..." : "Iniciar función"}
              </button>
            )}
            {performance.status === "live" && (
              <button
                className={styles.btnClose}
                onClick={handleClose}
                disabled={actionLoading}
              >
                {actionLoading ? "Cerrando..." : "Cerrar función"}
              </button>
            )}
            {performance.status === "closed" && (
              <p className={styles.statusMessage}>La función ha sido cerrada.</p>
            )}
          </div>
        </section>

        <section className={styles.qrSection}>
          <h2 className={styles.qrHeading}>Código QR de acceso</h2>
          <div className={styles.qrContainer}>
            <QRCodeSVG value={joinUrl} size={220} />
          </div>
          <p className={styles.qrLabel}>URL de acceso para el público:</p>
          <p className={`${styles.token} ${styles.qrUrl}`}>{joinUrl}</p>
        </section>
      </div>
    </div>
  );
}
