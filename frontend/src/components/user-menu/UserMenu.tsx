"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./UserMenu.module.scss";

export type UserMenuProps = {
  name: string;
  role: string;
  onLogout: () => void;
};

export function UserMenu({ name, role, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Generar iniciales del nombre
  const getInitials = (fullName: string): string => {
    const parts = fullName.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleLogoutClick = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className={styles.userMenu} ref={menuRef}>
      <button
        className={styles.avatar}
        onClick={handleToggle}
        aria-label="Menu de usuario"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className={styles.initials}>{initials}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.userInfo}>
            <div className={styles.userName}>{name}</div>
            <div className={styles.userRole}>{role}</div>
          </div>
          <div className={styles.separator} />
          <button className={styles.logoutButton} onClick={handleLogoutClick}>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
