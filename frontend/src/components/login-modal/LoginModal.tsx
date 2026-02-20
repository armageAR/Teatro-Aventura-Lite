"use client";

import { useEffect, useState, type FormEvent } from "react";

import { ActionButton } from "@/components/ui/Button";

import styles from "./LoginModal.module.scss";

export type LoginModalProps = {
  open: boolean;
  isSubmitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (credentials: {
    email: string;
    password: string;
  }) => Promise<void> | void;
};

export function LoginModal({
  open,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ email, password });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2>Iniciar sesión</h2>
          <ActionButton
            variant="ghost"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cerrar
          </ActionButton>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Email / Username
            <input
              className={styles.input}
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className={styles.label}>
            Contraseña
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <ActionButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Iniciando..." : "Entrar"}
          </ActionButton>
        </form>
      </div>
    </div>
  );
}
