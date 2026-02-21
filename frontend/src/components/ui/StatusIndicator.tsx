"use client";

import styles from "./StatusIndicator.module.scss";

export type StatusIndicatorProps = {
  status: "success" | "error" | "warning" | "info";
  label?: string;
  size?: "small" | "medium" | "large";
  className?: string;
};

export function StatusIndicator({
  status,
  label,
  size = "medium",
  className,
}: StatusIndicatorProps) {
  const classes = [styles.indicator, styles[status], styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      aria-label={label ?? status}
      role="status"
      title={label}
    />
  );
}
