"use client";

import { ActionButton } from "@/components/ui/Button";

import styles from "./ConfirmDialog.module.scss";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "solid" | "danger";
  submitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmVariant = "danger",
  submitting = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.footer}>
          <ActionButton
            variant="ghost"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            {cancelText}
          </ActionButton>
          <ActionButton
            variant={confirmVariant}
            type="button"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Procesando..." : confirmText}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
