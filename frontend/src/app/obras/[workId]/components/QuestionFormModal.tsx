"use client";

import { FormEvent, useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/Button";

import styles from "./QuestionFormModal.module.scss";
import type { Question } from "./QuestionsTable";

export type InlineOption = {
  id?: number;
  text: string;
};

type QuestionPayload = {
  question: string;
  observations: string;
  options: InlineOption[];
};

type QuestionFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialQuestion: Question | null;
  initialOptions?: InlineOption[];
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: QuestionPayload) => void | Promise<void>;
};

export function QuestionFormModal({
  open,
  mode,
  initialQuestion,
  initialOptions,
  submitting,
  error,
  onClose,
  onSubmit,
}: QuestionFormModalProps) {
  const [question, setQuestion] = useState("");
  const [observations, setObservations] = useState("");
  const [inlineOptions, setInlineOptions] = useState<InlineOption[]>([]);

  useEffect(() => {
    if (!open) {
      setQuestion("");
      setObservations("");
      setInlineOptions([]);
      return;
    }

    if (initialQuestion) {
      setQuestion(initialQuestion.question ?? "");
      setObservations(initialQuestion.observations ?? "");
    } else {
      setQuestion("");
      setObservations("");
    }

    setInlineOptions(initialOptions ? [...initialOptions] : []);
  }, [open, initialQuestion, initialOptions]);

  if (!open) {
    return null;
  }

  const addOption = () => {
    setInlineOptions((prev) => [...prev, { text: "" }]);
  };

  const updateOption = (index: number, text: string) => {
    setInlineOptions((prev) => prev.map((o, i) => (i === index ? { ...o, text } : o)));
  };

  const removeOption = (index: number) => {
    setInlineOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      question,
      observations,
      options: inlineOptions.filter((o) => o.text.trim() !== ""),
    });
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

          <div className={styles.optionsSection}>
            <div className={styles.optionsSectionHeader}>
              <span className={styles.label}>Opciones de respuesta</span>
              <ActionButton
                type="button"
                variant="ghost"
                onClick={addOption}
                disabled={submitting}
              >
                + Añadir opción
              </ActionButton>
            </div>

            {inlineOptions.length === 0 ? (
              <p className={styles.hint}>
                Sin opciones. Hacé clic en &ldquo;+ Añadir opción&rdquo; para agregar.
              </p>
            ) : (
              <div className={styles.optionsList}>
                {inlineOptions.map((option, index) => (
                  <div key={index} className={styles.optionRow}>
                    <input
                      type="text"
                      className={`${styles.input} ${styles.optionInput}`}
                      value={option.text}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Opción ${index + 1}`}
                      disabled={submitting}
                    />
                    <ActionButton
                      type="button"
                      variant="danger"
                      onClick={() => removeOption(index)}
                      disabled={submitting}
                      aria-label={`Eliminar opción ${index + 1}`}
                    >
                      ×
                    </ActionButton>
                  </div>
                ))}
              </div>
            )}
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
