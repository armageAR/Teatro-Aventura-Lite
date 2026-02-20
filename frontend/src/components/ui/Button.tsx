"use client";

import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  PropsWithChildren,
} from "react";

import styles from "./Button.module.scss";

type Variant = "solid" | "ghost" | "danger";

type BaseProps = {
  variant?: Variant;
  className?: string;
};

export type ActionButtonProps = PropsWithChildren<
  BaseProps &
    ButtonHTMLAttributes<HTMLButtonElement>
>;

export function ActionButton({
  variant = "solid",
  className,
  children,
  ...props
}: ActionButtonProps) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

type LinkButtonProps = PropsWithChildren<
  BaseProps &
    AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
    }
>;

export function LinkButton({
  variant = "ghost",
  className,
  children,
  href,
  ...props
}: LinkButtonProps) {
  const classes = [styles.button, styles[variant], className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href={href} className={classes} {...props}>
      {children}
    </Link>
  );
}
