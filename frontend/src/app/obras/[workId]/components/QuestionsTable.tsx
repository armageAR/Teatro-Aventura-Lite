"use client";

import { ActionButton } from "@/components/ui/Button";

import styles from "./QuestionsTable.module.scss";

export type Question = {
  id: number;
  question: string;
  order: number;
  observations: string;
  optionsCount: number;
  deletedAt: string | null;
};

type Direction = "up" | "down";

type QuestionsTableProps = {
  questions: Question[];
  loading: boolean;
  error: string | null;
  reordering: boolean;
  onEdit: (question: Question) => void;
  onDelete: (question: Question) => void;
  onMove: (question: Question, direction: Direction) => void;
  onManageOptions: (question: Question) => void;
};

export function QuestionsTable({
  questions,
  loading,
  error,
  reordering,
  onEdit,
  onDelete,
  onMove,
  onManageOptions,
}: QuestionsTableProps) {
  if (loading) {
    return <div className={styles.loadingState}>Cargando preguntas...</div>;
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  if (questions.length === 0) {
    return <div className={styles.emptyState}>No hay preguntas para esta obra.</div>;
  }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headRow}>
            <th className={styles.headCell}>Orden</th>
            <th className={styles.headCell}>Pregunta</th>
            <th className={styles.headCell}>Observaciones</th>
            <th className={styles.headCell}>Opciones</th>
            <th className={styles.headCell} aria-label="Acciones" />
          </tr>
        </thead>
        <tbody>
          {questions.map((question, index) => {
            const canMoveUp = index > 0;
            const canMoveDown = index < questions.length - 1;

            return (
              <tr
                key={question.id}
                className={question.deletedAt ? styles.bodyRowDeleted : undefined}
              >
                <td className={styles.bodyCell}>{question.order}</td>
                <td className={`${styles.bodyCell} ${styles.question}`}>{question.question}</td>
                <td className={styles.bodyCell}>
                  {question.observations ? (
                    <span className={styles.observations}>{question.observations}</span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className={styles.bodyCell}>{question.optionsCount}</td>
                <td className={styles.bodyCell}>
                  <div className={styles.actions}>
                    <div className={styles.reorderControls}>
                      <ActionButton
                        type="button"
                        variant="ghost"
                        disabled={!canMoveUp || reordering}
                        onClick={() => onMove(question, "up")}
                        aria-label="Mover hacia arriba"
                      >
                        Subir
                      </ActionButton>
                      <ActionButton
                        type="button"
                        variant="ghost"
                        disabled={!canMoveDown || reordering}
                        onClick={() => onMove(question, "down")}
                        aria-label="Mover hacia abajo"
                      >
                        Bajar
                      </ActionButton>
                    </div>

                    <ActionButton
                      type="button"
                      variant="ghost"
                      onClick={() => onEdit(question)}
                    >
                      Editar
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant="ghost"
                      onClick={() => onManageOptions(question)}
                    >
                      Opciones
                    </ActionButton>
                    <ActionButton
                      type="button"
                      variant="danger"
                      onClick={() => onDelete(question)}
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
