"use client";

import { ActionButton } from "@/components/ui/Button";

import styles from "./ConfirmOptionDeleteModal.module.scss";

export type ConfirmOptionDeleteModalProps = {
  open: boolean;
  optionLabel: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmOptionDeleteModal({
  open,
  optionLabel,
  submitting,
  onCancel,
  onConfirm,
}: ConfirmOptionDeleteModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h2 className={styles.title}>¿Eliminar opción?</h2>
        <p className={styles.message}>
          La opción &quot;{optionLabel}&quot; dejará de estar disponible para el público. Podrás crear una
          nueva cuando quieras.
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
