"use client";

import Link from "next/link";
import { ActionButton } from "@/components/ui/Button";
import { UserMenu } from "@/components/user-menu/UserMenu";

import styles from "./MenuBar.module.scss";

export type MenuBarProps = {
  user: { name: string; role: string } | null;
  onLogin: () => void;
  onLogout: () => void;
};

export function MenuBar({ user, onLogin, onLogout }: MenuBarProps) {
  return (
    <header className={styles.menuBar}>
      <div className={styles.left}>
        <Link href="/" className={styles.brand}>
          Teatro Aventura Lite
        </Link>

        {user && (
          <nav className={styles.nav} aria-label="Navegación principal">
            <Link href="/obras" className={styles.navLink}>
              Obras
            </Link>
            <Link href="/funciones" className={styles.navLink}>
              Funciones
            </Link>
          </nav>
        )}
      </div>

      <div className={styles.actions}>
        {user ? (
          <UserMenu name={user.name} role={user.role} onLogout={onLogout} />
        ) : (
          <ActionButton variant="solid" type="button" onClick={onLogin}>
            Ingresar
          </ActionButton>
        )}
      </div>
    </header>
  );
}
