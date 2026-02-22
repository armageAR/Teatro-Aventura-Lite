"use client";

import { useEffect, useState } from "react";
import { isAxiosError } from "axios";

import { useApi } from "@/hooks/useApi";
import { useKeycloak } from "@/providers/KeycloakProvider";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { UsersToolbar } from "./components/UsersToolbar";
import { UsersTable, type AppUser } from "./components/UsersTable";
import { UserFormModal } from "./components/UserFormModal";
import styles from "./page.module.scss";

const USERS_ENDPOINT = "/api/users";

function getAdminRoles(keycloak: import("keycloak-js").default): string[] {
  const parsed = keycloak.tokenParsed;
  if (!parsed) return [];
  const realmRoles = (parsed.realm_access as { roles?: string[] } | undefined)?.roles ?? [];
  return realmRoles;
}

export default function UsuariosPage() {
  const api = useApi();
  const { keycloak, authenticated } = useKeycloak();

  const isAdmin = authenticated && getAdminRoles(keycloak).includes("admin");

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.get<AppUser[]>(USERS_ENDPOINT);
        setUsers(response.data);
      } catch (err) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message as string | undefined;
          setError(message ?? "No se pudieron cargar los usuarios.");
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("No se pudieron cargar los usuarios.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isAdmin, api]);

  const refreshUsers = async () => {
    try {
      const response = await api.get<AppUser[]>(USERS_ENDPOINT);
      setUsers(response.data);
    } catch (err) {
      console.error("Error al refrescar usuarios", err);
    }
  };

  const handleAddUser = () => {
    setFormMode("create");
    setSelectedUser(null);
    setFormError(null);
    setFormOpen(true);
  };

  const handleEditUser = (user: AppUser) => {
    setFormMode("edit");
    setSelectedUser(user);
    setFormError(null);
    setFormOpen(true);
  };

  const handleRequestDelete = (user: AppUser) => {
    setDeleteTarget(user);
  };

  const handleCancelDelete = () => {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
  };

  const closeForm = () => {
    if (formSubmitting) return;
    setFormOpen(false);
    setSelectedUser(null);
    setFormError(null);
  };

  const handleSubmitUser = async (payload: {
    name: string;
    email: string;
    role: "admin" | "producer";
  }) => {
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (formMode === "create") {
        await api.post(USERS_ENDPOINT, payload);
      } else if (selectedUser) {
        await api.patch(`${USERS_ENDPOINT}/${selectedUser.id}`, payload);
      }

      setFormOpen(false);
      setSelectedUser(null);
      await refreshUsers();
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setFormError(message ?? "No se pudo guardar el usuario.");
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("No se pudo guardar el usuario.");
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteSubmitting(true);

    try {
      await api.delete(`${USERS_ENDPOINT}/${deleteTarget.id}`);
      setDeleteTarget(null);
      await refreshUsers();
    } catch (err) {
      console.error("No se pudo eliminar el usuario", err);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.forbidden}>
          No tenés permiso para acceder a esta sección.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.headingGroup}>
          <h1 className={styles.heading}>Gestión de usuarios</h1>
          <p className={styles.description}>
            Creá, editá y eliminá usuarios del sistema, y asignales roles de Administrador o Productor.
          </p>
        </div>

        <UsersToolbar onAddUser={handleAddUser} />

        <div className={styles.tableArea}>
          <UsersTable
            users={users}
            loading={loading}
            error={error}
            onEdit={handleEditUser}
            onDelete={handleRequestDelete}
          />
        </div>
      </div>

      <UserFormModal
        open={formOpen}
        mode={formMode}
        initialUser={selectedUser}
        submitting={formSubmitting}
        error={formError}
        onClose={closeForm}
        onSubmit={handleSubmitUser}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="¿Eliminar usuario?"
        message={`Esta acción eliminará al usuario "${deleteTarget?.name ?? ""}" de forma permanente.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        submitting={deleteSubmitting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
