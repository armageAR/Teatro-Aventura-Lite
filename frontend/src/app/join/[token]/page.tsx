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
  updated_at: string;
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

/** Polling interval (ms) when the browser tab is visible */
const POLL_INTERVAL_ACTIVE_MS = 3000;
/** Polling interval (ms) when the tab is in background or screen locked */
const POLL_INTERVAL_BACKGROUND_MS = 12000;
/** Maximum backoff cap (ms) */
const POLL_BACKOFF_MAX_MS = 60000;

/**
 * Calculates next poll delay with exponential backoff and jitter.
 * Base interval is 3s when visible, 12s when backgrounded.
 * On consecutive errors the interval doubles up to POLL_BACKOFF_MAX_MS,
 * then a ±25% jitter is applied to avoid thundering herd.
 */
function calcPollDelay(errorCount: number): number {
  const isVisible =
    typeof document === "undefined" || document.visibilityState !== "hidden";
  const base = isVisible ? POLL_INTERVAL_ACTIVE_MS : POLL_INTERVAL_BACKGROUND_MS;
  if (errorCount === 0) return base;
  const exp = Math.min(base * Math.pow(2, errorCount), POLL_BACKOFF_MAX_MS);
  const jitter = exp * 0.25 * (Math.random() * 2 - 1);
  return Math.round(exp + jitter);
}

export default function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinData, setJoinData] = useState<JoinResponseApi | null>(null);
  const [currentState, setCurrentState] = useState<CurrentStateApi | null>(
    null
  );
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const storageKey = `spectator_session_${token}`;

  // Polling state held in refs to avoid stale closures in setTimeout callbacks
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollErrorCountRef = useRef(0);
  const joinDataRef = useRef<JoinResponseApi | null>(null);
  // Holds the latest scheduleNextPoll so the recursive timeout can call it
  const scheduleRef = useRef<(() => void) | null>(null);

  const fetchCurrent = useCallback(
    async (performanceId: number, sessionId: string): Promise<boolean> => {
      try {
        const response = await api.get<CurrentStateApi>(
          `/api/performances/${performanceId}/current?spectator_session_id=${encodeURIComponent(sessionId)}`
        );
        setCurrentState(response.data);
        return true;
      } catch {
        // Keep last known state; caller decides how to handle the error
        return false;
      }
    },
    []
  );

  /**
   * Cancels any pending poll timer and schedules the next one.
   * Uses calcPollDelay() so the interval adapts to visibility and error count.
   */
  const scheduleNextPoll = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    const data = joinDataRef.current;
    if (!data) return;
    const delay = calcPollDelay(pollErrorCountRef.current);
    pollTimerRef.current = setTimeout(async () => {
      const d = joinDataRef.current;
      if (!d) return;
      const success = await fetchCurrent(d.performance_id, d.spectator_session_id);
      if (success) {
        pollErrorCountRef.current = 0;
      } else {
        pollErrorCountRef.current = Math.min(pollErrorCountRef.current + 1, 10);
      }
      scheduleRef.current?.();
    }, delay);
  }, [fetchCurrent]);

  // Keep scheduleRef pointing at the latest stable scheduleNextPoll
  useEffect(() => {
    scheduleRef.current = scheduleNextPoll;
  }, [scheduleNextPoll]);

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

      // Always fetch full current state on page load
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

  const handleVote = useCallback(
    async (optionId: number) => {
      if (!joinData || voteLoading) return;

      setVoteLoading(true);
      setVoteError(null);

      const clientVoteId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);

      try {
        await api.post(`/api/performances/${joinData.performance_id}/vote`, {
          spectator_session_id: joinData.spectator_session_id,
          question_option_id: optionId,
          client_vote_id: clientVoteId,
        });

        // Immediately refresh state to show vote confirmation
        await fetchCurrent(
          joinData.performance_id,
          joinData.spectator_session_id
        );
      } catch (err) {
        if (isAxiosError(err)) {
          const msg =
            (err.response?.data as { message?: string })?.message ??
            "Error al enviar tu voto. Intentá de nuevo.";
          setVoteError(msg);
        } else {
          setVoteError("Error inesperado. Intentá de nuevo.");
        }
      } finally {
        setVoteLoading(false);
      }
    },
    [joinData, voteLoading, fetchCurrent]
  );

  useEffect(() => {
    if (token) {
      join();
    }
  }, [token, join]);

  // Start adaptive polling once we have session data
  useEffect(() => {
    if (!joinData) return;

    joinDataRef.current = joinData;
    pollErrorCountRef.current = 0;
    scheduleRef.current?.();

    /**
     * Page Visibility API: adapt the polling interval when the tab visibility changes.
     * - Becoming visible: reset backoff, poll immediately, then resume 3s cadence.
     * - Going to background: reschedule with the 12s background interval.
     */
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollErrorCountRef.current = 0;
        fetchCurrent(joinData.performance_id, joinData.spectator_session_id);
        scheduleRef.current?.();
      } else {
        // Reschedule so calcPollDelay picks the background interval
        scheduleRef.current?.();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      joinDataRef.current = null;
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
            <p className={styles.closedText}>
              La función ha finalizado. ¡Gracias por participar!
            </p>
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
                  {voteError && (
                    <p className={styles.voteError}>{voteError}</p>
                  )}
                  <ul className={styles.optionsList}>
                    {activeQuestion.options
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((option) => (
                        <li key={option.id} className={styles.optionItem}>
                          <button
                            className={styles.optionButton}
                            onClick={() => handleVote(option.id)}
                            disabled={voteLoading}
                          >
                            {option.text}
                          </button>
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
