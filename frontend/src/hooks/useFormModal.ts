"use client";

import { useState, useCallback } from "react";

export type FormModalMode = "create" | "edit";

export interface UseFormModalOptions<T> {
  initialValues: T;
  onSubmit: (values: T, mode: FormModalMode) => Promise<void>;
}

export interface UseFormModalReturn<T> {
  // State
  isOpen: boolean;
  mode: FormModalMode;
  values: T;
  submitting: boolean;
  error: string | null;

  // Actions
  openCreate: () => void;
  openEdit: (editValues: T) => void;
  close: () => void;
  setValues: (values: T) => void;
  updateValue: <K extends keyof T>(key: K, value: T[K]) => void;
  handleSubmit: () => Promise<void>;
  clearError: () => void;
}

export function useFormModal<T>({
  initialValues,
  onSubmit,
}: UseFormModalOptions<T>): UseFormModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<FormModalMode>("create");
  const [values, setValues] = useState<T>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setMode("create");
    setValues(initialValues);
    setError(null);
    setIsOpen(true);
  }, [initialValues]);

  const openEdit = useCallback((editValues: T) => {
    setMode("edit");
    setValues(editValues);
    setError(null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setValues(initialValues);
    setError(null);
    setSubmitting(false);
  }, [initialValues]);

  const updateValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(values, mode);
      close();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [values, mode, onSubmit, close]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isOpen,
    mode,
    values,
    submitting,
    error,
    openCreate,
    openEdit,
    close,
    setValues,
    updateValue,
    handleSubmit,
    clearError,
  };
}
