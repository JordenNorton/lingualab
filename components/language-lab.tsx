"use client";

import {
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Compass,
  Feather,
  GraduationCap,
  History,
  Languages,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Newspaper,
  PenLine,
  Save,
  Sparkles,
  Wand2
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { TouchEvent } from "react";
import { clsx } from "clsx";
import { defaultLessonRequest, demoLesson } from "@/lib/demo-lesson";
import type { Explanation, Lesson, LessonRequest, QuizAttempt, WorkbookFeedback } from "@/lib/schemas";
import { contentTypes, focusAreas, lengths, levels, tones } from "@/lib/schemas";

const savedLessonsKey = "lingualab.savedLessons.v1";
const attemptsKey = "lingualab.attempts.v1";
const loginToGenerateMessage = "Log in or create an account to generate new text.";

const contentLabels: Record<LessonRequest["contentType"], string> = {
  "news-brief": "News brief",
  "short-story": "Story",
  dialogue: "Dialogue",
  "travel-scene": "Travel",
  "workplace-note": "Workplace",
  "daily-life": "Daily life"
};

const contentIcons = {
  "news-brief": Newspaper,
  "short-story": Feather,
  dialogue: MessageSquareText,
  "travel-scene": Compass,
  "workplace-note": BriefcaseBusiness,
  "daily-life": BookOpen
};

const focusLabels: Record<LessonRequest["focusArea"], string> = {
  vocabulary: "Vocabulary",
  grammar: "Grammar",
  idioms: "Idioms",
  conversation: "Conversation",
  "exam-practice": "Exam practice"
};

const toneLabels: Record<LessonRequest["tone"], string> = {
  natural: "Natural",
  warm: "Warm",
  formal: "Formal",
  playful: "Playful",
  journalistic: "Journalistic"
};

const lengthLabels: Record<LessonRequest["length"], string> = {
  short: "Short",
  medium: "Medium",
  long: "Long"
};

type SavedLesson = {
  id: string;
  title: string;
  targetLanguage: string;
  level: string;
  createdAt: string;
  lesson: Lesson;
};

type ApiMeta = {
  mode?: "ai" | "demo";
  message?: string;
  model?: string;
};

function normalizeAnswer(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?;:]/g, "");
}

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const item = window.localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocalStorage<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function activateOnTouch(event: TouchEvent<HTMLButtonElement>, action: () => void) {
  event.preventDefault();
  action();
}

function createQuizSignature(lesson: Lesson, mcAnswers: Record<string, number>, fillAnswers: Record<string, string>) {
  return JSON.stringify({
    lessonId: lesson.id,
    multipleChoice: lesson.workbook.multipleChoice.map((question) => [question.id, mcAnswers[question.id] ?? null]),
    fillBlank: lesson.workbook.fillBlank.map((question) => [question.id, fillAnswers[question.id] ?? ""])
  });
}

export function LanguageLab({
  userEmail,
  initialLesson,
  initialAttempts
}: {
  userEmail: string | null;
  initialLesson: Lesson | null;
  initialAttempts: QuizAttempt[];
}) {
  const [request, setRequest] = useState<LessonRequest>(defaultLessonRequest);
  const [lesson, setLesson] = useState<Lesson>(initialLesson ?? demoLesson);
  const [meta, setMeta] = useState<ApiMeta>({
    mode: "demo",
    message: initialLesson ? "Saved lesson loaded." : "Demo lesson loaded."
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingLesson, setIsSavingLesson] = useState(false);
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [status, setStatus] = useState("");
  const [savedLessons, setSavedLessons] = useState<SavedLesson[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>(initialAttempts);
  const [mcAnswers, setMcAnswers] = useState<Record<string, number>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [lastSavedQuizSignature, setLastSavedQuizSignature] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [writingAnswer, setWritingAnswer] = useState("");
  const [feedback, setFeedback] = useState<WorkbookFeedback | null>(null);
  const [isCheckingWriting, setIsCheckingWriting] = useState(false);
  const isTextGenerationLocked = !userEmail;

  useEffect(() => {
    let isMounted = true;
    const timer = window.setTimeout(() => {
      if (!isMounted) return;

      setSavedLessons(readLocalStorage<SavedLesson[]>(savedLessonsKey, []));
      if (!userEmail) {
        setAttempts(readLocalStorage<QuizAttempt[]>(attemptsKey, []));
      }
    }, 0);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [userEmail]);

  const readingText = useMemo(
    () =>
      lesson.textSections
        .reduce<string[]>((paragraphs, section) => paragraphs.concat(section.paragraphs), [])
        .join("\n\n"),
    [lesson]
  );

  const quizScore = useMemo(() => {
    const multipleChoiceCorrect = lesson.workbook.multipleChoice.filter(
      (question) => mcAnswers[question.id] === question.correctIndex
    ).length;
    const fillCorrect = lesson.workbook.fillBlank.filter(
      (question) => normalizeAnswer(fillAnswers[question.id] || "") === normalizeAnswer(question.answer)
    ).length;
    const total = lesson.workbook.multipleChoice.length + lesson.workbook.fillBlank.length;

    return total === 0 ? 0 : Math.round(((multipleChoiceCorrect + fillCorrect) / total) * 100);
  }, [fillAnswers, lesson, mcAnswers]);

  const quizSignature = useMemo(() => createQuizSignature(lesson, mcAnswers, fillAnswers), [fillAnswers, lesson, mcAnswers]);
  const isDuplicateQuizAttempt = lastSavedQuizSignature === quizSignature;

  const progress = useMemo(() => {
    const average = attempts.length
      ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length)
      : 0;

    const recentTerms = savedLessons.reduce<string[]>(
      (terms, item) => terms.concat(item.lesson.vocabulary.map((entry) => entry.term)),
      []
    ).slice(0, 8);

    return {
      lessonsSaved: savedLessons.length,
      attempts: attempts.length,
      average,
      recentTerms
    };
  }, [attempts, savedLessons]);

  function updateRequest<K extends keyof LessonRequest>(key: K, value: LessonRequest[K]) {
    setRequest((current) => ({ ...current, [key]: value }));
  }

  function resetLessonState(nextLesson: Lesson) {
    setLesson(nextLesson);
    setMcAnswers({});
    setFillAnswers({});
    setQuizSubmitted(false);
    setLastSavedQuizSignature(null);
    setExplanation(null);
    setSelectedText("");
    setWritingAnswer("");
    setFeedback(null);
  }

  async function generateLesson() {
    if (!userEmail) {
      setStatus(loginToGenerateMessage);
      return;
    }

    setIsGenerating(true);
    setStatus("");

    try {
      const response = await fetch("/api/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request)
      });
      const data = (await response.json()) as { lesson?: Lesson; meta?: ApiMeta; error?: string };

      if (!response.ok || !data.lesson) {
        throw new Error(data.error || "The lesson could not be generated.");
      }

      resetLessonState(data.lesson);
      setMeta(data.meta || { mode: "ai" });
      setStatus(data.meta?.message || "Lesson generated.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveLesson() {
    const next: SavedLesson[] = [
      {
        id: lesson.id,
        title: lesson.title,
        targetLanguage: lesson.targetLanguage,
        level: lesson.level,
        createdAt: lesson.createdAt,
        lesson
      },
      ...savedLessons.filter((item) => item.id !== lesson.id)
    ].slice(0, 12);

    setSavedLessons(next);
    writeLocalStorage(savedLessonsKey, next);

    if (!userEmail) {
      setStatus("Lesson saved to this browser. Log in to save it to your account.");
      return;
    }

    setIsSavingLesson(true);

    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson })
      });
      const data = (await response.json()) as { savedLesson?: { id: string }; error?: string };

      if (!response.ok || !data.savedLesson) {
        throw new Error(data.error || "The lesson could not be saved.");
      }

      setStatus("Lesson saved to your account. You can open it from the dashboard.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The lesson could not be saved.");
    } finally {
      setIsSavingLesson(false);
    }
  }

  function loadSavedLesson(savedLesson: SavedLesson) {
    resetLessonState(savedLesson.lesson);
    setMeta({ mode: "demo", message: "Saved lesson loaded from this browser." });
    setStatus("Saved lesson loaded.");
  }

  async function explainSelection() {
    if (!userEmail) {
      setStatus(loginToGenerateMessage);
      return;
    }

    const selection = window.getSelection()?.toString().trim() || selectedText;

    if (!selection) {
      setStatus("Select a word, phrase, or sentence in the reading first.");
      return;
    }

    setSelectedText(selection);
    setIsExplaining(true);
    setStatus("");

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText: selection.slice(0, 1200),
          targetLanguage: lesson.targetLanguage,
          nativeLanguage: lesson.nativeLanguage,
          level: lesson.level,
          surroundingText: readingText.slice(0, 2400)
        })
      });
      const data = (await response.json()) as { explanation?: Explanation; meta?: ApiMeta; error?: string };

      if (!response.ok || !data.explanation) {
        throw new Error(data.error || "That selection could not be explained.");
      }

      setExplanation(data.explanation);
      setStatus(data.meta?.message || "Explanation ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to explain that selection.");
    } finally {
      setIsExplaining(false);
    }
  }

  async function submitQuiz() {
    if (isDuplicateQuizAttempt) {
      setStatus("This score is already saved. Change an answer to save another attempt.");
      return;
    }

    setQuizSubmitted(true);
    const attempt = {
      lessonId: lesson.id,
      title: lesson.title,
      targetLanguage: lesson.targetLanguage,
      level: lesson.level,
      score: quizScore
    };

    if (!userEmail) {
      const localAttempt: QuizAttempt = {
        ...attempt,
        createdAt: new Date().toISOString()
      };
      const next = [localAttempt, ...attempts].slice(0, 20);
      setAttempts(next);
      writeLocalStorage(attemptsKey, next);
      setLastSavedQuizSignature(quizSignature);
      setStatus(`Workbook checked: ${quizScore}%. Saved to this browser.`);
      return;
    }

    setIsSavingAttempt(true);

    try {
      const response = await fetch("/api/lesson-attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attempt })
      });
      const data = (await response.json()) as { attempt?: QuizAttempt; error?: string };

      if (!response.ok || !data.attempt) {
        throw new Error(data.error || "The quiz attempt could not be saved.");
      }

      const savedAttempt = data.attempt;
      setAttempts((current) => [savedAttempt, ...current].slice(0, 20));
      setLastSavedQuizSignature(quizSignature);
      setStatus(`Workbook checked: ${quizScore}%. Saved to your account.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The quiz attempt could not be saved.");
    } finally {
      setIsSavingAttempt(false);
    }
  }

  async function checkWriting() {
    if (!userEmail) {
      setStatus(loginToGenerateMessage);
      return;
    }

    if (!writingAnswer.trim()) {
      setStatus("Write a short response before asking for feedback.");
      return;
    }

    setIsCheckingWriting(true);
    setStatus("");

    try {
      const response = await fetch("/api/check-workbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetLanguage: lesson.targetLanguage,
          nativeLanguage: lesson.nativeLanguage,
          level: lesson.level,
          prompt: lesson.workbook.writingPrompt.prompt,
          successCriteria: lesson.workbook.writingPrompt.successCriteria,
          answer: writingAnswer
        })
      });
      const data = (await response.json()) as { feedback?: WorkbookFeedback; meta?: ApiMeta; error?: string };

      if (!response.ok || !data.feedback) {
        throw new Error(data.error || "Writing feedback could not be created.");
      }

      setFeedback(data.feedback);
      setStatus(data.meta?.message || "Writing feedback ready.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to check the writing response.");
    } finally {
      setIsCheckingWriting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-ink/10 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-paper">
            <Languages aria-hidden="true" size={23} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-ink">LinguaLab</h1>
            <p className="text-sm text-ink/65">Generate reading practice, explanations, and workbook drills.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          {userEmail ? (
            <Link
              href="/dashboard"
              className="rounded-md border border-ink/10 bg-white/70 px-3 py-2 font-medium text-ink/75 transition hover:border-lagoon/40 hover:text-lagoon"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-ink/10 bg-white/70 px-3 py-2 font-medium text-ink/75 transition hover:border-lagoon/40 hover:text-lagoon"
            >
              Log in
            </Link>
          )}
          <span className="rounded-md border border-ink/10 bg-white/70 px-3 py-2 text-ink/75">
            {meta.mode === "ai" ? `AI mode ${meta.model ? `| ${meta.model}` : ""}` : "Demo mode"}
          </span>
          <span className="rounded-md border border-lagoon/20 bg-lagoon/10 px-3 py-2 text-lagoon">
            Phase 1 build
          </span>
        </div>
      </header>

      <div className="grid flex-1 gap-5 xl:grid-cols-[400px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4">
          <section className="overflow-hidden rounded-lg border border-ink/10 bg-white shadow-soft">
            <div className="editorial-visual flex min-h-[168px] items-end p-5 text-white">
              <div>
                <p className="mb-2 inline-flex rounded-md bg-ink/45 px-2.5 py-1 text-xs font-semibold uppercase tracking-normal">
                  Practice studio
                </p>
                <h2 className="max-w-[18rem] text-2xl font-semibold leading-tight">
                  Build a text that sits exactly at the learner&apos;s edge.
                </h2>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-ink/75">Learning</span>
                  <input
                    className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                    value={request.targetLanguage}
                    onChange={(event) => updateRequest("targetLanguage", event.target.value)}
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-ink/75">Native</span>
                  <input
                    className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                    value={request.nativeLanguage}
                    onChange={(event) => updateRequest("nativeLanguage", event.target.value)}
                  />
                </label>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-ink/75">Level</span>
                  <GraduationCap size={18} className="text-lagoon" aria-hidden="true" />
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {levels.map((level) => (
                    <button
                      key={level}
                      type="button"
                      className={clsx(
                        "h-10 rounded-md border text-sm font-semibold transition",
                        request.level === level
                          ? "border-lagoon bg-lagoon text-white"
                          : "border-ink/10 bg-paper/70 text-ink/70 hover:border-lagoon/40"
                      )}
                      onClick={() => updateRequest("level", level)}
                      onTouchEnd={(event) => activateOnTouch(event, () => updateRequest("level", level))}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium text-ink/75">Format</span>
                <div className="grid grid-cols-2 gap-2">
                  {contentTypes.map((type) => {
                    const Icon = contentIcons[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        className={clsx(
                          "flex h-12 items-center gap-2 rounded-md border px-3 text-left text-sm font-medium transition",
                          request.contentType === type
                            ? "border-coral bg-coral text-white"
                            : "border-ink/10 bg-paper/70 text-ink/75 hover:border-coral/50"
                        )}
                        onClick={() => updateRequest("contentType", type)}
                        onTouchEnd={(event) => activateOnTouch(event, () => updateRequest("contentType", type))}
                      >
                        <Icon size={17} aria-hidden="true" />
                        <span>{contentLabels[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="mt-4 block space-y-1.5 pt-2">
                <span className="text-sm font-medium text-ink/75">Topic or interests</span>
                <textarea
                  className="min-h-[88px] w-full resize-none rounded-md border border-ink/15 bg-paper/60 px-3 py-2 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                  value={request.topic}
                  onChange={(event) => updateRequest("topic", event.target.value)}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-ink/75">Tone</span>
                  <select
                    className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                    value={request.tone}
                    onChange={(event) => updateRequest("tone", event.target.value as LessonRequest["tone"])}
                  >
                    {tones.map((tone) => (
                      <option key={tone} value={tone}>
                        {toneLabels[tone]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-ink/75">Focus</span>
                  <select
                    className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                    value={request.focusArea}
                    onChange={(event) => updateRequest("focusArea", event.target.value as LessonRequest["focusArea"])}
                  >
                    {focusAreas.map((focusArea) => (
                      <option key={focusArea} value={focusArea}>
                        {focusLabels[focusArea]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium text-ink/75">Length</span>
                <div className="grid grid-cols-3 gap-2">
                  {lengths.map((length) => (
                    <button
                      key={length}
                      type="button"
                      className={clsx(
                        "h-10 rounded-md border text-sm font-medium transition",
                        request.length === length
                          ? "border-saffron bg-saffron text-white"
                          : "border-ink/10 bg-paper/70 text-ink/70 hover:border-saffron/50"
                      )}
                      onClick={() => updateRequest("length", length)}
                      onTouchEnd={(event) => activateOnTouch(event, () => updateRequest("length", length))}
                    >
                      {lengthLabels[length]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_150px] xl:grid-cols-1 2xl:grid-cols-[1fr_150px]">
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-ink/75">Regional variant</span>
                  <input
                    className="h-11 w-full rounded-md border border-ink/15 bg-paper/60 px-3 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                    value={request.regionVariant}
                    onChange={(event) => updateRequest("regionVariant", event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-ink/75">Word bank</span>
                  <input
                    className="range-track h-11 w-full accent-lagoon"
                    type="range"
                    min={4}
                    max={14}
                    value={request.includeVocabularyCount}
                    onChange={(event) => updateRequest("includeVocabularyCount", Number(event.target.value))}
                  />
                </label>
              </div>

              <button
                type="button"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 font-semibold text-white transition hover:bg-graphite disabled:cursor-not-allowed disabled:opacity-65"
                onClick={generateLesson}
                onTouchEnd={(event) => {
                  if (!isGenerating && !isTextGenerationLocked) activateOnTouch(event, generateLesson);
                }}
                disabled={isGenerating || isTextGenerationLocked}
              >
                {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
                {isGenerating ? "Generating lesson" : isTextGenerationLocked ? "Log in to generate" : "Generate lesson"}
              </button>
              {status ? <p className="rounded-md bg-paper px-3 py-2 text-sm text-ink/70">{status}</p> : null}
            </div>
          </section>

          <section className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-ink">Progress</h2>
                <p className="text-sm text-ink/60">
                  {userEmail ? "Synced to your account." : "Local to this browser until you log in."}
                </p>
              </div>
              <History size={20} className="text-coral" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <ProgressMetric label="Saved" value={progress.lessonsSaved} />
              <ProgressMetric label="Attempts" value={progress.attempts} />
              <ProgressMetric label="Avg" value={progress.average ? `${progress.average}%` : "-"} />
            </div>
            {savedLessons.length ? (
              <div className="mt-4 space-y-2">
                {savedLessons.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => loadSavedLesson(item)}
                    onTouchEnd={(event) => activateOnTouch(event, () => loadSavedLesson(item))}
                    className="flex w-full items-center justify-between rounded-md border border-ink/10 bg-paper/60 px-3 py-2 text-left text-sm transition hover:border-lagoon/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{item.title}</span>
                      <span className="text-ink/55">
                        {item.targetLanguage} | {item.level}
                      </span>
                    </span>
                    <ChevronRight size={17} className="shrink-0 text-ink/45" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}
            {progress.recentTerms.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {progress.recentTerms.map((term) => (
                  <span key={term} className="rounded-md bg-lagoon/10 px-2.5 py-1 text-xs font-medium text-lagoon">
                    {term}
                  </span>
                ))}
              </div>
            ) : null}
          </section>
        </aside>

        <section className="rounded-lg border border-ink/10 bg-white shadow-soft">
          <div className="flex flex-col gap-4 border-b border-ink/10 p-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-normal">
                <span className="rounded-md bg-lagoon/10 px-2.5 py-1 text-lagoon">{lesson.targetLanguage}</span>
                <span className="rounded-md bg-coral/10 px-2.5 py-1 text-coral">{lesson.level}</span>
                <span className="rounded-md bg-saffron/10 px-2.5 py-1 text-saffron">
                  {contentLabels[lesson.contentType]}
                </span>
              </div>
              <h2 className="max-w-3xl text-3xl font-semibold leading-tight text-ink">{lesson.title}</h2>
              <p className="mt-2 max-w-3xl text-ink/68">{lesson.dek}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-md border border-ink/15 px-3 text-sm font-medium text-ink transition hover:border-lagoon/50 hover:text-lagoon"
                onClick={saveLesson}
                onTouchEnd={(event) => {
                  if (!isSavingLesson) activateOnTouch(event, saveLesson);
                }}
                disabled={isSavingLesson}
              >
                {isSavingLesson ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} aria-hidden="true" />}
                {isSavingLesson ? "Saving" : "Save"}
              </button>
              <button
                type="button"
                className="flex h-10 items-center gap-2 rounded-md bg-lagoon px-3 text-sm font-medium text-white transition hover:bg-[#176b68] disabled:cursor-not-allowed disabled:opacity-65"
                onClick={explainSelection}
                onTouchEnd={(event) => {
                  if (!isExplaining && !isTextGenerationLocked) activateOnTouch(event, explainSelection);
                }}
                disabled={isExplaining || isTextGenerationLocked}
              >
                {isExplaining ? <Loader2 size={16} className="animate-spin" /> : <Lightbulb size={16} />}
                Explain selection
              </button>
            </div>
          </div>

          {explanation ? (
            <div className="border-b border-ink/10 bg-saffron/5 p-5 lg:px-7" aria-live="polite">
              <ExplanationDetails explanation={explanation} selectedText={selectedText} />
            </div>
          ) : null}

          <div className="grid gap-0 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <article className="min-w-0 p-5 lg:p-7">
              <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <LessonStat label="Time" value={`${lesson.estimatedMinutes} min`} />
                <LessonStat label="Targets" value={lesson.cefrSkillTargets.length} />
                <LessonStat label="Workbook" value={`${lesson.workbook.multipleChoice.length + lesson.workbook.fillBlank.length} drills`} />
              </div>

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-lagoon" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-ink">Reading</h3>
                </div>
                <div className="reading-text rounded-lg border border-ink/10 bg-paper/55 p-5 text-[1.05rem] text-ink">
                  {lesson.textSections.map((section) => (
                    <section key={section.heading} className="mb-6 last:mb-0">
                      <h4 className="mb-3 text-base font-semibold text-lagoon">{section.heading}</h4>
                      {section.paragraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </section>
                  ))}
                </div>
              </section>

              <SectionDivider />

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles size={20} className="text-coral" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-ink">Vocabulary</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {lesson.vocabulary.map((item) => (
                    <div key={`${item.term}-${item.translation}`} className="rounded-md border border-ink/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-ink">{item.term}</h4>
                        <span className="rounded-md bg-lagoon/10 px-2 py-1 text-xs font-medium text-lagoon">
                          {item.translation}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink/65">{item.note}</p>
                      <p className="mt-3 rounded-md bg-paper px-3 py-2 text-sm text-ink/80">{item.example}</p>
                    </div>
                  ))}
                </div>
              </section>

              <SectionDivider />

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <Brain size={20} className="text-saffron" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-ink">Grammar</h3>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {lesson.grammarNotes.map((note) => (
                    <div key={note.title} className="rounded-md border border-ink/10 bg-paper/55 p-4">
                      <h4 className="font-semibold text-ink">{note.title}</h4>
                      <p className="mt-2 text-sm text-ink/68">{note.explanation}</p>
                      <p className="mt-3 text-sm font-medium text-lagoon">{note.example}</p>
                    </div>
                  ))}
                </div>
              </section>

              <SectionDivider />

              <section>
                <div className="mb-4 flex items-center gap-2">
                  <PenLine size={20} className="text-lagoon" aria-hidden="true" />
                  <h3 className="text-xl font-semibold text-ink">Workbook</h3>
                </div>
                <div className="space-y-5">
                  <div className="space-y-4">
                    {lesson.workbook.multipleChoice.map((question, index) => (
                      <div key={question.id} className="rounded-md border border-ink/10 bg-white p-4">
                        <p className="font-medium text-ink">
                          {index + 1}. {question.prompt}
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {question.options.map((option, optionIndex) => {
                            const selected = mcAnswers[question.id] === optionIndex;
                            const correct = quizSubmitted && question.correctIndex === optionIndex;
                            const wrong = quizSubmitted && selected && !correct;

                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() =>
                                  setMcAnswers((current) => ({
                                    ...current,
                                    [question.id]: optionIndex
                                  }))
                                }
                                onTouchEnd={(event) =>
                                  activateOnTouch(event, () =>
                                    setMcAnswers((current) => ({
                                      ...current,
                                      [question.id]: optionIndex
                                    }))
                                  )
                                }
                                className={clsx(
                                  "min-h-11 rounded-md border px-3 py-2 text-left text-sm transition",
                                  correct && "border-lagoon bg-lagoon/10 text-lagoon",
                                  wrong && "border-coral bg-coral/10 text-coral",
                                  !correct &&
                                    !wrong &&
                                    selected &&
                                    "border-saffron bg-saffron/10 text-ink",
                                  !correct &&
                                    !wrong &&
                                    !selected &&
                                    "border-ink/10 bg-paper/65 text-ink/75 hover:border-lagoon/40"
                                )}
                              >
                                {option}
                              </button>
                            );
                          })}
                        </div>
                        {quizSubmitted ? <p className="mt-3 text-sm text-ink/65">{question.explanation}</p> : null}
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {lesson.workbook.fillBlank.map((question) => {
                      const submittedAnswer = fillAnswers[question.id] || "";
                      const isCorrect = normalizeAnswer(submittedAnswer) === normalizeAnswer(question.answer);

                      return (
                        <label key={question.id} className="rounded-md border border-ink/10 bg-paper/55 p-4">
                          <span className="block font-medium text-ink">{question.prompt}</span>
                          <input
                            className={clsx(
                              "mt-3 h-11 w-full rounded-md border bg-white px-3 outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20",
                              quizSubmitted && isCorrect && "border-lagoon",
                              quizSubmitted && !isCorrect && "border-coral",
                              !quizSubmitted && "border-ink/15"
                            )}
                            value={submittedAnswer}
                            onChange={(event) =>
                              setFillAnswers((current) => ({
                                ...current,
                                [question.id]: event.target.value
                              }))
                            }
                          />
                          {quizSubmitted ? (
                            <p className="mt-2 text-sm text-ink/65">
                              Answer: <span className="font-semibold text-ink">{question.answer}</span>.{" "}
                              {question.explanation}
                            </p>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-3 rounded-md border border-ink/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-ink">Quiz score</p>
                      <p className="text-sm text-ink/60">
                        {quizSubmitted
                          ? isDuplicateQuizAttempt
                            ? userEmail
                              ? `${quizScore}% saved to your account.`
                              : `${quizScore}% saved to this browser.`
                            : "Answers changed. Check again to save a new score."
                          : "Complete the questions, then check your work."}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-graphite disabled:cursor-not-allowed disabled:opacity-65"
                      onClick={submitQuiz}
                      onTouchEnd={(event) => {
                        if (!isSavingAttempt && !isDuplicateQuizAttempt) activateOnTouch(event, submitQuiz);
                      }}
                      disabled={isSavingAttempt || isDuplicateQuizAttempt}
                    >
                      {isSavingAttempt ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                      {isSavingAttempt ? "Saving score" : isDuplicateQuizAttempt ? "Score saved" : quizSubmitted ? "Save new score" : "Check workbook"}
                    </button>
                  </div>

                  <div className="rounded-md border border-ink/10 bg-paper/55 p-4">
                    <h4 className="font-semibold text-ink">Writing practice</h4>
                    <p className="mt-2 text-ink/70">{lesson.workbook.writingPrompt.prompt}</p>
                    <ul className="mt-3 space-y-1 text-sm text-ink/60">
                      {lesson.workbook.writingPrompt.successCriteria.map((criterion) => (
                        <li key={criterion}>- {criterion}</li>
                      ))}
                    </ul>
                    <textarea
                      className="mt-4 min-h-[120px] w-full resize-none rounded-md border border-ink/15 bg-white px-3 py-2 text-ink outline-none transition focus:border-lagoon focus:ring-2 focus:ring-lagoon/20"
                      value={writingAnswer}
                      onChange={(event) => setWritingAnswer(event.target.value)}
                      placeholder={`Write in ${lesson.targetLanguage}`}
                    />
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        className="flex h-10 items-center justify-center gap-2 rounded-md bg-lagoon px-4 text-sm font-semibold text-white transition hover:bg-[#176b68] disabled:cursor-not-allowed disabled:opacity-65"
                        onClick={checkWriting}
                        onTouchEnd={(event) => {
                          if (!isCheckingWriting && !isTextGenerationLocked) activateOnTouch(event, checkWriting);
                        }}
                        disabled={isCheckingWriting || isTextGenerationLocked}
                      >
                        {isCheckingWriting ? <Loader2 size={16} className="animate-spin" /> : <MessageSquareText size={16} />}
                        {isTextGenerationLocked ? "Log in for feedback" : "Get feedback"}
                      </button>
                      {feedback ? <span className="text-sm font-semibold text-lagoon">{feedback.score}/100</span> : null}
                    </div>
                    {feedback ? (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <FeedbackBlock title="Strengths" items={feedback.strengths} />
                        <FeedbackBlock title="Corrections" items={feedback.corrections} />
                        <div className="rounded-md bg-white p-3 text-sm text-ink/70">
                          <p className="mb-1 font-semibold text-ink">Next step</p>
                          {feedback.nextStep}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </section>
            </article>

            <aside className="border-t border-ink/10 bg-paper/40 p-5 2xl:border-l 2xl:border-t-0">
              <div className="sticky top-5 space-y-4">
                <div className="rounded-md border border-ink/10 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Lightbulb size={18} className="text-saffron" aria-hidden="true" />
                    <h3 className="font-semibold text-ink">Tutor Notes</h3>
                  </div>
                  {explanation ? (
                    <ExplanationDetails explanation={explanation} selectedText={selectedText} compact />
                  ) : (
                    <p className="text-sm text-ink/62">
                      Select text in the reading, then use the explanation button to get a native-language breakdown.
                    </p>
                  )}
                </div>

                <div className="rounded-md border border-ink/10 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles size={18} className="text-lagoon" aria-hidden="true" />
                    <h3 className="font-semibold text-ink">Skill Targets</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-ink/68">
                    {lesson.cefrSkillTargets.map((target) => (
                      <li key={target} className="flex gap-2">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-lagoon" aria-hidden="true" />
                        <span>{target}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-md border border-ink/10 bg-white p-4">
                  <h3 className="font-semibold text-ink">Cultural Note</h3>
                  <p className="mt-2 text-sm text-ink/65">{lesson.culturalNote}</p>
                </div>

                <div className="rounded-md border border-ink/10 bg-white p-4">
                  <h3 className="font-semibold text-ink">Retention Plan</h3>
                  <ol className="mt-3 space-y-2 text-sm text-ink/68">
                    {lesson.retentionPlan.map((step, index) => (
                      <li key={step} className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-coral/10 text-xs font-semibold text-coral">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProgressMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-paper p-3">
      <p className="text-lg font-semibold text-ink">{value}</p>
      <p className="text-xs font-medium uppercase tracking-normal text-ink/50">{label}</p>
    </div>
  );
}

function LessonStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-ink/10 bg-white p-3">
      <p className="text-sm font-medium text-ink/55">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}

function SectionDivider() {
  return <div className="my-8 h-px w-full bg-ink/10" />;
}

function TutorNote({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-normal text-ink/45">{label}</p>
      <p className="text-ink/72">{value}</p>
    </div>
  );
}

function ExplanationDetails({
  explanation,
  selectedText,
  compact = false
}: {
  explanation: Explanation;
  selectedText: string;
  compact?: boolean;
}) {
  return (
    <div className={clsx("space-y-3 text-sm", !compact && "max-w-4xl")}>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-normal text-saffron">Explanation</p>
        <p className="rounded-md bg-white px-3 py-2 font-medium text-ink shadow-sm">{selectedText}</p>
      </div>
      <div className={clsx("grid gap-3", !compact && "md:grid-cols-2")}>
        <TutorNote label="Translation" value={explanation.translation} />
        <TutorNote label="Meaning" value={explanation.plainExplanation} />
        <TutorNote label="Grammar" value={explanation.grammar} />
        <TutorNote label="Usage" value={explanation.usageTip} />
      </div>
      <div className="rounded-md bg-white px-3 py-2 shadow-sm">
        <TutorNote label="Practice" value={explanation.microPractice} />
      </div>
    </div>
  );
}

function FeedbackBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md bg-white p-3 text-sm text-ink/70">
      <p className="mb-2 font-semibold text-ink">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
