"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { ActionButton } from "@/components/ui/Button";

import styles from "./UserFormModal.module.scss";
import type { AppUser } from "./UsersTable";

type UserPayload = {
  name: string;
  email: string;
  role: "admin" | "producer";
};

type UserFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialUser: AppUser | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: UserPayload) => void | Promise<void>;
};

export function UserFormModal({
  open,
  mode,
  initialUser,
  submitting,
  error,
  onClose,
  onSubmit,
}: UserFormModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "producer">("producer");

  useEffect(() => {
    if (!open) {
      setName("");
      setEmail("");
      setRole("producer");
      return;
    }

    if (initialUser) {
      setName(initialUser.name);
      setEmail(initialUser.email);
      setRole(initialUser.role);
    } else {
      setName("");
      setEmail("");
      setRole("producer");
    }
  }, [open, initialUser]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ name, email, role });
  };

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRole(event.target.value as "admin" | "producer");
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === "create" ? "Nuevo usuario" : "Editar usuario"}
          </h2>
          <ActionButton variant="ghost" type="button" onClick={onClose} disabled={submitting}>
            Cerrar
          </ActionButton>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="user-name">
              Nombre
            </label>
            <input
              id="user-name"
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="user-email">
              Email
            </label>
            <input
              id="user-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="user-role">
              Rol
            </label>
            <select
              id="user-role"
              className={styles.select}
              value={role}
              onChange={handleRoleChange}
              required
            >
              <option value="producer">Productor</option>
              <option value="admin">Administrador</option>
            </select>
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
