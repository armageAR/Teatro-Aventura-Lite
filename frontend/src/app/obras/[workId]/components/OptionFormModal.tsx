"use client";

import { FormEvent, useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/Button";

import styles from "./OptionFormModal.module.scss";
import type { Option } from "./OptionsTable";

type OptionPayload = {
  text: string;
  notes: string;
};

type OptionFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialOption: Option | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: OptionPayload) => void | Promise<void>;
};

export function OptionFormModal({
  open,
  mode,
  initialOption,
  submitting,
  error,
  onClose,
  onSubmit,
}: OptionFormModalProps) {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) {
      setText("");
      setNotes("");
      return;
    }

    if (initialOption) {
      setText(initialOption.text ?? "");
      setNotes(initialOption.notes ?? "");
    } else {
      setText("");
      setNotes("");
    }
  }, [open, initialOption]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      text: text.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === "create" ? "Nueva opción" : "Editar opción"}
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
            <label className={styles.label} htmlFor="option-text">
              Texto de la opción
            </label>
            <textarea
              id="option-text"
              className={styles.textarea}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="¿Qué puede responder el público?"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="option-notes">
              Notas internas
            </label>
            <textarea
              id="option-notes"
              className={styles.textarea}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Notas para el equipo creativo (opcional)"
            />
            <span className={styles.hint}>Máximo 500 caracteres.</span>
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
