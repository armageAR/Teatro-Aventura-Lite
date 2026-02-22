"use client";

import Link from "next/link";

import styles from "./PerformancesTable.module.scss";

type SortKey = "playTitle" | "scheduledAt" | "location";

type SortDirection = "asc" | "desc";

type PerformanceRow = {
  id: number;
  playTitle: string;
  scheduledAt: string;
  location: string;
  status: "upcoming" | "past";
};

type PerformancesTableProps = {
  performances: PerformanceRow[];
  loading: boolean;
  error: string | null;
  sortBy: SortKey;
  sortDirection: SortDirection;
  onSortChange: (key: SortKey) => void;
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateFormatter.format(date);
}

function renderSortIndicator(active: boolean, direction: SortDirection) {
  if (!active) {
    return <span className={styles.sortIndicator}>↕</span>;
  }

  return <span className={styles.sortIndicator}>{direction === "asc" ? "↑" : "↓"}</span>;
}

export function PerformancesTable({
  performances,
  loading,
  error,
  sortBy,
  sortDirection,
  onSortChange,
}: PerformancesTableProps) {
  if (loading) {
    return <div className={styles.loadingState}>Cargando funciones...</div>;
  }

  if (error) {
    return <div className={styles.errorState}>{error}</div>;
  }

  if (performances.length === 0) {
    return <div className={styles.emptyState}>No hay funciones para mostrar.</div>;
  }

  const renderHeaderCell = (key: SortKey, label: string) => {
    const isActive = sortBy === key;
    const ariaSort = isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none";

    return (
      <th className={styles.headCell} aria-sort={ariaSort} scope="col">
        <button
          type="button"
          className={styles.sortButton}
          onClick={() => onSortChange(key)}
          aria-label={`Ordenar por ${label}`}
        >
          {label}
          {renderSortIndicator(isActive, sortDirection)}
        </button>
      </th>
    );
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headRow}>
            {renderHeaderCell("playTitle", "Obra")}
            {renderHeaderCell("scheduledAt", "Programada")}
            {renderHeaderCell("location", "Lugar")}
            <th className={styles.headCell} scope="col">
              Estado
            </th>
            <th className={styles.headCell} scope="col">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {performances.map((performance) => (
            <tr key={performance.id}>
              <td className={`${styles.bodyCell} ${styles.title}`}>{performance.playTitle}</td>
              <td className={styles.bodyCell}>{formatDate(performance.scheduledAt)}</td>
              <td className={styles.bodyCell}>{performance.location || "-"}</td>
              <td className={`${styles.bodyCell} ${styles.status} ${performance.status === "upcoming" ? styles.statusUpcoming : styles.statusPast}`}>
                {performance.status === "upcoming" ? "Futura" : "Pasada"}
              </td>
              <td className={styles.bodyCell}>
                <Link href={`/funciones/${performance.id}`} className={styles.detailLink}>
                  Ver detalle
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type { PerformanceRow, SortDirection, SortKey };
