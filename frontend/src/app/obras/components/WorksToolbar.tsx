"use client";

import { ChangeEvent } from "react";

import { ActionButton } from "@/components/ui/Button";

import styles from "./WorksToolbar.module.scss";

type WorksToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  showDeleted: boolean;
  onToggleDeleted: (checked: boolean) => void;
  onAddWork: () => void;
};

export function WorksToolbar({
  search,
  onSearchChange,
  showDeleted,
  onToggleDeleted,
  onAddWork,
}: WorksToolbarProps) {
  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  const handleToggleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleDeleted(event.target.checked);
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.controls}>
        <label className={styles.searchField}>
          <span className={styles.searchLabel}>Buscar obras</span>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Título o descripción..."
            value={search}
            onChange={handleSearchChange}
          />
        </label>

        <label className={styles.toggle}>
          <input type="checkbox" checked={showDeleted} onChange={handleToggleChange} />
          Ver obras borradas
        </label>
      </div>

      <ActionButton type="button" onClick={onAddWork}>
        Agregar obra
      </ActionButton>
    </div>
  );
}
