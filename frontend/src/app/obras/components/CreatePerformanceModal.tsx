"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/Button";

import styles from "./CreatePerformanceModal.module.scss";

function getDefaultDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

type CreatePerformancePayload = {
  scheduledAt: string;
  location: string;
  comment: string;
};

type CreatePerformanceModalProps = {
  open: boolean;
  workTitle: string;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: CreatePerformancePayload) => void | Promise<void>;
};

export function CreatePerformanceModal({
  open,
  workTitle,
  submitting,
  error,
  onClose,
  onSubmit,
}: CreatePerformanceModalProps) {
  const defaultDateTime = useMemo(() => getDefaultDateTimeLocal(), []);
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime);
  const [location, setLocation] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!open) {
      setScheduledAt(getDefaultDateTimeLocal());
      setLocation("");
      setComment("");
      return;
    }

    setScheduledAt(getDefaultDateTimeLocal());
    setLocation("");
    setComment("");
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!scheduledAt) {
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      return;
    }

    onSubmit({
      scheduledAt: scheduledDate.toISOString(),
      location: location.trim(),
      comment: comment.trim(),
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>Nueva función para &quot;{workTitle}&quot;</h2>
          <ActionButton variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cerrar
          </ActionButton>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="performance-scheduled-at">
              Fecha y hora
            </label>
            <input
              id="performance-scheduled-at"
              className={styles.input}
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              required
            />
            <span className={styles.hint}>Utilizá la hora local en la que se presentará la obra.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="performance-location">
              Lugar
            </label>
            <input
              id="performance-location"
              className={styles.input}
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Teatro, sala o institución"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="performance-comment">
              Comentarios
            </label>
            <textarea
              id="performance-comment"
              className={styles.textarea}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Notas internas opcionales (máx. 500 caracteres)"
              maxLength={500}
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.footer}>
            <ActionButton variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </ActionButton>
            <ActionButton type="submit" disabled={submitting}>
              {submitting ? "Creando..." : "Crear función"}
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
}
