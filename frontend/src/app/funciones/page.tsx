"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";

import { useAuth } from "@/components/app-shell/AppShell";
import { PerformancesToolbar, type FilterOption } from "./components/PerformancesToolbar";
import {
  PerformancesTable,
  type PerformanceRow,
  type SortDirection,
  type SortKey,
} from "./components/PerformancesTable";
import { useApi } from "@/hooks/useApi";

import styles from "./page.module.scss";

type PlayApi = {
  id: number;
  title: string;
};

type PerformanceApi = {
  id: number;
  play_id: number;
  uid: string;
  scheduled_at: string;
  location?: string | null;
  comment?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type NormalizedPerformance = {
  id: number;
  playId: number;
  playTitle: string;
  scheduledAt: string;
  location: string;
};

const PLAYS_ENDPOINT = "/api/plays";
const PERFORMANCES_ENDPOINT = (playId: number) => `${PLAYS_ENDPOINT}/${playId}/performances`;

type LoadState = "idle" | "loading" | "error" | "success";

export default function FuncionesPage() {
  const { openLogin } = useAuth();
  const api = useApi();

  const [performances, setPerformances] = useState<NormalizedPerformance[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterOption>("upcoming");
  const [sortBy, setSortBy] = useState<SortKey>("scheduledAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const fetchPerformances = useCallback(async () => {
    setLoadState("loading");
    setError(null);

    try {
      const playsResponse = await api.get<PlayApi[]>(PLAYS_ENDPOINT);
      const plays = playsResponse.data;

      if (plays.length === 0) {
        setPerformances([]);
        setLoadState("success");
        return;
      }

      const allPerformanceRequests = await Promise.all(
        plays.map(async (play) => {
          const response = await api.get<PerformanceApi[]>(PERFORMANCES_ENDPOINT(play.id));
          return response.data.map<NormalizedPerformance>((performance) => ({
            id: performance.id,
            playId: play.id,
            playTitle: play.title,
            scheduledAt: performance.scheduled_at,
            location: performance.location ?? "",
          }));
        })
      );

      const flattened = allPerformanceRequests.flat();
      setPerformances(flattened);
      setLoadState("success");
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 401) {
          setError("Necesitás iniciar sesión para ver las funciones.");
          openLogin();
        } else {
          const message = err.response?.data?.message as string | undefined;
          setError(message ?? "No se pudieron cargar las funciones.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudieron cargar las funciones.");
      }

      setLoadState("error");
    }
  }, [openLogin, api]);

  useEffect(() => {
    fetchPerformances();
  }, [fetchPerformances]);

  const isLoading = loadState === "loading";

  const filteredPerformances = useMemo<PerformanceRow[]>(() => {
    const now = Date.now();

    const rows = performances.map((performance) => {
      const scheduledTimestamp = new Date(performance.scheduledAt).getTime();
      const status: PerformanceRow["status"] = Number.isNaN(scheduledTimestamp) || scheduledTimestamp >= now ? "upcoming" : "past";

      return {
        id: performance.id,
        playTitle: performance.playTitle,
        scheduledAt: performance.scheduledAt,
        location: performance.location,
        status,
      };
    });

    const filtered = rows.filter((performance) => {
      if (filter === "all") {
        return true;
      }
      return performance.status === filter;
    });

    const sorted = filtered.slice().sort((a, b) => {
      const directionFactor = sortDirection === "asc" ? 1 : -1;

      switch (sortBy) {
        case "playTitle": {
          return a.playTitle.localeCompare(b.playTitle) * directionFactor;
        }
        case "location": {
          return a.location.localeCompare(b.location) * directionFactor;
        }
        case "scheduledAt":
        default: {
          const aTime = new Date(a.scheduledAt).getTime();
          const bTime = new Date(b.scheduledAt).getTime();

          if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
            return 0;
          }
          if (Number.isNaN(aTime)) {
            return 1;
          }
          if (Number.isNaN(bTime)) {
            return -1;
          }

          if (aTime === bTime) {
            return a.playTitle.localeCompare(b.playTitle) * directionFactor;
          }

          return (aTime - bTime) * directionFactor;
        }
      }
    });

    return sorted;
  }, [performances, filter, sortBy, sortDirection]);

  const handleSortChange = (key: SortKey) => {
    setSortBy((currentSortBy) => {
      if (currentSortBy === key) {
        setSortDirection((currentDirection) => (currentDirection === "asc" ? "desc" : "asc"));
        return currentSortBy;
      }

      setSortDirection("asc");
      return key;
    });
  };

  const totalCount = filteredPerformances.length;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.headingGroup}>
          <h1 className={styles.heading}>Funciones</h1>
          <p className={styles.description}>
            Revisá el calendario de funciones programadas y anteriores, ordená por fecha u obra y encontrá la
            información necesaria para coordinar cada puesta en escena.
          </p>
        </div>

        <PerformancesToolbar
          filter={filter}
          onFilterChange={setFilter}
          loading={isLoading}
          onReload={fetchPerformances}
        />

        {error && <div className={styles.feedback}>{error}</div>}

        <div className={styles.metaRow}>
          <span>
            {isLoading
              ? "Cargando listado de funciones..."
              : `${totalCount} función${totalCount === 1 ? "" : "es"} visibles`}
          </span>
        </div>

        <div className={styles.tableArea}>
          <PerformancesTable
            performances={filteredPerformances}
            loading={isLoading && performances.length === 0}
            error={performances.length === 0 && loadState === "error" ? error : null}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        </div>
      </div>
    </div>
  );
}
