"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

import { useApi } from "@/hooks/useApi";

import styles from "./page.module.scss";

type PerformanceDetailApi = {
  id: number;
  play_id: number;
  status: string;
  join_token: string;
  uid: string;
  scheduled_at: string;
  location: string;
  comment?: string | null;
  created_at?: string | null;
  play?: {
    id: number;
    title: string;
    description?: string | null;
  } | null;
};

type PerformanceQuestionOptionApi = {
  id: number;
  text: string;
  order: number;
};

type PerformanceQuestionApi = {
  id: number;
  question: string;
  order: number;
  options: PerformanceQuestionOptionApi[];
  performance_status: "pending" | "active" | "closed";
  sent_at?: string | null;
  closed_at?: string | null;
  winning_answer_option_id?: number | null;
};

type LiveOptionApi = {
  id: number;
  text: string;
  order: number;
  vote_count: number;
  vote_percentage: number;
};

type LiveQuestionApi = {
  id: number;
  question: string;
  order: number;
  performance_status: "active" | "closed";
  sent_at: string;
  closed_at: string | null;
  total_votes: number;
  options: LiveOptionApi[];
  winning_answer_option_id?: number | null;
};

type LiveResultsApi = {
  performance_id: number;
  status: string;
  questions: LiveQuestionApi[];
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  live: "En vivo",
  closed: "Cerrada",
  canceled: "Cancelada",
};

const QUESTION_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  active: "En votación",
  closed: "Cerrada",
};

const LIVE_POLL_INTERVAL_MS = 3000;

export default function PerformanceDetailPage() {
  const params = useParams();
  const api = useApi();

  const performanceId = params.performanceId as string;

  const [performance, setPerformance] = useState<PerformanceDetailApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<PerformanceQuestionApi[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionActionLoading, setQuestionActionLoading] = useState<number | null>(null);
  const [questionActionError, setQuestionActionError] = useState<string | null>(null);
  const [winnerActionLoading, setWinnerActionLoading] = useState<string | null>(null);

  const [liveResults, setLiveResults] = useState<LiveResultsApi | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get<PerformanceDetailApi>(`/api/performances/${performanceId}`);
      setPerformance(response.data);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setError(message ?? "No se pudo cargar la función.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo cargar la función.");
      }
    } finally {
      setLoading(false);
    }
  }, [api, performanceId]);

  const fetchQuestions = useCallback(async () => {
    setQuestionsLoading(true);
    try {
      const response = await api.get<PerformanceQuestionApi[]>(
        `/api/performances/${performanceId}/questions`,
      );
      setQuestions(response.data);
    } catch {
      // Non-critical: questions section degrades gracefully
    } finally {
      setQuestionsLoading(false);
    }
  }, [api, performanceId]);

  const fetchLiveResults = useCallback(async () => {
    try {
      const response = await api.get<LiveResultsApi>(`/api/performances/${performanceId}/live`);
      setLiveResults(response.data);
    } catch {
      // Non-critical: results degrade gracefully
    }
  }, [api, performanceId]);

  const handleStart = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await api.patch<PerformanceDetailApi>(`/api/performances/${performanceId}/start`);
      setPerformance(response.data);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setActionError(message ?? "No se pudo iniciar la función.");
      } else {
        setActionError("No se pudo iniciar la función.");
      }
    } finally {
      setActionLoading(false);
    }
  }, [api, performanceId]);

  const handleClose = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await api.patch<PerformanceDetailApi>(`/api/performances/${performanceId}/close`);
      setPerformance(response.data);
    } catch (err) {
      if (isAxiosError(err)) {
        const message = err.response?.data?.message as string | undefined;
        setActionError(message ?? "No se pudo cerrar la función.");
      } else {
        setActionError("No se pudo cerrar la función.");
      }
    } finally {
      setActionLoading(false);
    }
  }, [api, performanceId]);

  const handleSendQuestion = useCallback(
    async (questionId: number) => {
      setQuestionActionLoading(questionId);
      setQuestionActionError(null);
      try {
        const response = await api.patch<PerformanceQuestionApi>(
          `/api/performances/${performanceId}/questions/${questionId}/send`,
        );
        setQuestions((prev) => prev.map((q) => (q.id === questionId ? response.data : q)));
        // Immediately fetch live results after sending a question
        fetchLiveResults();
      } catch (err) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message as string | undefined;
          setQuestionActionError(message ?? "No se pudo enviar la pregunta.");
        } else {
          setQuestionActionError("No se pudo enviar la pregunta.");
        }
      } finally {
        setQuestionActionLoading(null);
      }
    },
    [api, performanceId, fetchLiveResults],
  );

  const handleCloseQuestion = useCallback(
    async (questionId: number) => {
      setQuestionActionLoading(questionId);
      setQuestionActionError(null);
      try {
        const response = await api.patch<PerformanceQuestionApi>(
          `/api/performances/${performanceId}/questions/${questionId}/close`,
        );
        setQuestions((prev) => prev.map((q) => (q.id === questionId ? response.data : q)));
        // Immediately fetch live results after closing a question
        fetchLiveResults();
      } catch (err) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message as string | undefined;
          setQuestionActionError(message ?? "No se pudo cerrar la pregunta.");
        } else {
          setQuestionActionError("No se pudo cerrar la pregunta.");
        }
      } finally {
        setQuestionActionLoading(null);
      }
    },
    [api, performanceId, fetchLiveResults],
  );

  const handleSetWinner = useCallback(
    async (questionId: number, optionId: number) => {
      const key = `${questionId}-${optionId}`;
      setWinnerActionLoading(key);
      setQuestionActionError(null);
      try {
        const response = await api.patch<PerformanceQuestionApi>(
          `/api/performances/${performanceId}/questions/${questionId}/winner`,
          { answer_option_id: optionId },
        );
        setQuestions((prev) => prev.map((q) => (q.id === questionId ? response.data : q)));
        fetchLiveResults();
      } catch (err) {
        if (isAxiosError(err)) {
          const message = err.response?.data?.message as string | undefined;
          setQuestionActionError(message ?? "No se pudo guardar el ganador.");
        } else {
          setQuestionActionError("No se pudo guardar el ganador.");
        }
      } finally {
        setWinnerActionLoading(null);
      }
    },
    [api, performanceId, fetchLiveResults],
  );

  useEffect(() => {
    fetchPerformance();
    fetchQuestions();
    fetchLiveResults();
  }, [fetchPerformance, fetchQuestions, fetchLiveResults]);

  // Poll live results every 3s when performance is live or has sent questions
  useEffect(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    const hasSentQuestions = questions.some(
      (q) => q.performance_status === "active" || q.performance_status === "closed",
    );

    if (performance?.status === "live" || hasSentQuestions) {
      pollTimerRef.current = setInterval(() => {
        fetchLiveResults();
      }, LIVE_POLL_INTERVAL_MS);
    }

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [performance?.status, questions, fetchLiveResults]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <p className={styles.loading}>Cargando función...</p>
        </div>
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div className={styles.page}>
        <div className={styles.content}>
          <Link href="/funciones" className={styles.backLink}>← Volver a funciones</Link>
          <p className={styles.error}>{error ?? "No se encontró la función."}</p>
        </div>
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[performance.status] ?? performance.status;

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${performance.join_token}`
      : `/join/${performance.join_token}`;

  const hasActiveQuestion = questions.some((q) => q.performance_status === "active");

  // Build a map of questionId → live result data for quick lookup
  const liveResultsMap = new Map<number, LiveQuestionApi>(
    (liveResults?.questions ?? []).map((lq) => [lq.id, lq]),
  );

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <Link href="/funciones" className={styles.backLink}>← Volver a funciones</Link>

        <div className={styles.headingGroup}>
          <h1 className={styles.heading}>Detalle de función</h1>
          {performance.play && (
            <p className={styles.subheading}>{performance.play.title}</p>
          )}
        </div>

        <dl className={styles.detailList}>
          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>Estado</dt>
            <dd className={`${styles.detailValue} ${styles[`status_${performance.status}`] ?? ""}`}>
              {statusLabel}
            </dd>
          </div>

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>Fecha y hora</dt>
            <dd className={styles.detailValue}>{formatDate(performance.scheduled_at)}</dd>
          </div>

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>Lugar</dt>
            <dd className={styles.detailValue}>{performance.location || "-"}</dd>
          </div>

          {performance.comment && (
            <div className={styles.detailRow}>
              <dt className={styles.detailLabel}>Comentarios</dt>
              <dd className={styles.detailValue}>{performance.comment}</dd>
            </div>
          )}

          <div className={styles.detailRow}>
            <dt className={styles.detailLabel}>UID interno</dt>
            <dd className={`${styles.detailValue} ${styles.token}`}>{performance.uid}</dd>
          </div>
        </dl>

        <section className={styles.actionsSection}>
          <h2 className={styles.actionsHeading}>Acciones</h2>
          {actionError && <p className={styles.actionError}>{actionError}</p>}
          <div className={styles.actionsRow}>
            {performance.status === "draft" && (
              <button
                className={styles.btnStart}
                onClick={handleStart}
                disabled={actionLoading}
              >
                {actionLoading ? "Iniciando..." : "Iniciar función"}
              </button>
            )}
            {performance.status === "live" && (
              <button
                className={styles.btnClose}
                onClick={handleClose}
                disabled={actionLoading}
              >
                {actionLoading ? "Cerrando..." : "Cerrar función"}
              </button>
            )}
            {performance.status === "closed" && (
              <p className={styles.statusMessage}>La función ha sido cerrada.</p>
            )}
          </div>
        </section>

        <section className={styles.questionsSection}>
          <h2 className={styles.questionsHeading}>Preguntas</h2>
          {questionActionError && <p className={styles.actionError}>{questionActionError}</p>}
          {questionsLoading && <p className={styles.loading}>Cargando preguntas...</p>}
          {!questionsLoading && questions.length === 0 && (
            <p className={styles.statusMessage}>No hay preguntas para esta obra.</p>
          )}
          {questions.map((q) => {
            const liveQ = liveResultsMap.get(q.id);
            return (
              <div
                key={q.id}
                className={`${styles.questionItem} ${styles[`qItem_${q.performance_status}`] ?? ""}`}
              >
                <div className={styles.questionHeader}>
                  <span className={styles.questionOrder}>{q.order}.</span>
                  <span className={styles.questionText}>{q.question}</span>
                  <span
                    className={`${styles.qStatusBadge} ${styles[`qBadge_${q.performance_status}`] ?? ""}`}
                  >
                    {QUESTION_STATUS_LABELS[q.performance_status] ?? q.performance_status}
                  </span>
                </div>
                {liveQ ? (
                  <>
                    <ul className={styles.resultsList}>
                      {liveQ.options.map((opt) => {
                        const isWinner = liveQ.winning_answer_option_id === opt.id;
                        return (
                          <li
                            key={opt.id}
                            className={`${styles.resultItem} ${isWinner ? styles.resultItemWinner : ""}`}
                          >
                            <div className={styles.resultHeader}>
                              <span className={styles.resultText}>
                                {opt.text}
                                {isWinner && (
                                  <span className={styles.winnerBadge}>Ganadora</span>
                                )}
                              </span>
                              <span className={styles.resultCount}>
                                {opt.vote_count} voto{opt.vote_count !== 1 ? "s" : ""}{" "}
                                <span className={styles.resultPct}>({opt.vote_percentage}%)</span>
                              </span>
                            </div>
                            <div className={styles.resultBar}>
                              <div
                                className={`${styles.resultBarFill} ${isWinner ? styles.resultBarFillWinner : ""}`}
                                style={{ width: `${opt.vote_percentage}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                      <li className={styles.resultTotal}>
                        Total: {liveQ.total_votes} voto{liveQ.total_votes !== 1 ? "s" : ""}
                      </li>
                    </ul>
                    {liveQ.performance_status === "closed" && (
                      <div className={styles.winnerActions}>
                        <span className={styles.winnerActionsLabel}>Seleccionar ganadora:</span>
                        <div className={styles.winnerActionsRow}>
                          {liveQ.options.map((opt) => {
                            const isWinner = liveQ.winning_answer_option_id === opt.id;
                            const loadingKey = `${q.id}-${opt.id}`;
                            return (
                              <button
                                key={opt.id}
                                className={`${styles.btnWinner} ${isWinner ? styles.btnWinnerActive : ""}`}
                                onClick={() => handleSetWinner(q.id, opt.id)}
                                disabled={winnerActionLoading === loadingKey}
                              >
                                {opt.text}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  q.options.length > 0 && (
                    <ul className={styles.optionsList}>
                      {q.options.map((opt) => (
                        <li key={opt.id} className={styles.optionItem}>
                          {opt.text}
                        </li>
                      ))}
                    </ul>
                  )
                )}
                {performance.status === "live" && (
                  <div className={styles.questionActions}>
                    {q.performance_status === "pending" && !hasActiveQuestion && (
                      <button
                        className={styles.btnSend}
                        onClick={() => handleSendQuestion(q.id)}
                        disabled={questionActionLoading === q.id}
                      >
                        {questionActionLoading === q.id ? "Enviando..." : "Enviar al público"}
                      </button>
                    )}
                    {q.performance_status === "active" && (
                      <button
                        className={styles.btnCloseQuestion}
                        onClick={() => handleCloseQuestion(q.id)}
                        disabled={questionActionLoading === q.id}
                      >
                        {questionActionLoading === q.id ? "Cerrando..." : "Cerrar votación"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className={styles.qrSection}>
          <h2 className={styles.qrHeading}>Código QR de acceso</h2>
          <div className={styles.qrContainer}>
            <QRCodeSVG value={joinUrl} size={220} />
          </div>
          <p className={styles.qrLabel}>URL de acceso para el público:</p>
          <p className={`${styles.token} ${styles.qrUrl}`}>{joinUrl}</p>
        </section>
      </div>
    </div>
  );
}
