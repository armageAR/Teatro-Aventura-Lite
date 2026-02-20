"use client";

import { FormEvent, useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/Button";

import styles from "./QuestionFormModal.module.scss";
import type { Question } from "./QuestionsTable";

type QuestionPayload = {
  question: string;
  observations: string;
};

type QuestionFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialQuestion: Question | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: QuestionPayload) => void | Promise<void>;
};

export function QuestionFormModal({
  open,
  mode,
  initialQuestion,
  submitting,
  error,
  onClose,
  onSubmit,
}: QuestionFormModalProps) {
  const [question, setQuestion] = useState("");
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (!open) {
      setQuestion("");
      setObservations("");
      return;
    }

    if (initialQuestion) {
      setQuestion(initialQuestion.question ?? "");
      setObservations(initialQuestion.observations ?? "");
    } else {
      setQuestion("");
      setObservations("");
    }
  }, [open, initialQuestion]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ question, observations });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === "create" ? "Nueva pregunta" : "Editar pregunta"}
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
            <label className={styles.label} htmlFor="play-question">
              Pregunta
            </label>
            <textarea
              id="play-question"
              className={`${styles.textarea}`}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="¿Qué se le pregunta al público?"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="play-question-observations">
              Observaciones
            </label>
            <textarea
              id="play-question-observations"
              className={styles.textarea}
              value={observations}
              onChange={(event) => setObservations(event.target.value)}
              placeholder="Notas para el equipo creativo (opcional)"
            />
            <span className={styles.hint}>Máximo 500 caracteres.</span>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.footer}>
            <ActionButton
              variant="ghost"
              type="button"
              onClick={onClose}
              disabled={submitting}
            >
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
