"use client";

import { ActionButton } from "@/components/ui/Button";

import styles from "./UsersTable.module.scss";

export type AppUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "producer";
  keycloak_sub: string | null;
  updated_at: string | null;
};

type UsersTableProps = {
  users: AppUser[];
  loading: boolean;
  error: string | null;
  onEdit: (user: AppUser) => void;
  onDelete: (user: AppUser) => void;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  producer: "Productor",
};

export function UsersTable({ users, loading, error, onEdit, onDelete }: UsersTableProps) {
  if (loading) {
    return <div className={styles.loadingState}>Cargando usuarios...</div>;
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  if (users.length === 0) {
    return <div className={styles.emptyState}>No hay usuarios registrados.</div>;
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headRow}>
            <th className={styles.headCell}>Nombre</th>
            <th className={styles.headCell}>Email</th>
            <th className={styles.headCell}>Rol</th>
            <th className={styles.headCell} aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className={`${styles.bodyCell} ${styles.name}`}>{user.name}</td>
              <td className={styles.bodyCell}>{user.email}</td>
              <td className={styles.bodyCell}>
                <span className={`${styles.roleBadge} ${styles[`role_${user.role}`]}`}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </span>
              </td>
              <td className={styles.bodyCell}>
                <div className={styles.actions}>
                  <ActionButton type="button" variant="ghost" onClick={() => onEdit(user)}>
                    Editar
                  </ActionButton>
                  <ActionButton type="button" variant="danger" onClick={() => onDelete(user)}>
                    Eliminar
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
