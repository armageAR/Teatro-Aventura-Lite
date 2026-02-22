"use client";

import { ActionButton, LinkButton } from "@/components/ui/Button";

import styles from "./WorksTable.module.scss";

export type Work = {
  id: number;
  title: string;
  description?: string;
  coverImageUrl?: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
};

type WorksTableProps = {
  works: Work[];
  loading: boolean;
  error: string | null;
  onEdit: (work: Work) => void;
  onDelete: (work: Work) => void;
  onRestore: (work: Work) => void;
  restoringId: number | null;
  onCreatePerformance: (work: Work) => void;
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

export function WorksTable({
  works,
  loading,
  error,
  onEdit,
  onDelete,
  onRestore,
  restoringId,
  onCreatePerformance,
}: WorksTableProps) {
  if (loading) {
    return <div className={styles.loadingState}>Cargando obras...</div>;
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  if (works.length === 0) {
    return <div className={styles.emptyState}>No hay obras para mostrar.</div>;
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headRow}>
            <th className={styles.headCell}>Título</th>
            <th className={styles.headCell}>Última actualización</th>
            <th className={styles.headCell}>Eliminada</th>
            <th className={styles.headCell} aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {works.map((work) => {
            const isDeleted = Boolean(work.deletedAt);
            const isRestoring = restoringId === work.id;

            return (
            <tr
              key={work.id}
              className={work.deletedAt ? styles.rowDeleted : undefined}
            >
              <td className={`${styles.bodyCell} ${styles.title}`}>{work.title}</td>
              <td className={styles.bodyCell}>{formatDate(work.updatedAt)}</td>
              <td className={styles.bodyCell}>{formatDate(work.deletedAt)}</td>
              <td className={styles.bodyCell}>
                <div className={styles.actions}>
                  {isDeleted ? (
                    <ActionButton
                      type="button"
                      onClick={() => onRestore(work)}
                      disabled={isRestoring}
                    >
                      {isRestoring ? "Restaurando..." : "Restaurar"}
                    </ActionButton>
                  ) : (
                    <>
                      <LinkButton
                        href={`/obras/${work.id}`}
                        variant="ghost"
                      >
                        Gestionar
                      </LinkButton>
                      <ActionButton
                        type="button"
                        variant="ghost"
                        onClick={() => onCreatePerformance(work)}
                      >
                        Crear función
                      </ActionButton>
                      <ActionButton
                        type="button"
                        variant="ghost"
                        onClick={() => onEdit(work)}
                      >
                        Editar
                      </ActionButton>
                      <ActionButton
                        type="button"
                        variant="danger"
                        onClick={() => onDelete(work)}
                      >
                        Borrar
                      </ActionButton>
                    </>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
