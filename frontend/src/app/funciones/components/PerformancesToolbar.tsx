"use client";

import { ActionButton } from "@/components/ui/Button";

import styles from "./PerformancesToolbar.module.scss";

type FilterOption = "upcoming" | "past" | "all";

type PerformancesToolbarProps = {
  filter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  loading: boolean;
  onReload: () => void;
};

export function PerformancesToolbar({ filter, onFilterChange, loading, onReload }: PerformancesToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filters}>
        <label htmlFor="performances-filter">Mostrar</label>
        <select
          id="performances-filter"
          className={styles.select}
          value={filter}
          onChange={(event) => onFilterChange(event.target.value as FilterOption)}
          disabled={loading}
        >
          <option value="upcoming">Solo funciones futuras</option>
          <option value="past">Solo funciones pasadas</option>
          <option value="all">Futuras y pasadas</option>
        </select>
      </div>

      <div className={styles.actions}>
        <ActionButton type="button" variant="ghost" onClick={onReload} disabled={loading}>
          Recargar
        </ActionButton>
      </div>
    </div>
  );
}

export type { FilterOption };
