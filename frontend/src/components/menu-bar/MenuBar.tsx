"use client";

import Link from "next/link";
import { ActionButton, LinkButton } from "@/components/ui/Button";

import styles from "./MenuBar.module.scss";

export type MenuBarProps = {
  user: { name: string } | null;
  onLoginClick: () => void;
  onLogout: () => void;
};

export function MenuBar({ user, onLoginClick, onLogout }: MenuBarProps) {
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

      {user ? (
        <div className={styles.actions}>
          <span className={styles.greeting}>Hola, {user.name}</span>
          <ActionButton variant="ghost" type="button" onClick={onLogout}>
            Cerrar sesión
          </ActionButton>
        </div>
      ) : (
        <div className={styles.actions}>
          <ActionButton type="button" onClick={onLoginClick}>
            Iniciar sesión
          </ActionButton>
          <LinkButton href="/register">Registrarse</LinkButton>
        </div>
      )}
    </header>
  );
}
