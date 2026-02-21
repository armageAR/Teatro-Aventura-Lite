"use client";

import styles from "./LoadingSpinner.module.scss";

export type LoadingSpinnerProps = {
  size?: "small" | "medium" | "large";
  label?: string;
  className?: string;
};

export function LoadingSpinner({
  size = "medium",
  label = "Cargando",
  className,
}: LoadingSpinnerProps) {
  const classes = [styles.spinner, styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} aria-label={label} role="status">
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
