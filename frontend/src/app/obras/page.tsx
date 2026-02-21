"use client";

import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";

import { useApi } from "@/hooks/useApi";
import { WorksToolbar } from "./components/WorksToolbar";
import { WorksTable, type Work } from "./components/WorksTable";
import { WorkFormModal } from "./components/WorkFormModal";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { CreatePerformanceModal } from "./components/CreatePerformanceModal";
import styles from "./page.module.scss";

const WORKS_ENDPOINT = "/api/plays";

type WorkApi = {
  id: number;
  title: string;
  description?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  deleted_at?: string | null;
  deletedAt?: string | null;
};

function normalizeWork(work: WorkApi): Work {
  return {
    id: work.id,
    title: work.title,
    description: work.description ?? "",
    updatedAt: work.updated_at ?? work.updatedAt ?? null,
    deletedAt: work.deleted_at ?? work.deletedAt ?? null,
  };
}

export default function ObrasPage() {
  const api = useApi();
  const [works, setWorks] = useState<Work[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showDeleted, setShowDeleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Work | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const [performanceModalOpen, setPerformanceModalOpen] = useState(false);
  const [performanceSubmitting, setPerformanceSubmitting] = useState(false);
  const [performanceError, setPerformanceError] = useState<string | null>(null);
  const [performanceWork, setPerformanceWork] = useState<Work | null>(null);
  const [performanceMessage, setPerformanceMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchWorks = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<WorkApi[]>(WORKS_ENDPOINT, {
          params: {
            search: debouncedSearch || undefined,
            with_trashed: showDeleted ? 1 : 0,
          },
        });

        setWorks(response.data.map(normalizeWork));
      } catch (err) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message as string | undefined;
          setError(message ?? "No se pudieron cargar las obras.");
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("No se pudieron cargar las obras.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWorks();
  }, [debouncedSearch, showDeleted, api]);

  const displayedWorks = useMemo(() => {
    if (!debouncedSearch) {
      return works;
    }

    const term = debouncedSearch.toLowerCase();
    return works.filter((work) =>
      [work.title, work.description]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [works, debouncedSearch]);

  useEffect(() => {
    if (!performanceMessage) {
      return;
    }

    const timer = setTimeout(() => setPerformanceMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [performanceMessage]);

  const handleAddWork = () => {
    setFormMode("create");
    setSelectedWork(null);
    setFormError(null);
    setFormOpen(true);
  };

  const handleEditWork = (work: Work) => {
    setFormMode("edit");
    setSelectedWork(work);
    setFormError(null);
    setFormOpen(true);
  };

  const handleCreatePerformance = (work: Work) => {
    setPerformanceWork(work);
    setPerformanceError(null);
    setPerformanceModalOpen(true);
  };

  const closeForm = () => {
    if (formSubmitting) return;

    setFormOpen(false);
    setSelectedWork(null);
    setFormError(null);
  };

  const refreshWorks = async () => {
    try {
      const response = await api.get<WorkApi[]>(WORKS_ENDPOINT, {
        params: {
          search: debouncedSearch || undefined,
          with_trashed: showDeleted ? 1 : 0,
        },
      });

      setWorks(response.data.map(normalizeWork));
    } catch (err) {
      // Dejar que el próximo ciclo de efecto maneje el error si persiste
      console.error("Error al refrescar las obras", err);
    }
  };

  const closePerformanceModal = () => {
    if (performanceSubmitting) return;

    setPerformanceModalOpen(false);
    setPerformanceWork(null);
    setPerformanceError(null);
  };

  const handleSubmitPerformance = async (payload: {
    scheduledAt: string;
    location: string;
    comment: string;
  }) => {
    if (!performanceWork) {
      return;
    }

    setPerformanceSubmitting(true);
    setPerformanceError(null);

    try {
      const workTitle = performanceWork.title;

      await api.post(`${WORKS_ENDPOINT}/${performanceWork.id}/performances`, {
        scheduled_at: payload.scheduledAt,
        location: payload.location,
        comment: payload.comment ? payload.comment : null,
      });

      setPerformanceModalOpen(false);
      setPerformanceWork(null);
      setPerformanceMessage(`Función creada para "${workTitle}".`);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setPerformanceError(message ?? "No se pudo crear la función.");
      } else if (err instanceof Error) {
        setPerformanceError(err.message);
      } else {
        setPerformanceError("No se pudo crear la función.");
      }
    } finally {
      setPerformanceSubmitting(false);
    }
  };

  const handleSubmitWork = async (payload: { title: string; description: string }) => {
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (formMode === "create") {
        await api.post(WORKS_ENDPOINT, payload);
      } else if (selectedWork) {
        await api.put(`${WORKS_ENDPOINT}/${selectedWork.id}`, payload);
      }

      setFormOpen(false);
      setSelectedWork(null);
      await refreshWorks();
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setFormError(message ?? "No se pudo guardar la obra.");
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("No se pudo guardar la obra.");
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleRequestDelete = (work: Work) => {
    setDeleteTarget(work);
  };

  const handleCancelDelete = () => {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteSubmitting(true);

    try {
      await api.delete(`${WORKS_ENDPOINT}/${deleteTarget.id}`);
      setDeleteTarget(null);
      await refreshWorks();
    } catch (err) {
      console.error("No se pudo eliminar la obra", err);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleRestoreWork = async (work: Work) => {
    setRestoringId(work.id);

    try {
      await api.patch(`${WORKS_ENDPOINT}/${work.id}/restore`);
      await refreshWorks();
    } catch (err) {
      console.error("No se pudo restaurar la obra", err);
      setError("No se pudo restaurar la obra.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.headingGroup}>
          <h1 className={styles.heading}>Obras interactivas</h1>
          <p className={styles.description}>
            Administrá la cartelera, agregá nuevas aventuras y mantené un registro de aquellas
            historias que quedaron en pausa.
          </p>
        </div>

        <WorksToolbar
          search={search}
          onSearchChange={setSearch}
          showDeleted={showDeleted}
          onToggleDeleted={setShowDeleted}
          onAddWork={handleAddWork}
        />

        {performanceMessage && <div className={styles.success}>{performanceMessage}</div>}

        <div className={styles.tableArea}>
          <WorksTable
            works={displayedWorks}
            loading={loading}
            error={error}
            onEdit={handleEditWork}
            onDelete={handleRequestDelete}
            onRestore={handleRestoreWork}
            restoringId={restoringId}
            onCreatePerformance={handleCreatePerformance}
          />
        </div>
      </div>

      <WorkFormModal
        open={formOpen}
        mode={formMode}
        initialWork={selectedWork}
        submitting={formSubmitting}
        error={formError}
        onClose={closeForm}
        onSubmit={handleSubmitWork}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        workTitle={deleteTarget?.title ?? ""}
        submitting={deleteSubmitting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <CreatePerformanceModal
        open={performanceModalOpen && Boolean(performanceWork)}
        workTitle={performanceWork?.title ?? ""}
        submitting={performanceSubmitting}
        error={performanceError}
        onClose={closePerformanceModal}
        onSubmit={handleSubmitPerformance}
      />
    </div>
  );
}
