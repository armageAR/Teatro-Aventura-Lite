"use client";

import { ActionButton } from "@/components/ui/Button";

import styles from "./ConfirmDeleteModal.module.scss";

export type ConfirmDeleteModalProps = {
  open: boolean;
  workTitle: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  open,
  workTitle,
  submitting,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h2 className={styles.title}>¿Eliminar obra?</h2>
        <p className={styles.message}>
          Esta acción enviará la obra &quot;{workTitle}&quot; a la papelera.
          Podrás verla si activas &quot;Ver obras borradas&quot;.
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
