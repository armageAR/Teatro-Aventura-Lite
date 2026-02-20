"use client";

import { ActionButton } from "@/components/ui/Button";

import styles from "./OptionsTable.module.scss";

export type Option = {
  id: number;
  text: string;
  order: number;
  notes: string;
  nextQuestionId: number | null;
  nextQuestionLabel: string | null;
  deletedAt: string | null;
};

type Direction = "up" | "down";

type OptionsTableProps = {
  options: Option[];
  loading: boolean;
  error: string | null;
  reordering: boolean;
  onEdit: (option: Option) => void;
  onDelete: (option: Option) => void;
  onMove: (option: Option, direction: Direction) => void;
};

export function OptionsTable({
  options,
  loading,
  error,
  reordering,
  onEdit,
  onDelete,
  onMove,
}: OptionsTableProps) {
  if (loading) {
    return <div className={styles.loadingState}>Cargando opciones...</div>;
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  if (options.length === 0) {
    return <div className={styles.emptyState}>No hay opciones para esta pregunta.</div>;
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headRow}>
            <th className={styles.headCell}>Orden</th>
            <th className={styles.headCell}>Texto</th>
            <th className={styles.headCell}>Notas</th>
            <th className={styles.headCell}>Siguiente pregunta</th>
            <th className={styles.headCell} aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {options.map((option, index) => {
            const canMoveUp = index > 0;
            const canMoveDown = index < options.length - 1;

            return (
              <tr
                key={option.id}
                className={option.deletedAt ? styles.bodyRowDeleted : undefined}
              >
                <td className={styles.bodyCell}>{option.order}</td>
                <td className={`${styles.bodyCell} ${styles.text}`}>{option.text}</td>
                <td className={styles.bodyCell}>
                  {option.notes ? <span className={styles.notes}>{option.notes}</span> : "-"}
                </td>
                <td className={styles.bodyCell}>
                  {option.nextQuestionLabel ?? (option.nextQuestionId ? `Pregunta #${option.nextQuestionId}` : "-")}
                </td>
                <td className={styles.bodyCell}>
                  <div className={styles.actions}>
                    <div className={styles.reorderControls}>
                      <ActionButton
                        type="button"
                        variant="ghost"
                        disabled={!canMoveUp || reordering}
                        onClick={() => onMove(option, "up")}
                        aria-label="Mover opción hacia arriba"
                      >
                        Subir
                      </ActionButton>
                      <ActionButton
                        type="button"
                        variant="ghost"
                        disabled={!canMoveDown || reordering}
                        onClick={() => onMove(option, "down")}
                        aria-label="Mover opción hacia abajo"
                      >
                        Bajar
                      </ActionButton>
                    </div>

                    <ActionButton
                      type="button"
                      variant="ghost"
                      onClick={() => onEdit(option)}
                    >
                      Editar
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant="danger"
                      onClick={() => onDelete(option)}
                    >
                      Borrar
                    </ActionButton>
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
