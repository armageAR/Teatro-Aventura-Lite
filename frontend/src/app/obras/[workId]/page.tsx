"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useParams } from "next/navigation";

import { useAuth } from "@/components/app-shell/AppShell";
import { ActionButton, LinkButton } from "@/components/ui/Button";
import { api } from "@/lib/api";

import { ConfirmQuestionDeleteModal } from "./components/ConfirmQuestionDeleteModal";
import { ConfirmOptionDeleteModal } from "./components/ConfirmOptionDeleteModal";
import { OptionFormModal } from "./components/OptionFormModal";
import { OptionsTable, type Option } from "./components/OptionsTable";
import { QuestionFormModal } from "./components/QuestionFormModal";
import { QuestionsTable, type Question } from "./components/QuestionsTable";
import styles from "./page.module.scss";

type Play = {
  id: number;
  title: string;
  description: string;
};

type PlayApi = {
  id: number;
  title: string;
  description?: string | null;
};

type QuestionApi = {
  id: number;
  question: string;
  order: number;
  observations?: string | null;
  deleted_at?: string | null;
  options_count?: number;
};

type OptionApi = {
  id: number;
  text: string;
  order: number;
  notes?: string | null;
  next_question_id?: number | null;
  deleted_at?: string | null;
  next_question?: {
    id: number;
    question: string;
    order: number;
  } | null;
};

const PLAY_ENDPOINT = "/api/plays";
const QUESTIONS_ENDPOINT = (playId: number) => `${PLAY_ENDPOINT}/${playId}/questions`;
const QUESTION_DETAIL_ENDPOINT = (questionId: number) => `/api/questions/${questionId}`;
const QUESTION_OPTIONS_ENDPOINT = (questionId: number) => `${QUESTION_DETAIL_ENDPOINT(questionId)}/options`;
const OPTION_DETAIL_ENDPOINT = (optionId: number) => `/api/options/${optionId}`;

function normalizePlay(play: PlayApi): Play {
  return {
    id: play.id,
    title: play.title,
    description: play.description ?? "",
  };
}

function normalizeQuestion(question: QuestionApi): Question {
  return {
    id: question.id,
    question: question.question,
    order: question.order,
    observations: question.observations ?? "",
    optionsCount: question.options_count ?? 0,
    deletedAt: question.deleted_at ?? null,
  };
}

function sortByOrder(questions: Question[]) {
  return [...questions].sort((a, b) => a.order - b.order);
}

function normalizeOption(option: OptionApi): Option {
  return {
    id: option.id,
    text: option.text,
    order: option.order,
    notes: option.notes ?? "",
    nextQuestionId: option.next_question_id ?? null,
    nextQuestionLabel: option.next_question
      ? `${option.next_question.order}. ${option.next_question.question}`
      : null,
    deletedAt: option.deleted_at ?? null,
  };
}

function sortOptions(options: Option[]) {
  return [...options].sort((a, b) => a.order - b.order);
}

type Params = {
  workId?: string | string[];
};

export default function ManageObraQuestionsPage() {
  const params = useParams<Params>();
  const rawWorkId = params?.workId;
  const workIdValue = Array.isArray(rawWorkId) ? rawWorkId[0] : rawWorkId;
  const workId = Number(workIdValue);

  const { openLogin } = useAuth();

  const [play, setPlay] = useState<Play | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [loadingPlay, setLoadingPlay] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const [reordering, setReordering] = useState(false);

  const [activeOptionsQuestion, setActiveOptionsQuestion] = useState<Question | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [optionsReordering, setOptionsReordering] = useState(false);

  const [optionFormOpen, setOptionFormOpen] = useState(false);
  const [optionFormMode, setOptionFormMode] = useState<"create" | "edit">("create");
  const [optionFormSubmitting, setOptionFormSubmitting] = useState(false);
  const [optionFormError, setOptionFormError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<Option | null>(null);

  const [optionDeleteTarget, setOptionDeleteTarget] = useState<Option | null>(null);
  const [optionDeleteSubmitting, setOptionDeleteSubmitting] = useState(false);

  useEffect(() => {
    if (Number.isNaN(workId)) {
      setPageError("Identificador de obra inválido.");
      setLoadingPlay(false);
      return;
    }

    const fetchPlay = async () => {
      setLoadingPlay(true);
      setPageError(null);

      try {
        const response = await api.get<PlayApi>(`${PLAY_ENDPOINT}/${workId}`);
        setPlay(normalizePlay(response.data));
      } catch (err) {
        if (isAxiosError(err)) {
          const status = err.response?.status;

          if (status === 401) {
            setPageError("Necesitás iniciar sesión para ver esta obra.");
            openLogin();
          } else if (status === 404) {
            setPageError("No encontramos la obra solicitada.");
          } else {
            const message = err.response?.data?.message as string | undefined;
            setPageError(message ?? "No se pudo cargar la obra.");
          }
        } else if (err instanceof Error) {
          setPageError(err.message);
        } else {
          setPageError("No se pudo cargar la obra.");
        }
      } finally {
        setLoadingPlay(false);
      }
    };

    fetchPlay();
  }, [workId, openLogin]);

  const fetchQuestions = useCallback(async () => {
    if (Number.isNaN(workId)) {
      return;
    }

    setLoadingQuestions(true);
    setQuestionsError(null);

    try {
      const response = await api.get<QuestionApi[]>(QUESTIONS_ENDPOINT(workId));
      const normalized = response.data.map(normalizeQuestion);
      setQuestions(sortByOrder(normalized));
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          setQuestionsError("Necesitás iniciar sesión para ver las preguntas.");
          openLogin();
        } else {
          const message = err.response?.data?.message as string | undefined;
          setQuestionsError(message ?? "No se pudieron cargar las preguntas.");
        }
      } else if (err instanceof Error) {
        setQuestionsError(err.message);
      } else {
        setQuestionsError("No se pudieron cargar las preguntas.");
      }
    } finally {
      setLoadingQuestions(false);
    }
  }, [workId, openLogin]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const orderedQuestions = useMemo(() => sortByOrder(questions), [questions]);

  const fetchOptions = useCallback(
    async (questionId: number) => {
      setLoadingOptions(true);
      setOptionsError(null);

      try {
        const response = await api.get<OptionApi[]>(QUESTION_OPTIONS_ENDPOINT(questionId));
        setOptions(sortOptions(response.data.map(normalizeOption)));
      } catch (err) {
        if (isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 401) {
            setOptionsError("Necesitás iniciar sesión para ver las opciones.");
            openLogin();
          } else {
            const message = err.response?.data?.message as string | undefined;
            setOptionsError(message ?? "No se pudieron cargar las opciones.");
          }
        } else if (err instanceof Error) {
          setOptionsError(err.message);
        } else {
          setOptionsError("No se pudieron cargar las opciones.");
        }
      } finally {
        setLoadingOptions(false);
      }
    },
    [openLogin]
  );

  useEffect(() => {
    if (!activeOptionsQuestion) {
      setOptions([]);
      setOptionsError(null);
      return;
    }

    fetchOptions(activeOptionsQuestion.id);
  }, [activeOptionsQuestion, fetchOptions]);

  useEffect(() => {
    if (!activeOptionsQuestion) {
      return;
    }

    const updated = orderedQuestions.find((question) => question.id === activeOptionsQuestion.id);
    if (!updated) {
      setActiveOptionsQuestion(null);
      return;
    }

    if (updated !== activeOptionsQuestion) {
      setActiveOptionsQuestion(updated);
    }
  }, [orderedQuestions, activeOptionsQuestion]);

  const handleAddQuestion = () => {
    setFormMode("create");
    setSelectedQuestion(null);
    setFormError(null);
    setFormOpen(true);
  };

  const handleEditQuestion = (question: Question) => {
    setFormMode("edit");
    setSelectedQuestion(question);
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (formSubmitting) return;

    setFormOpen(false);
    setSelectedQuestion(null);
    setFormError(null);
  };

  const handleSubmitQuestion = async (payload: { question: string; observations: string }) => {
    if (Number.isNaN(workId)) {
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    const questionText = payload.question.trim();
    const observations = payload.observations.trim();

    try {
      if (formMode === "create") {
        const nextOrder = orderedQuestions.length
          ? Math.max(...orderedQuestions.map((item) => item.order)) + 1
          : 1;

        await api.post(QUESTIONS_ENDPOINT(workId), {
          question: questionText,
          observations: observations ? observations : null,
          order: nextOrder,
        });
      } else if (selectedQuestion) {
        await api.put(QUESTION_DETAIL_ENDPOINT(selectedQuestion.id), {
          question: questionText,
          observations: observations ? observations : null,
        });
      }

      setFormOpen(false);
      setSelectedQuestion(null);
      await fetchQuestions();
      setFeedbackMessage("Cambios guardados correctamente.");
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          openLogin();
          setFormError("Necesitás iniciar sesión");
        } else {
          const message = err.response?.data?.message as string | undefined;
          setFormError(message ?? "No se pudo guardar la pregunta.");
        }
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("No se pudo guardar la pregunta.");
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleMoveQuestion = async (question: Question, direction: "up" | "down") => {
    const sorted = orderedQuestions;
    const currentIndex = sorted.findIndex((item) => item.id === question.id);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return;
    }

    const target = sorted[targetIndex];

    setReordering(true);
    setFeedbackMessage(null);

    try {
      await Promise.all([
        api.put(QUESTION_DETAIL_ENDPOINT(question.id), { order: target.order }),
        api.put(QUESTION_DETAIL_ENDPOINT(target.id), { order: question.order }),
      ]);

      setQuestions((prev) =>
        sortByOrder(
          prev.map((item) => {
            if (item.id === question.id) {
              return { ...item, order: target.order };
            }
            if (item.id === target.id) {
              return { ...item, order: question.order };
            }
            return item;
          })
        )
      );
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          openLogin();
          setFeedbackMessage("Necesitás iniciar sesión para reordenar preguntas.");
        } else {
          const message = err.response?.data?.message as string | undefined;
          setFeedbackMessage(message ?? "No se pudo reordenar la pregunta.");
        }
      } else if (err instanceof Error) {
        setFeedbackMessage(err.message);
      } else {
        setFeedbackMessage("No se pudo reordenar la pregunta.");
      }
    } finally {
      setReordering(false);
    }
  };

  const handleRequestDelete = (question: Question) => {
    setDeleteTarget(question);
  };

  const handleCancelDelete = () => {
    if (deleteSubmitting) return;
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteSubmitting(true);
    setFeedbackMessage(null);

    try {
      await api.delete(QUESTION_DETAIL_ENDPOINT(deleteTarget.id));
      setDeleteTarget(null);
      if (activeOptionsQuestion?.id === deleteTarget.id) {
        setActiveOptionsQuestion(null);
      }
      await fetchQuestions();
      setFeedbackMessage("Pregunta eliminada.");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        openLogin();
      }
      setFeedbackMessage("No se pudo eliminar la pregunta.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  useEffect(() => {
    if (!feedbackMessage) {
      return;
    }

    const timeout = setTimeout(() => setFeedbackMessage(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedbackMessage]);

  const isLoading = loadingPlay || loadingQuestions;

  const handleManageOptions = (question: Question) => {
    if (activeOptionsQuestion?.id === question.id) {
      closeOptionsPanel();
      return;
    }

    setOptionFormOpen(false);
    setOptionFormError(null);
    setSelectedOption(null);
    setOptionDeleteTarget(null);
    setOptions([]);
    setOptionsError(null);
    setActiveOptionsQuestion(question);
  };

  const closeOptionsPanel = () => {
    setOptionFormOpen(false);
    setOptionFormError(null);
    setSelectedOption(null);
    setOptionDeleteTarget(null);
    setOptions([]);
    setOptionsError(null);
    setActiveOptionsQuestion(null);
  };

  const handleAddOption = () => {
    if (!activeOptionsQuestion) {
      return;
    }

    setOptionFormMode("create");
    setSelectedOption(null);
    setOptionFormError(null);
    setOptionFormOpen(true);
  };

  const handleEditOption = (option: Option) => {
    setOptionFormMode("edit");
    setSelectedOption(option);
    setOptionFormError(null);
    setOptionFormOpen(true);
  };

  const closeOptionForm = () => {
    if (optionFormSubmitting) {
      return;
    }

    setOptionFormOpen(false);
    setSelectedOption(null);
    setOptionFormError(null);
  };

  const handleSubmitOption = async (payload: {
    text: string;
    notes: string;
  }) => {
    if (!activeOptionsQuestion) {
      return;
    }

    setOptionFormSubmitting(true);
    setOptionFormError(null);

    try {
      if (optionFormMode === "create") {
        const nextOrder = options.length ? Math.max(...options.map((item) => item.order)) + 1 : 1;

        await api.post(QUESTION_OPTIONS_ENDPOINT(activeOptionsQuestion.id), {
          text: payload.text,
          notes: payload.notes ? payload.notes : null,
          order: nextOrder,
        });
      } else if (selectedOption) {
        await api.put(OPTION_DETAIL_ENDPOINT(selectedOption.id), {
          text: payload.text,
          notes: payload.notes ? payload.notes : null,
        });
      }

      setOptionFormOpen(false);
      setSelectedOption(null);
      if (activeOptionsQuestion) {
        await fetchOptions(activeOptionsQuestion.id);
      }
      await fetchQuestions();
      setFeedbackMessage("Opción guardada correctamente.");
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          openLogin();
          setOptionFormError("Necesitás iniciar sesión");
        } else {
          const message = err.response?.data?.message as string | undefined;
          setOptionFormError(message ?? "No se pudo guardar la opción.");
        }
      } else if (err instanceof Error) {
        setOptionFormError(err.message);
      } else {
        setOptionFormError("No se pudo guardar la opción.");
      }
    } finally {
      setOptionFormSubmitting(false);
    }
  };

  const handleMoveOption = async (option: Option, direction: "up" | "down") => {
    const sorted = sortOptions(options);
    const currentIndex = sorted.findIndex((item) => item.id === option.id);
    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) {
      return;
    }

    const target = sorted[targetIndex];

    setOptionsReordering(true);
    setFeedbackMessage(null);

    try {
      await Promise.all([
        api.put(OPTION_DETAIL_ENDPOINT(option.id), { order: target.order }),
        api.put(OPTION_DETAIL_ENDPOINT(target.id), { order: option.order }),
      ]);

      setOptions((prev) =>
        sortOptions(
          prev.map((item) => {
            if (item.id === option.id) {
              return { ...item, order: target.order };
            }
            if (item.id === target.id) {
              return { ...item, order: option.order };
            }
            return item;
          })
        )
      );
    } catch (err) {
      if (isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 401) {
          openLogin();
          setFeedbackMessage("Necesitás iniciar sesión para reordenar opciones.");
        } else {
          const message = err.response?.data?.message as string | undefined;
          setFeedbackMessage(message ?? "No se pudo reordenar la opción.");
        }
      } else if (err instanceof Error) {
        setFeedbackMessage(err.message);
      } else {
        setFeedbackMessage("No se pudo reordenar la opción.");
      }
    } finally {
      setOptionsReordering(false);
    }
  };

  const handleRequestOptionDelete = (option: Option) => {
    setOptionDeleteTarget(option);
  };

  const handleCancelOptionDelete = () => {
    if (optionDeleteSubmitting) {
      return;
    }

    setOptionDeleteTarget(null);
  };

  const handleConfirmOptionDelete = async () => {
    if (!optionDeleteTarget) {
      return;
    }

    setOptionDeleteSubmitting(true);
    setFeedbackMessage(null);

    try {
      await api.delete(OPTION_DETAIL_ENDPOINT(optionDeleteTarget.id));
      setOptionDeleteTarget(null);
      if (activeOptionsQuestion) {
        await fetchOptions(activeOptionsQuestion.id);
      }
      await fetchQuestions();
      setFeedbackMessage("Opción eliminada.");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        openLogin();
      }
      setFeedbackMessage("No se pudo eliminar la opción.");
    } finally {
      setOptionDeleteSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.breadcrumb}>
          <LinkButton href="/obras" variant="ghost">
            ← Volver a obras
          </LinkButton>
          {play && <span>{play.title}</span>}
        </div>

        <div className={styles.headingGroup}>
          <h1 className={styles.heading}>Gestionar preguntas</h1>
          {play && play.description && (
            <p className={styles.description}>{play.description}</p>
          )}
        </div>

        {pageError && <div className={styles.feedback}>{pageError}</div>}

        <div className={styles.actionsRow}>
          <div className={styles.meta}>
            {isLoading
              ? "Preparando escena..."
              : `${orderedQuestions.length} pregunta${orderedQuestions.length === 1 ? "" : "s"}`}
          </div>
          <ActionButton type="button" onClick={handleAddQuestion} disabled={isLoading || !play}>
            Añadir pregunta
          </ActionButton>
        </div>

        {feedbackMessage && <div className={styles.meta}>{feedbackMessage}</div>}

        <div className={styles.tableArea}>
          <QuestionsTable
            questions={orderedQuestions}
            loading={isLoading}
            error={questionsError}
            reordering={reordering}
            onEdit={handleEditQuestion}
            onDelete={handleRequestDelete}
            onMove={handleMoveQuestion}
            onManageOptions={handleManageOptions}
          />
        </div>

        {activeOptionsQuestion && (
          <div className={styles.optionsPanel}>
            <div className={styles.optionsHeader}>
              <div>
                <h2 className={styles.optionsHeading}>
                  Opciones para &quot;{activeOptionsQuestion.question}&quot;
                </h2>
                <p className={styles.optionsDescription}>
                  Ordená, editá y conectá las respuestas disponibles para esta pregunta.
                </p>
              </div>
              <div className={styles.optionsActions}>
                <ActionButton
                  type="button"
                  onClick={handleAddOption}
                  disabled={loadingOptions || optionFormSubmitting}
                >
                  Añadir opción
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="ghost"
                  onClick={closeOptionsPanel}
                >
                  Cerrar opciones
                </ActionButton>
              </div>
            </div>

            <OptionsTable
              options={options}
              loading={loadingOptions}
              error={optionsError}
              reordering={optionsReordering}
              onEdit={handleEditOption}
              onDelete={handleRequestOptionDelete}
              onMove={handleMoveOption}
            />
          </div>
        )}
      </div>

      <QuestionFormModal
        open={formOpen}
        mode={formMode}
        initialQuestion={selectedQuestion}
        submitting={formSubmitting}
        error={formError}
        onClose={closeForm}
        onSubmit={handleSubmitQuestion}
      />

      <ConfirmQuestionDeleteModal
        open={Boolean(deleteTarget)}
        questionLabel={deleteTarget?.question ?? ""}
        submitting={deleteSubmitting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      {activeOptionsQuestion && (
        <OptionFormModal
          open={optionFormOpen}
          mode={optionFormMode}
          initialOption={selectedOption}
          submitting={optionFormSubmitting}
          error={optionFormError}
          onClose={closeOptionForm}
          onSubmit={handleSubmitOption}
        />
      )}

      <ConfirmOptionDeleteModal
        open={Boolean(optionDeleteTarget)}
        optionLabel={optionDeleteTarget?.text ?? ""}
        submitting={optionDeleteSubmitting}
        onCancel={handleCancelOptionDelete}
        onConfirm={handleConfirmOptionDelete}
      />
    </div>
  );
}
