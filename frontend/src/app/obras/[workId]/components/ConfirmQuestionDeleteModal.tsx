"use client";

import { ActionButton } from "@/components/ui/Button";

import styles from "./ConfirmQuestionDeleteModal.module.scss";

export type ConfirmQuestionDeleteModalProps = {
  open: boolean;
  questionLabel: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmQuestionDeleteModal({
  open,
  questionLabel,
  submitting,
  onCancel,
  onConfirm,
}: ConfirmQuestionDeleteModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h2 className={styles.title}>¿Eliminar pregunta?</h2>
        <p className={styles.message}>
          La pregunta &quot;{questionLabel}&quot; quedará en la papelera de esta obra. Podrás volver a
          crearla más adelante si lo necesitás.
        </p>

        <div className={styles.footer}>
          <ActionButton
            variant="ghost"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </ActionButton>
          <ActionButton
            variant="danger"
            type="button"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Eliminando..." : "Eliminar"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
