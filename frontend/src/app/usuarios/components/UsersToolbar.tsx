"use client";

import { ActionButton } from "@/components/ui/Button";

import styles from "./UsersToolbar.module.scss";

type UsersToolbarProps = {
  onAddUser: () => void;
};

export function UsersToolbar({ onAddUser }: UsersToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <ActionButton type="button" onClick={onAddUser}>
        Agregar usuario
      </ActionButton>
    </div>
  );
}
