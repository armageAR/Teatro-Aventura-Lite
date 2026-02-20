"use client";

import { FormEvent, useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/Button";

import styles from "./WorkFormModal.module.scss";
import type { Work } from "./WorksTable";

type WorkPayload = {
  title: string;
  description: string;
};

type WorkFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialWork: Work | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: WorkPayload) => void | Promise<void>;
};

export function WorkFormModal({
  open,
  mode,
  initialWork,
  submitting,
  error,
  onClose,
  onSubmit,
}: WorkFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      return;
    }

    if (initialWork) {
      setTitle(initialWork.title ?? "");
      setDescription(initialWork.description ?? "");
    } else {
      setTitle("");
      setDescription("");
    }
  }, [open, initialWork]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ title, description });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === "create" ? "Nueva obra" : "Editar obra"}
          </h2>
          <ActionButton
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cerrar
          </ActionButton>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="work-title">
              Título
            </label>
            <input
              id="work-title"
              className={styles.input}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="work-description">
              Sinopsis
            </label>
            <textarea
              id="work-description"
              className={styles.textarea}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="¿Cómo empieza la aventura?"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.footer}>
            <ActionButton variant="ghost" type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </ActionButton>
            <ActionButton type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Guardar"}
            </ActionButton>
          </div>
        </form>
      </div>
    </div>
  );
}
