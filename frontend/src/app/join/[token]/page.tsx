"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";

import styles from "./page.module.scss";

type JoinResponseApi = {
  spectator_session_id: string;
  performance_id: number;
  performance_status: string;
  play_title: string | null;
};

type CurrentOptionApi = {
  id: number;
  text: string;
  order: number;
};

type CurrentActiveQuestionApi = {
  id: number;
  question: string;
  options: CurrentOptionApi[];
  has_voted: boolean;
  voted_option_id: number | null;
};

type CurrentStateApi = {
  performance_id: number;
  status: string;
  play_title: string | null;
  active_question: CurrentActiveQuestionApi | null;
};

function statusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Esperando que comience la función";
    case "live":
      return "Función en vivo";
    case "closed":
      return "Función finalizada";
    default:
      return status;
  }
}

const POLL_INTERVAL_MS = 3000;

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinData, setJoinData] = useState<JoinResponseApi | null>(null);
  const [currentState, setCurrentState] = useState<CurrentStateApi | null>(
    null
  );

  const storageKey = `spectator_session_${token}`;
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCurrent = useCallback(
    async (performanceId: number, sessionId: string) => {
      try {
        const response = await api.get<CurrentStateApi>(
          `/api/performances/${performanceId}/current?spectator_session_id=${encodeURIComponent(sessionId)}`
        );
        setCurrentState(response.data);
      } catch {
        // Silently ignore polling errors — the page stays with last known state
      }
    },
    []
  );

  const join = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let session: JoinResponseApi | null = null;

      // Check localStorage for existing session
      if (typeof window !== "undefined") {
        const existing = localStorage.getItem(storageKey);
        if (existing) {
          try {
            session = JSON.parse(existing) as JoinResponseApi;
          } catch {
            localStorage.removeItem(storageKey);
          }
        }
      }

      // Join the performance if no existing session
      if (!session) {
        const response = await api.post<JoinResponseApi>(
          "/api/performances/join",
          { token }
        );
        session = response.data;

        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey, JSON.stringify(session));
        }
      }

      setJoinData(session);

      // Immediately fetch current state
      await fetchCurrent(session.performance_id, session.spectator_session_id);
    } catch (err) {
      if (isAxiosError(err)) {
        if (err.response?.status === 404) {
          setError(
            "Función no encontrada. Verificá que el código QR sea correcto."
          );
        } else {
          setError("Error al unirte a la función. Intentá de nuevo.");
        }
      } else {
        setError("Error inesperado. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }, [token, storageKey, fetchCurrent]);

  useEffect(() => {
    if (token) {
      join();
    }
  }, [token, join]);

  // Start polling once we have session data
  useEffect(() => {
    if (!joinData) return;

    const { performance_id, spectator_session_id } = joinData;

    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    pollTimerRef.current = setInterval(() => {
      fetchCurrent(performance_id, spectator_session_id);
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [joinData, fetchCurrent]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.loadingText}>Uniéndote a la función...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorBox}>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!joinData) return null;

  const state = currentState;
  const status = state?.status ?? joinData.performance_status;
  const playTitle = state?.play_title ?? joinData.play_title;
  const activeQuestion = state?.active_question ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.welcomeBox}>
          <h1 className={styles.title}>¡Bienvenido!</h1>
          {playTitle && <p className={styles.playTitle}>{playTitle}</p>}
          <div className={styles.statusBadge}>{statusLabel(status)}</div>

          {status === "draft" && (
            <p className={styles.waitingText}>
              La función aún no comenzó. Esperá la señal del operador.
            </p>
          )}

          {status === "closed" && (
            <p className={styles.closedText}>La función ha finalizado. ¡Gracias por participar!</p>
          )}

          {status === "live" && !activeQuestion && (
            <p className={styles.waitingText}>
              Esperando la próxima pregunta...
            </p>
          )}

          {status === "live" && activeQuestion && (
            <div className={styles.questionBox}>
              {activeQuestion.has_voted ? (
                <div className={styles.votedConfirmation}>
                  <div className={styles.votedIcon}>✓</div>
                  <p className={styles.votedText}>¡Tu voto fue registrado!</p>
                  <p className={styles.votedSubText}>
                    Elegiste:{" "}
                    <strong>
                      {activeQuestion.options.find(
                        (o) => o.id === activeQuestion.voted_option_id
                      )?.text ?? ""}
                    </strong>
                  </p>
                </div>
              ) : (
                <>
                  <p className={styles.questionText}>
                    {activeQuestion.question}
                  </p>
                  <ul className={styles.optionsList}>
                    {activeQuestion.options
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((option) => (
                        <li key={option.id} className={styles.optionItem}>
                          {option.text}
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
